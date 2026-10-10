"""Level 2 Verification test script for AstroPulse Systems Backend."""

import asyncio
import json
import urllib.request
import websockets

BACKEND_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/telemetry"


def test_http_endpoints():
    print("[1] Testing /api/health ...")
    req = urllib.request.Request(f"{BACKEND_URL}/api/health")
    with urllib.request.urlopen(req, timeout=5) as res:
        data = json.loads(res.read().decode())
        print("    Health Response:", data)
        assert data["status"] == "HEALTHY"

    print("[2] Testing /api/crew ...")
    req = urllib.request.Request(f"{BACKEND_URL}/api/crew")
    with urllib.request.urlopen(req, timeout=5) as res:
        crew = json.loads(res.read().decode())
        print(f"    Loaded {len(crew)} crew members: {[c['name'] for c in crew]}")
        assert len(crew) >= 3

    print("[3] Testing /api/telemetry/snapshot with Level 2 Edge ML ...")
    req = urllib.request.Request(f"{BACKEND_URL}/api/telemetry/snapshot?astronaut_id=CDR-01")
    with urllib.request.urlopen(req, timeout=5) as res:
        packet = json.loads(res.read().decode())
        print(f"    Snapshot CDR-01: HR={packet['vitals']['heart_rate']} SpO2={packet['vitals']['spo2']} Status={packet['overall_status']}")
        print(f"    Edge ML Confidence: {packet['ml_confidence_pct']}% | Primary Driver: {packet['primary_contributing_vector']}")
        assert "ml_confidence_pct" in packet
        assert "primary_contributing_vector" in packet

    print("[4] Testing Blackbox Telemetry Downlink Exports (.JSON & .CSV) ...")
    req_json = urllib.request.Request(f"{BACKEND_URL}/api/telemetry/export?format=json&astronaut_id=CDR-01")
    with urllib.request.urlopen(req_json, timeout=5) as res:
        j_data = json.loads(res.read().decode())
        print(f"    Export JSON: {j_data['record_count']} records loaded.")
        assert j_data["record_count"] > 0

    req_csv = urllib.request.Request(f"{BACKEND_URL}/api/telemetry/export?format=csv&astronaut_id=CDR-01")
    with urllib.request.urlopen(req_csv, timeout=5) as res:
        c_raw = res.read().decode()
        header = c_raw.splitlines()[0]
        print(f"    Export CSV: {len(c_raw)} bytes. Header: {header[:80]}...")
        assert "heart_rate" in header and "spo2" in header

    print("[5] Testing POST /api/simulate/crisis (HYPOXIA_CRITICAL) ...")
    payload = json.dumps({"mode": "HYPOXIA_CRITICAL"}).encode()
    req = urllib.request.Request(
        f"{BACKEND_URL}/api/simulate/crisis",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        status_data = json.loads(res.read().decode())
        print("    Simulation Status:", status_data["mode_display_name"])
        assert status_data["is_crisis_active"] is True

    print("[6] Resetting simulation back to NORMAL ...")
    payload = json.dumps({"mode": "NORMAL"}).encode()
    req = urllib.request.Request(
        f"{BACKEND_URL}/api/simulate/crisis",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        status_data = json.loads(res.read().decode())
        assert status_data["is_crisis_active"] is False
        print("    Reset successfully:", status_data["mode_display_name"])


async def test_websocket():
    print("[7] Testing WebSocket live streaming with Level 2 Edge ML ...")
    async with websockets.connect(WS_URL) as ws:
        msg = await ws.recv()
        envelope = json.loads(msg)
        active = envelope["active_astronaut"]
        print("    Received WebSocket Envelope:")
        print(f"    Active Astro: {active['astronaut_name']} ({active['astronaut_id']})")
        print(f"    Vitals: HR={active['vitals']['heart_rate']}, SpO2={active['vitals']['spo2']}%")
        print(f"    Edge ML Confidence: {active.get('ml_confidence_pct')}%")
        print(f"    Primary Vector: {active.get('primary_contributing_vector')}")
        print(f"    Crew Overview Count: {len(envelope['crew_overview'])}")
        assert envelope["type"] == "TELEMETRY_UPDATE"
        assert len(envelope["crew_overview"]) >= 3


async def main():
    test_http_endpoints()
    await test_websocket()
    print("\n>>> ALL LEVEL 2 AEROSPACE CLINICAL FEATURES VERIFIED SUCCESSFULLY! <<<")


if __name__ == "__main__":
    asyncio.run(main())
