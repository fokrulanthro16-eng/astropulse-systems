"""Pydantic data models for AstroPulse Telemetry and Biometrics (Level 3)."""

from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class AnomalySeverity(str, Enum):
    NOMINAL = "NOMINAL"
    CAUTION = "CAUTION"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class SimulationMode(str, Enum):
    NORMAL = "NORMAL"
    HYPOXIA_CRITICAL = "HYPOXIA_CRITICAL"
    HYPERCAPNIA_CRISIS = "HYPERCAPNIA_CRISIS"
    CARDIAC_DECONDITIONING = "CARDIAC_DECONDITIONING"
    RAPID_DECOMPRESSION = "RAPID_DECOMPRESSION"
    RECOVERY = "RECOVERY"  # 15-second closed-loop clinical recovery mode


class CountermeasureStep(BaseModel):
    step_number: int
    title: str
    directive: str
    subsystem: str
    target_window_seconds: int
    requires_flight_director_signoff: bool = False
    clinical_category: str = "FLIGHT_MEDICINE"


class AnomalyRecord(BaseModel):
    id: str
    anomaly_type: str
    title: str
    severity: AnomalySeverity
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    ml_confidence_pct: float = Field(default=85.0, ge=0.0, le=100.0)
    primary_contributing_vector: str = Field(default="Multivariate Divergence")
    feature_contributions: Dict[str, float] = Field(default_factory=dict)
    z_scores: Dict[str, float] = Field(default_factory=dict)
    description: str
    physiological_impact: str
    trigger_metrics: Dict[str, float]
    countermeasures: List[CountermeasureStep]
    protocol_code: str
    timestamp: str


class AstronautVitals(BaseModel):
    heart_rate: float = Field(..., description="Heart Rate in beats per minute (bpm)")
    hrv_rmssd: float = Field(..., description="Root Mean Square of Successive Differences (ms)")
    spo2: float = Field(..., description="Peripheral Capillary Oxygen Saturation (%)")
    core_temp: float = Field(..., description="Core Body Temperature (°C)")
    cabin_co2: float = Field(..., description="Cabin Environmental Carbon Dioxide (ppm)")
    respiration_rate: float = Field(..., description="Respiration Rate (breaths/min)")
    systolic_bp: float = Field(..., description="Systolic Blood Pressure (mmHg)")
    diastolic_bp: float = Field(..., description="Diastolic Blood Pressure (mmHg)")
    perfusion_index: float = Field(..., description="Peripheral Perfusion Index (%)")
    suit_pressure_psi: float = Field(..., description="EVA Suit / Cabin Pressure differential (psi)")
    radiation_rate_usvh: float = Field(..., description="Ambient ionizing radiation dose rate (µSv/h)")


class TelemetryPacket(BaseModel):
    timestamp: str
    astronaut_id: str
    astronaut_name: str
    astronaut_callsign: str
    astronaut_role: str
    suit_id: str
    vitals: AstronautVitals
    overall_status: AnomalySeverity
    anomalies: List[AnomalyRecord]
    simulation_mode: SimulationMode
    mission_elapsed_time: str
    mission_day: int
    data_quality_index: float = Field(default=99.8, ge=0.0, le=100.0)
    ml_confidence_pct: float = Field(default=12.5, ge=0.0, le=100.0)
    primary_contributing_vector: str = Field(default="Nominal Homeostasis")
    feature_contributions: Dict[str, float] = Field(default_factory=dict)
    # Level-3 Enterprise Fields
    personalized_thresholds: Dict[str, Any] = Field(default_factory=dict)
    hardware_sensor_linked: bool = Field(default=False, description="Flag indicating live external wearable BTLE/IoT sensor stream active")
    hardware_device_id: Optional[str] = None
    clinical_recovery_active: bool = False
    clinical_recovery_seconds_remaining: int = 0


class IngestTelemetryRequest(BaseModel):
    astronaut_id: str = Field(default="CDR-01", description="Target crew member ID (e.g. CDR-01, MS-02, FE-03)")
    heart_rate: float = Field(..., ge=30.0, le=240.0, description="Heart Rate in bpm")
    spo2: float = Field(..., ge=50.0, le=100.0, description="Blood oxygen saturation (%)")
    hrv_rmssd: float = Field(..., ge=5.0, le=200.0, description="HRV RMSSD in ms")
    core_temp: float = Field(..., ge=33.0, le=42.0, description="Core temperature (°C)")
    respiration_rate: Optional[float] = Field(default=None, ge=4.0, le=60.0)
    cabin_co2: Optional[float] = Field(default=None, ge=200.0, le=10000.0)
    device_id: Optional[str] = Field(default="BIO-HARNESS-BTLE-01", description="Hardware wearable device identifier")


class IngestTelemetryResponse(BaseModel):
    status: str
    message: str
    astronaut_id: str
    ingested_at: str
    hardware_device_id: str
    packet_snapshot: TelemetryPacket


class CrisisSimulationRequest(BaseModel):
    mode: SimulationMode
    astronaut_id: Optional[str] = None
    duration_seconds: Optional[int] = 120
    custom_co2_override: Optional[float] = None
    custom_spo2_target: Optional[float] = None
    custom_hr_target: Optional[float] = None


class SimulationStatusResponse(BaseModel):
    current_mode: SimulationMode
    mode_display_name: str
    is_crisis_active: bool
    crisis_start_time: Optional[str] = None
    elapsed_crisis_seconds: int = 0
    active_crew_affected: List[str]
    description: str
    clinical_recovery_active: bool = False
    clinical_recovery_seconds_remaining: int = 0


class CrewMember(BaseModel):
    id: str
    name: str
    callsign: str
    role: str
    eva_status: str
    age: int
    suit_id: str
    baseline: Dict[str, float]
    personalized_thresholds: Dict[str, Any] = Field(default_factory=dict)
