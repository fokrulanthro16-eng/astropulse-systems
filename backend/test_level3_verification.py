"""Automated Level-3 Mission-Grade Verification Test Suite."""

import asyncio
import json
import urllib.request
import websockets
import time

BACKEND_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/telemetry"


def test_level3_features():
    print("==================================================================")
    print(" AstroPulse Systems - Level 3 Mission-Grade Verification Suite")
    print("==================================================================")

    # 1. Test distinct crew baselines
    print("\n[1] Verifying Distinct Astronaut-Specific Baselines & Personalized Thresholds...")
    req = urllib.request.Request(f"{BACKEND_URL}/api/crew")
    with urllib.request.urlopen(req, timeout=5) as res:
        crew = json.loads(res.read().decode())
        crew_map = {c["id"]: c for c in crew}
        
        sarah = crew_map["CDR-01"]
        print(f"    - CDR Sarah Vance: HR Baseline = {sarah['baseline']['heart_rate']} bpm (Expected: 62), HRV = {sarah['baseline']['hrv_rmssd']} ms (Expected: 65)")
        assert sarah["baseline"]["heart_rate"] == 62.0
        assert sarah["baseline"]["hrv_rmssd"] == 65.0

        chen = crew_map["MS-02"]
        print(f"    - MS Mark Chen: HR Baseline = {chen['baseline']['heart_rate']} bpm (Expected: 54 Athletic), HRV = {chen['baseline']['hrv_rmssd']} ms (Expected: 72)")
        assert chen["baseline"]["heart_rate"] == 54.0
        assert chen["baseline"]["hrv_rmssd"] == 72.0
        assert "Aerobic Athletic Tolerant" in chen["personalized_thresholds"]["profile_type"]

        elena = crew_map["FE-03"]
        print(f"    - FE Elena Rostova: HR Baseline = {elena['baseline']['heart_rate']} bpm (Expected: 68), HRV = {elena['baseline']['hrv_rmssd']} ms (Expected: 58)")
        assert elena["baseline"]["heart_rate"] == 68.0
        assert elena["baseline"]["hrv_rmssd"] == 58.0

    # 2. Test External IoT Hardware Wearable Ingestion API
    print("\n[2] Testing External IoT Hardware Wearable Ingestion API (POST /api/vitals/ingest)...")
    ingest_payload = {
        "astronaut_id": "CDR-01",
        "heart_rate": 74.2,
        "spo2": 99.1,
        "hrv_rmssd": 63.8,
        "core_temp": 36.88,
        "respiration_rate": 14.2,
        "device_id": "BIO-HARNESS-BTLE-PRO-09"
    }
    req = urllib.request.Request(
        f"{BACKEND_URL}/api/vitals/ingest",
        data=json.dumps(ingest_payload).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        ingest_res = json.loads(res.read().decode())
        print("    Ingest Status:", ingest_res["status"])
        print("    Message:", ingest_res["message"])
        assert ingest_res["status"] == "INGESTED_ACTIVE"
        assert ingest_res["hardware_device_id"] == "BIO-HARNESS-BTLE-PRO-09"

    # Verify snapshot reflects hardware sensor linked
    req = urllib.request.Request(f"{BACKEND_URL}/api/telemetry/snapshot?astronaut_id=CDR-01")
    with urllib.request.urlopen(req, timeout=5) as res:
        snap = json.loads(res.read().decode())
        print(f"    Snapshot Hardware Linked: {snap.get('hardware_sensor_linked')}, Device: {snap.get('hardware_device_id')}")
        assert snap.get("hardware_sensor_linked") is True
        assert snap.get("hardware_device_id") == "BIO-HARNESS-BTLE-PRO-09"

    # 3. Test Dynamic Closed-Loop Clinical Recovery Trajectory (15s)
    print("\n[3] Testing Dynamic Closed-Loop Clinical Recovery Trajectory (POST /api/simulate/recover)...")
    # First inject crisis
    req_crisis = urllib.request.Request(
        f"{BACKEND_URL}/api/simulate/crisis",
        data=json.dumps({"mode": "HYPOXIA_CRITICAL"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    urllib.request.urlopen(req_crisis, timeout=5)
    print("    Crisis injected: HYPOXIA_CRITICAL")

    # Now engage closed-loop recovery
    req_rec = urllib.request.Request(
        f"{BACKEND_URL}/api/simulate/recover",
        data=b"",
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_rec, timeout=5) as res:
        rec_status = json.loads(res.read().decode())
        print("    Recovery Engaged:", rec_status["mode_display_name"])
        print("    Clinical Recovery Active:", rec_status["clinical_recovery_active"])
        print("    Seconds Remaining:", rec_status["clinical_recovery_seconds_remaining"])
        assert rec_status["clinical_recovery_active"] is True
        assert rec_status["clinical_recovery_seconds_remaining"] > 0

    # Reset back to nominal
    urllib.request.urlopen(urllib.request.Request(f"{BACKEND_URL}/api/simulate/reset", data=b""))
    print("    Simulation reset back to NOMINAL.")

    # 4. Test Frontend Server Responsiveness
    print("\n[4] Verifying Frontend Server on http://127.0.0.1:3000 ...")
    f_code = urllib.request.urlopen("http://127.0.0.1:3000", timeout=5).status
    print("    Frontend HTTP Status Code:", f_code)
    assert f_code == 200


async def test_level3_websocket():
    print("\n[5] Testing WebSocket Live Telemetry Envelope for Level-3 Fields...")
    async with websockets.connect(WS_URL) as ws:
        msg = await ws.recv()
        envelope = json.loads(msg)
        active = envelope["active_astronaut"]
        print(f"    WebSocket Stream Active: {active['astronaut_name']}")
        print(f"    Personalized Profile: {active.get('personalized_thresholds', {}).get('profile_type')}")
        print(f"    Edge ML Confidence: {active.get('ml_confidence_pct')}%")
        print(f"    Hardware Linked Flag: {active.get('hardware_sensor_linked')}")
        assert "personalized_thresholds" in active
        assert "hardware_sensor_linked" in active
        print("    WebSocket frame validated successfully.")


async def main():
    test_level3_features()
    await test_level3_websocket()
    print("\n==================================================================")
    print(" >>> ALL LEVEL 3 ENTERPRISE MISSION-GRADE TESTS PASSED! <<<")
    print("==================================================================")


if __name__ == "__main__":
    asyncio.run(main())
