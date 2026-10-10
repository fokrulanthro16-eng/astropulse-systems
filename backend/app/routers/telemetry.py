"""Telemetry Router for AstroPulse Systems (Level 2).

Exposes high-frequency WebSocket biometrics streaming, Edge ML telemetry,
and Blackbox Mission Telemetry Downlink export endpoints (.JSON / .CSV).
"""

import asyncio
import csv
import io
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Response

from app.models.telemetry import (
    TelemetryPacket, 
    CrewMember, 
    IngestTelemetryRequest, 
    IngestTelemetryResponse
)
from app.services.biometric_engine import biometric_engine

logger = logging.getLogger("astropulse.telemetry")
router = APIRouter(tags=["Telemetry"])


@router.post("/api/vitals/ingest", response_model=IngestTelemetryResponse)
async def ingest_vitals_telemetry(payload: IngestTelemetryRequest):
    """
    Ingest real-time physical biometric telemetry from external IoT hardware / wearables.
    Directly pipe readings into live simulation engine and active WebSocket streams.
    """
    updated_packet = biometric_engine.ingest_hardware_telemetry(payload)
    now_iso = datetime.now(timezone.utc).isoformat()
    return IngestTelemetryResponse(
        status="INGESTED_ACTIVE",
        message=f"Live biometrics for {payload.astronaut_id} successfully mapped to hardware stream {payload.device_id or 'BIO-HARNESS-BTLE-01'}",
        astronaut_id=payload.astronaut_id,
        ingested_at=now_iso,
        hardware_device_id=payload.device_id or "BIO-HARNESS-BTLE-01",
        packet_snapshot=updated_packet
    )


@router.get("/api/crew", response_model=list[CrewMember])
async def get_crew():
    """Retrieve full crew manifest with baseline medical profiles."""
    return biometric_engine.get_crew_list()


@router.get("/api/telemetry/snapshot", response_model=TelemetryPacket)
async def get_telemetry_snapshot(astronaut_id: str = Query(default="CDR-01", description="Astronaut ID")):
    """Fetch current single-frame telemetry snapshot with Edge ML classification."""
    if astronaut_id not in biometric_engine.crew:
        astronaut_id = "CDR-01"
    return biometric_engine.generate_packet(astronaut_id)


@router.get("/api/telemetry/history")
async def get_telemetry_history(
    astronaut_id: str = Query(default="CDR-01"),
    limit: int = Query(default=600, ge=10, le=3600)
):
    """Retrieve rolling Blackbox historical buffer for specified astronaut."""
    history = biometric_engine.get_blackbox_history(astronaut_id, limit=limit)
    return {
        "astronaut_id": astronaut_id,
        "sample_count": len(history),
        "history": history
    }


@router.get("/api/telemetry/export")
async def export_mission_telemetry_downlink(
    astronaut_id: str = Query(default="CDR-01"),
    format: str = Query(default="json", regex="^(json|csv)$")
):
    """
    Export Blackbox Mission Telemetry Downlink file for deferred Ground Control sync.
    Supports .JSON and .CSV downloads.
    """
    records = biometric_engine.get_blackbox_history(astronaut_id, limit=3600)
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"AstroPulse_Blackbox_{astronaut_id}_{now_str}.{format}"

    if format == "csv":
        output = io.StringIO()
        if records:
            # Build union of all keys across records in order
            fieldnames = []
            for r in records:
                for k in r.keys():
                    if k not in fieldnames:
                        fieldnames.append(k)
            writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for row in records:
                writer.writerow(row)
        else:
            writer = csv.writer(output)
            writer.writerow(["timestamp", "astronaut_id", "status"])

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        payload = {
            "mission": "NASA Space Apps Challenge 2026 - AstroPulse Systems",
            "export_timestamp": datetime.now(timezone.utc).isoformat(),
            "astronaut_id": astronaut_id,
            "record_count": len(records),
            "telemetry_log": records
        }
        json_content = json.dumps(payload, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )


@router.websocket("/ws/telemetry")
async def websocket_telemetry_stream(
    websocket: WebSocket,
    astronaut_id: Optional[str] = Query(default="CDR-01")
):
    """
    WebSocket endpoint streaming live 1Hz astronaut vitals, Edge ML confidence,
    and anomaly detection frames.
    """
    await websocket.accept()
    active_astro_id = astronaut_id if astronaut_id in biometric_engine.crew else "CDR-01"
    logger.info(f"WebSocket client connected. Active astronaut: {active_astro_id}")

    async def listen_for_commands():
        nonlocal active_astro_id
        try:
            while True:
                data_text = await websocket.receive_text()
                try:
                    payload = json.loads(data_text)
                    if payload.get("command") == "select_astronaut":
                        new_id = payload.get("astronaut_id")
                        if new_id in biometric_engine.crew:
                            active_astro_id = new_id
                            logger.info(f"Client switched active telemetry to: {active_astro_id}")
                except Exception as e:
                    logger.warning(f"Error parsing client command: {e}")
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass

    listener_task = asyncio.create_task(listen_for_commands())

    try:
        while True:
            # Generate primary packet with Level 2 Edge ML
            primary_packet = biometric_engine.generate_packet(active_astro_id)

            # Generate lightweight status overview for all crew members
            crew_overview = []
            for c_id, profile in biometric_engine.crew.items():
                p = biometric_engine.generate_packet(c_id)
                crew_overview.append({
                    "id": c_id,
                    "name": profile["name"],
                    "callsign": profile["callsign"],
                    "role": profile["role"],
                    "heart_rate": p.vitals.heart_rate,
                    "spo2": p.vitals.spo2,
                    "overall_status": p.overall_status.value,
                    "ml_confidence_pct": p.ml_confidence_pct,
                    "primary_contributing_vector": p.primary_contributing_vector,
                    "anomaly_count": len(p.anomalies)
                })

            envelope = {
                "type": "TELEMETRY_UPDATE",
                "active_astronaut": primary_packet.model_dump(),
                "crew_overview": crew_overview,
                "server_time": primary_packet.timestamp
            }

            await websocket.send_text(json.dumps(envelope))
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for {active_astro_id}")
    except Exception as e:
        logger.error(f"WebSocket telemetry streaming error: {e}")
    finally:
        listener_task.cancel()
