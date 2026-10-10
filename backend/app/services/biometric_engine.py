"""Synthetic Biometric Engine for AstroPulse Systems (Level 3 Mission-Grade).

Includes:
1. Dynamic 15-second closed-loop clinical recovery trajectory
2. Astronaut-specific baseline hemodynamics and personalized thresholds
3. Real-time external IoT / wearable hardware sensor ingestion pipeline
4. 1-hour rolling Blackbox buffer
"""

from collections import deque
import math
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

from app.config import CREW_MEMBERS
from app.models.telemetry import (
    AstronautVitals,
    AnomalySeverity,
    SimulationMode,
    TelemetryPacket,
    CrewMember,
    IngestTelemetryRequest
)
from app.services.anomaly_detector import anomaly_detector


class BiometricEngine:
    RECOVERY_DURATION_SECONDS = 15.0

    def __init__(self):
        self.crew: Dict[str, Dict] = {m["id"]: m for m in CREW_MEMBERS}
        self.simulation_mode: SimulationMode = SimulationMode.NORMAL
        self.crisis_start_time: Optional[float] = None
        self.recovery_start_time: Optional[float] = None
        self.mission_start_epoch: float = time.time() - (42 * 86400 + 14 * 3600 + 28 * 60)
        self.tick_counter: int = 0

        # Hardware wearable ingestion tracking
        self.hardware_sensor_last_seen: Dict[str, float] = {}
        self.hardware_device_ids: Dict[str, str] = {}

        # Pre-recovery snapshot storage for smooth closed-loop interpolation
        self.pre_recovery_snapshots: Dict[str, Dict[str, float]] = {}

        # State storage per astronaut
        self.crew_state: Dict[str, Dict[str, float]] = {}
        self.blackbox_buffers: Dict[str, deque] = {}

        for c_id, profile in self.crew.items():
            base = profile["baseline"]
            self.crew_state[c_id] = {
                "heart_rate": base["heart_rate"],
                "hrv_rmssd": base["hrv_rmssd"],
                "spo2": base["spo2"],
                "core_temp": base["core_temp"],
                "cabin_co2": 530.0,
                "respiration_rate": base["respiration_rate"],
                "systolic_bp": base["systolic_bp"],
                "diastolic_bp": base["diastolic_bp"],
                "perfusion_index": 4.2,
                "suit_pressure_psi": 4.30,
                "radiation_rate_usvh": 21.4,
            }
            self.blackbox_buffers[c_id] = deque(maxlen=3600)

        self.custom_overrides: Dict[str, Optional[float]] = {
            "cabin_co2": None,
            "spo2": None,
            "heart_rate": None,
        }

        self._preseed_blackbox_buffers()

    def _preseed_blackbox_buffers(self):
        now = datetime.now(timezone.utc)
        for c_id in self.crew.keys():
            base_hr = self.crew[c_id]["baseline"]["heart_rate"]
            base_spo2 = self.crew[c_id]["baseline"]["spo2"]
            base_hrv = self.crew[c_id]["baseline"]["hrv_rmssd"]
            for i in range(600, 0, -5):
                ts = (now - timedelta(seconds=i)).isoformat()
                record = {
                    "timestamp": ts,
                    "astronaut_id": c_id,
                    "astronaut_name": self.crew[c_id]["name"],
                    "heart_rate": round(base_hr + 1.5 * math.sin(i * 0.1) + random.uniform(-0.5, 0.5), 1),
                    "spo2": round(base_spo2 + random.uniform(-0.2, 0.2), 1),
                    "hrv_rmssd": round(base_hrv + random.uniform(-1.5, 1.5), 1),
                    "core_temp": 36.9,
                    "cabin_co2": round(530.0 + random.uniform(-10, 10), 1),
                    "respiration_rate": 13.5,
                    "systolic_bp": 115.0,
                    "diastolic_bp": 75.0,
                    "overall_status": "NOMINAL",
                    "ml_confidence_pct": 7.8,
                    "primary_contributing_vector": "Nominal Homeostasis"
                }
                self.blackbox_buffers[c_id].append(record)

    def set_simulation_mode(
        self,
        mode: SimulationMode,
        custom_co2: Optional[float] = None,
        custom_spo2: Optional[float] = None,
        custom_hr: Optional[float] = None
    ):
        self.simulation_mode = mode
        if mode != SimulationMode.NORMAL and mode != SimulationMode.RECOVERY:
            self.crisis_start_time = time.time()
            self.recovery_start_time = None
        elif mode == SimulationMode.NORMAL:
            self.crisis_start_time = None
            self.recovery_start_time = None

        self.custom_overrides["cabin_co2"] = custom_co2
        self.custom_overrides["spo2"] = custom_spo2
        self.custom_overrides["heart_rate"] = custom_hr

    def trigger_closed_loop_recovery(self):
        """Engage automatic 15-second closed-loop clinical recovery trajectory."""
        self.simulation_mode = SimulationMode.RECOVERY
        self.recovery_start_time = time.time()
        # Snapshot current crisis state as starting point for smooth S-curve interpolation
        for c_id, state in self.crew_state.items():
            self.pre_recovery_snapshots[c_id] = dict(state)

    def ingest_hardware_telemetry(self, req: IngestTelemetryRequest) -> TelemetryPacket:
        """Pipe external physical IoT wearable data directly into the active engine."""
        astro_id = req.astronaut_id if req.astronaut_id in self.crew else "CDR-01"
        state = self.crew_state[astro_id]

        state["heart_rate"] = req.heart_rate
        state["spo2"] = req.spo2
        state["hrv_rmssd"] = req.hrv_rmssd
        state["core_temp"] = req.core_temp
        if req.respiration_rate is not None:
            state["respiration_rate"] = req.respiration_rate
        if req.cabin_co2 is not None:
            state["cabin_co2"] = req.cabin_co2

        self.hardware_sensor_last_seen[astro_id] = time.time()
        self.hardware_device_ids[astro_id] = req.device_id or "BIO-HARNESS-BTLE-01"

        return self.generate_packet(astro_id)

    def get_simulation_status(self) -> Dict:
        is_crisis = self.simulation_mode not in (SimulationMode.NORMAL, SimulationMode.RECOVERY)
        is_recovering = self.simulation_mode == SimulationMode.RECOVERY

        elapsed = 0
        if is_crisis and self.crisis_start_time:
            elapsed = int(time.time() - self.crisis_start_time)

        recovery_remaining = 0
        if is_recovering and self.recovery_start_time:
            elapsed_rec = time.time() - self.recovery_start_time
            recovery_remaining = max(0, int(self.RECOVERY_DURATION_SECONDS - elapsed_rec))

        mode_names = {
            SimulationMode.NORMAL: "Nominal Flight Operations",
            SimulationMode.HYPOXIA_CRITICAL: "Critical Hypoxia / O2 Loop Depletion",
            SimulationMode.HYPERCAPNIA_CRISIS: "Hypercapnia / ECLSS Scrubber Failure",
            SimulationMode.CARDIAC_DECONDITIONING: "Microgravity Cardiac Deconditioning",
            SimulationMode.RAPID_DECOMPRESSION: "Rapid Cabin / Suit Decompression",
            SimulationMode.RECOVERY: "Closed-Loop Clinical Recovery Trajectory (15s)",
        }

        descriptions = {
            SimulationMode.NORMAL: "All ECLSS subsystems within nominal operating parameters. Astronaut vitals stable.",
            SimulationMode.HYPOXIA_CRITICAL: "O2 delivery failure causing capillary arterial desaturation (<85%) and compensatory tachycardia (>125 bpm).",
            SimulationMode.HYPERCAPNIA_CRISIS: "ECLSS CDRA scrubber malfunction leading to acute CO2 accumulation (>3,800 ppm) and hyperventilation.",
            SimulationMode.CARDIAC_DECONDITIONING: "Severe loss of parasympathetic cardiac tone; HRV RMSSD collapsed with persistent resting tachycardia.",
            SimulationMode.RAPID_DECOMPRESSION: "Catastrophic breach in suit integrity; pressure drop and rapid hypoxia cascade.",
            SimulationMode.RECOVERY: "Automated closed-loop physiological stabilization in progress. Countermeasures successfully active.",
        }

        return {
            "current_mode": self.simulation_mode.value,
            "mode_display_name": mode_names.get(self.simulation_mode, "Unknown"),
            "is_crisis_active": is_crisis,
            "crisis_start_time": (
                datetime.fromtimestamp(self.crisis_start_time, tz=timezone.utc).isoformat()
                if self.crisis_start_time else None
            ),
            "elapsed_crisis_seconds": elapsed,
            "active_crew_affected": list(self.crew.keys()),
            "description": descriptions.get(self.simulation_mode, ""),
            "clinical_recovery_active": is_recovering,
            "clinical_recovery_seconds_remaining": recovery_remaining,
        }

    def _format_met(self) -> str:
        total_seconds = int(time.time() - self.mission_start_epoch)
        days = total_seconds // 86400
        rem = total_seconds % 86400
        hours = rem // 3600
        rem = rem % 3600
        mins = rem // 60
        secs = rem % 60
        return f"MET {days:03d}:{hours:02d}:{mins:02d}:{secs:02d}"

    def generate_next_vitals(self, astro_id: str) -> AstronautVitals:
        self.tick_counter += 1
        t = self.tick_counter
        state = self.crew_state[astro_id]
        profile = self.crew[astro_id]
        baseline = profile["baseline"]

        # Check if hardware wearable is currently active (within last 12 seconds)
        last_hw_time = self.hardware_sensor_last_seen.get(astro_id, 0)
        is_hardware_active = (time.time() - last_hw_time) < 12.0

        if is_hardware_active:
            # Let hardware readings drive state with slight physiological noise
            state["heart_rate"] += (random.random() - 0.5) * 0.4
            state["spo2"] = min(100.0, max(80.0, state["spo2"] + (random.random() - 0.5) * 0.1))
            return AstronautVitals(
                heart_rate=round(state["heart_rate"], 1),
                hrv_rmssd=round(state["hrv_rmssd"], 1),
                spo2=round(state["spo2"], 1),
                core_temp=round(state["core_temp"], 2),
                cabin_co2=round(state["cabin_co2"], 1),
                respiration_rate=round(state["respiration_rate"], 1),
                systolic_bp=round(state["systolic_bp"], 1),
                diastolic_bp=round(state["diastolic_bp"], 1),
                perfusion_index=round(state["perfusion_index"], 2),
                suit_pressure_psi=round(state["suit_pressure_psi"], 2),
                radiation_rate_usvh=round(21.4 + 1.2 * math.sin(t * 0.1), 2),
            )

        # Handle Closed-Loop Clinical Recovery Trajectory (15 Seconds)
        if self.simulation_mode == SimulationMode.RECOVERY and self.recovery_start_time:
            elapsed = time.time() - self.recovery_start_time
            progress = min(1.0, elapsed / self.RECOVERY_DURATION_SECONDS)
            # Smooth cubic easing
            ease = 3 * (progress ** 2) - 2 * (progress ** 3)

            start = self.pre_recovery_snapshots.get(astro_id, dict(state))

            # Smooth trajectory targets: SpO2 -> 98.6%, HR -> Baseline, Resp -> 14 br/min
            target_hr = baseline["heart_rate"]
            target_spo2 = 98.6
            target_hrv = baseline["hrv_rmssd"]
            target_co2 = 530.0
            target_resp = 14.0

            state["heart_rate"] = start["heart_rate"] + (target_hr - start["heart_rate"]) * ease
            state["spo2"] = start["spo2"] + (target_spo2 - start["spo2"]) * ease
            state["hrv_rmssd"] = start["hrv_rmssd"] + (target_hrv - start["hrv_rmssd"]) * ease
            state["cabin_co2"] = start["cabin_co2"] + (target_co2 - start["cabin_co2"]) * ease
            state["respiration_rate"] = start["respiration_rate"] + (target_resp - start["respiration_rate"]) * ease

            if progress >= 1.0:
                # 15-second recovery trajectory complete: restore Nominal Flight Operations
                self.simulation_mode = SimulationMode.NORMAL
                self.crisis_start_time = None
                self.recovery_start_time = None

        elif self.simulation_mode == SimulationMode.NORMAL:
            respiratory_wave = 1.8 * math.sin(t * 0.35)
            slow_drift = 1.0 * math.sin(t * 0.05)
            noise = (random.random() - 0.5) * 1.2

            target_hr = baseline["heart_rate"] + respiratory_wave + slow_drift + noise
            target_hrv = baseline["hrv_rmssd"] - (target_hr - baseline["heart_rate"]) * 0.4 + random.uniform(-1.5, 1.5)
            target_spo2 = baseline["spo2"] + random.uniform(-0.2, 0.2)
            target_core_temp = baseline["core_temp"] + 0.03 * math.sin(t * 0.02)
            target_cabin_co2 = 530.0 + 25.0 * math.sin(t * 0.08)
            target_resp = baseline["respiration_rate"] + random.uniform(-0.3, 0.3)
            target_sys = baseline["systolic_bp"] + random.uniform(-1, 1)
            target_dia = baseline["diastolic_bp"] + random.uniform(-0.8, 0.8)
            target_perf = 4.2 + random.uniform(-0.15, 0.15)
            target_press = 4.30

            alpha = 0.12
            state["heart_rate"] += (target_hr - state["heart_rate"]) * alpha
            state["hrv_rmssd"] += (target_hrv - state["hrv_rmssd"]) * alpha
            state["spo2"] += (target_spo2 - state["spo2"]) * alpha
            state["core_temp"] += (target_core_temp - state["core_temp"]) * 0.08
            state["cabin_co2"] += (target_cabin_co2 - state["cabin_co2"]) * 0.1
            state["respiration_rate"] += (target_resp - state["respiration_rate"]) * alpha
            state["systolic_bp"] += (target_sys - state["systolic_bp"]) * alpha
            state["diastolic_bp"] += (target_dia - state["diastolic_bp"]) * alpha
            state["perfusion_index"] += (target_perf - state["perfusion_index"]) * alpha
            state["suit_pressure_psi"] += (target_press - state["suit_pressure_psi"]) * alpha

        elif self.simulation_mode == SimulationMode.HYPOXIA_CRITICAL:
            target_spo2 = 82.5 + random.uniform(-1.5, 1.2)
            target_hr = 132.0 + random.uniform(-4, 5)
            target_hrv = 14.5 + random.uniform(-1.5, 2.0)
            target_core_temp = baseline["core_temp"] + 0.4
            target_cabin_co2 = 720.0 + random.uniform(-15, 15)
            target_resp = 26.0 + random.uniform(-1.5, 2.0)
            target_sys = baseline["systolic_bp"] + 18.0
            target_dia = baseline["diastolic_bp"] + 10.0
            target_perf = 1.3
            target_press = 4.28

            alpha = 0.20
            state["heart_rate"] += (target_hr - state["heart_rate"]) * alpha
            state["hrv_rmssd"] += (target_hrv - state["hrv_rmssd"]) * alpha
            state["spo2"] += (target_spo2 - state["spo2"]) * alpha
            state["core_temp"] += (target_core_temp - state["core_temp"]) * 0.1
            state["cabin_co2"] += (target_cabin_co2 - state["cabin_co2"]) * 0.15
            state["respiration_rate"] += (target_resp - state["respiration_rate"]) * alpha
            state["systolic_bp"] += (target_sys - state["systolic_bp"]) * alpha
            state["diastolic_bp"] += (target_dia - state["diastolic_bp"]) * alpha
            state["perfusion_index"] += (target_perf - state["perfusion_index"]) * alpha
            state["suit_pressure_psi"] += (target_press - state["suit_pressure_psi"]) * alpha

        elif self.simulation_mode == SimulationMode.HYPERCAPNIA_CRISIS:
            target_cabin_co2 = 4250.0 + random.uniform(-120, 150)
            target_spo2 = 94.2 + random.uniform(-0.6, 0.4)
            target_hr = 112.0 + random.uniform(-3, 4)
            target_hrv = 21.0 + random.uniform(-2, 2)
            target_core_temp = baseline["core_temp"] + 0.25
            target_resp = 24.5 + random.uniform(-1.0, 1.5)
            target_sys = baseline["systolic_bp"] + 24.0
            target_dia = baseline["diastolic_bp"] + 14.0
            target_perf = 3.1
            target_press = 4.31

            alpha = 0.20
            state["heart_rate"] += (target_hr - state["heart_rate"]) * alpha
            state["hrv_rmssd"] += (target_hrv - state["hrv_rmssd"]) * alpha
            state["spo2"] += (target_spo2 - state["spo2"]) * alpha
            state["cabin_co2"] += (target_cabin_co2 - state["cabin_co2"]) * 0.18
            state["respiration_rate"] += (target_resp - state["respiration_rate"]) * alpha
            state["systolic_bp"] += (target_sys - state["systolic_bp"]) * alpha
            state["diastolic_bp"] += (target_dia - state["diastolic_bp"]) * alpha

        elif self.simulation_mode == SimulationMode.CARDIAC_DECONDITIONING:
            target_hr = 104.0 + random.uniform(-3, 3)
            target_hrv = 16.0 + random.uniform(-1.2, 1.5)
            target_spo2 = baseline["spo2"]
            target_cabin_co2 = 560.0
            target_resp = 17.5
            target_sys = baseline["systolic_bp"] - 12.0
            target_dia = baseline["diastolic_bp"] + 4.0
            target_perf = 1.9

            alpha = 0.20
            state["heart_rate"] += (target_hr - state["heart_rate"]) * alpha
            state["hrv_rmssd"] += (target_hrv - state["hrv_rmssd"]) * alpha
            state["spo2"] += (target_spo2 - state["spo2"]) * alpha
            state["respiration_rate"] += (target_resp - state["respiration_rate"]) * alpha
            state["systolic_bp"] += (target_sys - state["systolic_bp"]) * alpha
            state["diastolic_bp"] += (target_dia - state["diastolic_bp"]) * alpha

        # Custom overrides if set
        if self.custom_overrides["cabin_co2"] is not None:
            state["cabin_co2"] = float(self.custom_overrides["cabin_co2"])
        if self.custom_overrides["spo2"] is not None:
            state["spo2"] = float(self.custom_overrides["spo2"])
        if self.custom_overrides["heart_rate"] is not None:
            state["heart_rate"] = float(self.custom_overrides["heart_rate"])

        return AstronautVitals(
            heart_rate=round(max(30.0, min(220.0, state["heart_rate"])), 1),
            hrv_rmssd=round(max(5.0, min(150.0, state["hrv_rmssd"])), 1),
            spo2=round(max(60.0, min(100.0, state["spo2"])), 1),
            core_temp=round(max(33.0, min(42.0, state["core_temp"])), 2),
            cabin_co2=round(max(200.0, min(10000.0, state["cabin_co2"])), 1),
            respiration_rate=round(max(4.0, min(50.0, state["respiration_rate"])), 1),
            systolic_bp=round(max(60.0, min(240.0, state["systolic_bp"])), 1),
            diastolic_bp=round(max(40.0, min(150.0, state["diastolic_bp"])), 1),
            perfusion_index=round(max(0.2, min(15.0, state["perfusion_index"])), 2),
            suit_pressure_psi=round(max(0.5, min(15.0, state["suit_pressure_psi"])), 2),
            radiation_rate_usvh=round(21.4 + 1.2 * math.sin(t * 0.1), 2),
        )

    def generate_packet(self, astro_id: str) -> TelemetryPacket:
        profile = self.crew[astro_id]
        vitals = self.generate_next_vitals(astro_id)
        overall_status, anomalies, ml_metadata = anomaly_detector.evaluate_telemetry(astro_id, vitals)

        now_iso = datetime.now(timezone.utc).isoformat()
        total_seconds = int(time.time() - self.mission_start_epoch)
        mission_day = (total_seconds // 86400) + 1

        is_recovering = self.simulation_mode == SimulationMode.RECOVERY
        recovery_remaining = 0
        if is_recovering and self.recovery_start_time:
            recovery_remaining = max(0, int(self.RECOVERY_DURATION_SECONDS - (time.time() - self.recovery_start_time)))

        last_hw = self.hardware_sensor_last_seen.get(astro_id, 0)
        hw_linked = (time.time() - last_hw) < 12.0

        packet = TelemetryPacket(
            timestamp=now_iso,
            astronaut_id=astro_id,
            astronaut_name=profile["name"],
            astronaut_callsign=profile["callsign"],
            astronaut_role=profile["role"],
            suit_id=profile["suit_id"],
            vitals=vitals,
            overall_status=overall_status,
            anomalies=anomalies,
            simulation_mode=self.simulation_mode,
            mission_elapsed_time=self._format_met(),
            mission_day=mission_day,
            data_quality_index=99.8,
            ml_confidence_pct=ml_metadata["ml_confidence_pct"],
            primary_contributing_vector=ml_metadata["primary_contributing_vector"],
            feature_contributions=ml_metadata["feature_contributions"],
            personalized_thresholds=profile.get("personalized_thresholds", {}),
            hardware_sensor_linked=hw_linked,
            hardware_device_id=self.hardware_device_ids.get(astro_id) if hw_linked else None,
            clinical_recovery_active=is_recovering,
            clinical_recovery_seconds_remaining=recovery_remaining,
        )

        # Store in rolling Blackbox buffer
        self.blackbox_buffers[astro_id].append({
            "timestamp": now_iso,
            "mission_elapsed_time": packet.mission_elapsed_time,
            "astronaut_id": astro_id,
            "astronaut_name": profile["name"],
            "heart_rate": vitals.heart_rate,
            "spo2": vitals.spo2,
            "hrv_rmssd": vitals.hrv_rmssd,
            "core_temp": vitals.core_temp,
            "cabin_co2": vitals.cabin_co2,
            "overall_status": overall_status.value,
            "ml_confidence_pct": ml_metadata["ml_confidence_pct"],
            "primary_contributing_vector": ml_metadata["primary_contributing_vector"],
            "hardware_sensor_linked": hw_linked,
        })

        return packet

    def get_blackbox_history(self, astro_id: str, limit: int = 3600) -> List[Dict[str, Any]]:
        if astro_id not in self.blackbox_buffers:
            astro_id = "CDR-01"
        return list(self.blackbox_buffers[astro_id])[-limit:]

    def get_crew_list(self) -> List[CrewMember]:
        return [CrewMember(**p) for p in self.crew.values()]


# Global engine instance
biometric_engine = BiometricEngine()
