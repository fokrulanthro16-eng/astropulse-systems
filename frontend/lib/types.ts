export type AnomalySeverity = "NOMINAL" | "CAUTION" | "WARNING" | "CRITICAL";

export type SimulationMode =
  | "NORMAL"
  | "HYPOXIA_CRITICAL"
  | "HYPERCAPNIA_CRISIS"
  | "CARDIAC_DECONDITIONING"
  | "RAPID_DECOMPRESSION"
  | "RECOVERY";

export interface CountermeasureStep {
  step_number: number;
  title: string;
  directive: string;
  subsystem: string;
  target_window_seconds: number;
  requires_flight_director_signoff: boolean;
  clinical_category?: string;
}

export interface AnomalyRecord {
  id: string;
  anomaly_type: string;
  title: string;
  severity: AnomalySeverity;
  confidence_score: number;
  ml_confidence_pct: number;
  primary_contributing_vector: string;
  feature_contributions?: Record<string, number>;
  z_scores: Record<string, number>;
  description: string;
  physiological_impact: string;
  trigger_metrics: Record<string, number>;
  countermeasures: CountermeasureStep[];
  protocol_code: string;
  timestamp: string;
}

export interface AstronautVitals {
  heart_rate: number;
  hrv_rmssd: number;
  spo2: number;
  core_temp: number;
  cabin_co2: number;
  respiration_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  perfusion_index: number;
  suit_pressure_psi: number;
  radiation_rate_usvh: number;
}

export interface TelemetryPacket {
  timestamp: string;
  astronaut_id: string;
  astronaut_name: string;
  astronaut_callsign: string;
  astronaut_role: string;
  suit_id: string;
  vitals: AstronautVitals;
  overall_status: AnomalySeverity;
  anomalies: AnomalyRecord[];
  simulation_mode: SimulationMode;
  mission_elapsed_time: string;
  mission_day: number;
  data_quality_index: number;
  ml_confidence_pct: number;
  primary_contributing_vector: string;
  feature_contributions?: Record<string, number>;
  // Level-3 Enterprise Fields
  personalized_thresholds?: Record<string, any>;
  hardware_sensor_linked?: boolean;
  hardware_device_id?: string | null;
  clinical_recovery_active?: boolean;
  clinical_recovery_seconds_remaining?: number;
}

export interface CrewOverviewItem {
  id: string;
  name: string;
  callsign: string;
  role: string;
  heart_rate: number;
  spo2: number;
  overall_status: AnomalySeverity;
  ml_confidence_pct?: number;
  primary_contributing_vector?: string;
  anomaly_count: number;
  hardware_sensor_linked?: boolean;
}

export interface TelemetryEnvelope {
  type: string;
  active_astronaut: TelemetryPacket;
  crew_overview: CrewOverviewItem[];
  server_time: string;
}

export interface SimulationStatus {
  current_mode: SimulationMode;
  mode_display_name: string;
  is_crisis_active: boolean;
  crisis_start_time: string | null;
  elapsed_crisis_seconds: number;
  active_crew_affected: string[];
  description: string;
  clinical_recovery_active?: boolean;
  clinical_recovery_seconds_remaining?: number;
}

export interface ChartDataPoint {
  timeStr: string;
  timestamp: number;
  heartRate: number;
  spo2: number;
  hrv: number;
  cabinCo2: number;
}
