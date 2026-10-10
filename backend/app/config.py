"""AstroPulse Systems Configuration & Constants (Level 3 Mission-Grade)."""

from typing import Dict, Any

# Application Settings
APP_NAME = "AstroPulse Systems"
APP_DESCRIPTION = "Next-Generation Astronaut Biometric Telemetry & Autonomous Anomaly Engine"
VERSION = "3.0.0"
HOST = "0.0.0.0"
PORT = 8000
STREAM_INTERVAL_SECONDS = 1.0  # Telemetry update rate (1 Hz)

# Level-3 Distinct Astronaut-Specific Baseline Profiles
CREW_MEMBERS = [
    {
        "id": "CDR-01",
        "name": "Sarah Vance",
        "callsign": "Aegis-Lead",
        "role": "Mission Commander",
        "eva_status": "HABITAT_OPERATIONS",
        "age": 39,
        "suit_id": "EMU-MK4-09",
        "baseline": {
            "heart_rate": 62.0,      # Level-3 Specified: 62 bpm
            "hrv_rmssd": 65.0,       # Level-3 Specified: 65 ms
            "spo2": 98.8,
            "core_temp": 36.9,
            "respiration_rate": 13.5,
            "systolic_bp": 115.0,
            "diastolic_bp": 75.0,
        },
        "personalized_thresholds": {
            "hr_nominal_min": 55.0,
            "hr_nominal_max": 85.0,
            "hr_warning_low": 48.0,
            "hr_warning_high": 100.0,
            "hr_critical_low": 40.0,
            "hr_critical_high": 130.0,
            "hrv_warning_low": 28.0,
            "hrv_critical_low": 20.0,
            "profile_type": "Command Standard"
        }
    },
    {
        "id": "MS-02",
        "name": "Mark Chen",
        "callsign": "Vector-2",
        "role": "EVA Specialist",
        "eva_status": "EVA_AIRLOCK_PREP",
        "age": 34,
        "suit_id": "EMU-MK4-14",
        "baseline": {
            "heart_rate": 54.0,      # Level-3 Specified: 54 bpm (Athletic)
            "hrv_rmssd": 72.0,       # Level-3 Specified: 72 ms
            "spo2": 99.2,
            "core_temp": 36.8,
            "respiration_rate": 12.0,
            "systolic_bp": 110.0,
            "diastolic_bp": 70.0,
        },
        "personalized_thresholds": {
            "hr_nominal_min": 46.0,
            "hr_nominal_max": 78.0,
            "hr_warning_low": 42.0,
            "hr_warning_high": 92.0,
            "hr_critical_low": 36.0,
            "hr_critical_high": 125.0,
            "hrv_warning_low": 32.0,
            "hrv_critical_low": 22.0,
            "profile_type": "Aerobic Athletic Tolerant"
        }
    },
    {
        "id": "FE-03",
        "name": "Elena Rostova",
        "callsign": "Cosmo-3",
        "role": "Flight Engineer & Medical Officer",
        "eva_status": "LIFE_SUPPORT_BAY",
        "age": 42,
        "suit_id": "EMU-MK4-03",
        "baseline": {
            "heart_rate": 68.0,      # Level-3 Specified: 68 bpm
            "hrv_rmssd": 58.0,       # Level-3 Specified: 58 ms
            "spo2": 98.4,
            "core_temp": 37.0,
            "respiration_rate": 14.5,
            "systolic_bp": 118.0,
            "diastolic_bp": 76.0,
        },
        "personalized_thresholds": {
            "hr_nominal_min": 60.0,
            "hr_nominal_max": 90.0,
            "hr_warning_low": 52.0,
            "hr_warning_high": 105.0,
            "hr_critical_low": 44.0,
            "hr_critical_high": 135.0,
            "hrv_warning_low": 25.0,
            "hrv_critical_low": 18.0,
            "profile_type": "Normotensive Standard"
        }
    }
]

# Standard Clinical Aerospace Reference Limits
THRESHOLDS: Dict[str, Any] = {
    "heart_rate": {
        "critical_low": 40.0,
        "warning_low": 48.0,
        "warning_high": 105.0,
        "critical_high": 135.0,
        "nominal_min": 55.0,
        "nominal_max": 90.0,
        "unit": "bpm"
    },
    "hrv_rmssd": {
        "critical_low": 18.0,
        "warning_low": 25.0,
        "nominal_min": 35.0,
        "nominal_max": 80.0,
        "unit": "ms"
    },
    "spo2": {
        "critical_low": 88.0,
        "warning_low": 92.0,
        "nominal_min": 95.0,
        "nominal_max": 100.0,
        "unit": "%"
    },
    "core_temp": {
        "critical_low": 35.0,
        "warning_low": 35.8,
        "warning_high": 37.8,
        "critical_high": 38.6,
        "nominal_min": 36.5,
        "nominal_max": 37.4,
        "unit": "°C"
    },
    "cabin_co2": {
        "nominal_max": 1000.0,
        "warning_high": 2000.0,
        "critical_high": 3500.0,
        "unit": "ppm"
    },
    "respiration_rate": {
        "critical_low": 8.0,
        "warning_low": 10.0,
        "warning_high": 22.0,
        "critical_high": 28.0,
        "nominal_min": 12.0,
        "nominal_max": 18.0,
        "unit": "br/min"
    }
}
