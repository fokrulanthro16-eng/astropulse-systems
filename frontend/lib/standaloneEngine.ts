import { 
  TelemetryPacket, 
  CrewOverviewItem, 
  SimulationStatus, 
  SimulationMode, 
  AnomalyRecord, 
  CountermeasureStep 
} from "./types";

interface AstronautProfile {
  id: string;
  name: string;
  callsign: string;
  role: string;
  suit_id: string;
  baseline: {
    heart_rate: number;
    hrv_rmssd: number;
    spo2: number;
    core_temp: number;
    respiration_rate: number;
    systolic_bp: number;
    diastolic_bp: number;
    cabin_co2: number;
    suit_pressure_psi: number;
  };
  personalized_thresholds: {
    hr_nominal_min: number;
    hr_nominal_max: number;
    hr_warning_low: number;
    hr_warning_high: number;
    hr_critical_low: number;
    hr_critical_high: number;
    hrv_warning_low: number;
    hrv_critical_low: number;
    profile_type: string;
  };
}

const CREW_PROFILES: Record<string, AstronautProfile> = {
  "CDR-01": {
    id: "CDR-01",
    name: "Sarah Vance",
    callsign: "Aegis-Lead",
    role: "Mission Commander",
    suit_id: "EMU-MK4-09",
    baseline: {
      heart_rate: 62.0,
      hrv_rmssd: 65.0,
      spo2: 98.8,
      core_temp: 36.9,
      respiration_rate: 14.0,
      systolic_bp: 115.0,
      diastolic_bp: 75.0,
      cabin_co2: 520.0,
      suit_pressure_psi: 4.30
    },
    personalized_thresholds: {
      hr_nominal_min: 55.0,
      hr_nominal_max: 85.0,
      hr_warning_low: 48.0,
      hr_warning_high: 100.0,
      hr_critical_low: 40.0,
      hr_critical_high: 130.0,
      hrv_warning_low: 28.0,
      hrv_critical_low: 20.0,
      profile_type: "Command Standard"
    }
  },
  "MS-02": {
    id: "MS-02",
    name: "Mark Chen",
    callsign: "Vector-2",
    role: "EVA Specialist",
    suit_id: "EMU-MK4-14",
    baseline: {
      heart_rate: 54.0,
      hrv_rmssd: 72.0,
      spo2: 99.2,
      core_temp: 36.8,
      respiration_rate: 12.0,
      systolic_bp: 110.0,
      diastolic_bp: 70.0,
      cabin_co2: 520.0,
      suit_pressure_psi: 4.30
    },
    personalized_thresholds: {
      hr_nominal_min: 46.0,
      hr_nominal_max: 78.0,
      hr_warning_low: 42.0,
      hr_warning_high: 92.0,
      hr_critical_low: 36.0,
      hr_critical_high: 125.0,
      hrv_warning_low: 32.0,
      hrv_critical_low: 22.0,
      profile_type: "Aerobic Athletic Tolerant"
    }
  },
  "FE-03": {
    id: "FE-03",
    name: "Elena Rostova",
    callsign: "Cosmo-3",
    role: "Flight Engineer & Medical Officer",
    suit_id: "EMU-MK4-03",
    baseline: {
      heart_rate: 68.0,
      hrv_rmssd: 58.0,
      spo2: 98.4,
      core_temp: 37.0,
      respiration_rate: 15.0,
      systolic_bp: 118.0,
      diastolic_bp: 76.0,
      cabin_co2: 520.0,
      suit_pressure_psi: 4.30
    },
    personalized_thresholds: {
      hr_nominal_min: 60.0,
      hr_nominal_max: 90.0,
      hr_warning_low: 52.0,
      hr_warning_high: 105.0,
      hr_critical_low: 44.0,
      hr_critical_high: 135.0,
      hrv_warning_low: 25.0,
      hrv_critical_low: 18.0,
      profile_type: "Normotensive Standard"
    }
  }
};

const DEFAULT_SOP_STEPS: CountermeasureStep[] = [
  {
    step_number: 1,
    title: "O2 Mask Sealed & 100% FiO2 Delivery",
    directive: "Immediately don and verify seal of Emergency Oxygen Mask. Set delivery regulator to 100% FiO2 at 12 L/min continuous positive pressure.",
    subsystem: "ECLSS-O2-EMERGENCY",
    target_window_seconds: 30,
    requires_flight_director_signoff: false,
    clinical_category: "O2_DELIVERY"
  },
  {
    step_number: 2,
    title: "ECLSS Scrubber Valve Stage-2 Override",
    directive: "Engage manual bypass solenoid on ECLSS Primary O2 regulator valve line 4B / CDRA Desorb Bed B. Purge suit atmosphere loop.",
    subsystem: "ECLSS-VALVE-O2B",
    target_window_seconds: 60,
    requires_flight_director_signoff: true,
    clinical_category: "ECLSS_OVERRIDE"
  },
  {
    step_number: 3,
    title: "IV Fluid Saline Prep & Preload Infusion",
    directive: "Stage peripheral IV catheter and prepare 500 mL normal saline (0.9% NaCl) bolus infusion to counter microgravity peripheral pooling.",
    subsystem: "MED-PHARMA-INFUSION",
    target_window_seconds: 120,
    requires_flight_director_signoff: false,
    clinical_category: "PHARMA_SALINE"
  },
  {
    step_number: 4,
    title: "Restrict High-g Movement & Supine Posture",
    directive: "Astronaut to halt physical exertion; assume recumbent posture with lower limbs elevated to maximize cerebral and coronary oxygen perfusion.",
    subsystem: "CREW-ERGONOMICS",
    target_window_seconds: 180,
    requires_flight_director_signoff: false,
    clinical_category: "RESTRICT_MOVEMENT"
  }
];

class StandaloneBiometricEngine {
  private currentMode: SimulationMode = "NORMAL";
  private isCrisisActive: boolean = false;
  private crisisElapsedSeconds: number = 0;
  private isRecoveryActive: boolean = false;
  private recoveryRemainingSeconds: number = 0;
  private missionSeconds: number = 42 * 86400 + 14 * 3600 + 28 * 60;
  
  // State per astronaut
  private liveState: Record<string, {
    hr: number;
    spo2: number;
    hrv: number;
    resp: number;
    temp: number;
    co2: number;
  }> = {};

  constructor() {
    this.resetAllStates();
  }

  private resetAllStates() {
    for (const [id, prof] of Object.entries(CREW_PROFILES)) {
      this.liveState[id] = {
        hr: prof.baseline.heart_rate,
        spo2: prof.baseline.spo2,
        hrv: prof.baseline.hrv_rmssd,
        resp: prof.baseline.respiration_rate,
        temp: prof.baseline.core_temp,
        co2: prof.baseline.cabin_co2
      };
    }
  }

  public getSimulationStatus(): SimulationStatus {
    return {
      current_mode: this.currentMode,
      mode_display_name: this.isCrisisActive
        ? "Acute Hypoxia Crisis Scenario"
        : this.isRecoveryActive
        ? "Closed-Loop Clinical Recovery"
        : "Nominal Flight Operations",
      is_crisis_active: this.isCrisisActive,
      crisis_start_time: this.isCrisisActive ? new Date().toISOString() : null,
      elapsed_crisis_seconds: this.crisisElapsedSeconds,
      active_crew_affected: ["CDR-01", "MS-02", "FE-03"],
      description: this.isCrisisActive
        ? "Arterial oxygen desaturation with compensatory tachycardia."
        : this.isRecoveryActive
        ? `Closed-loop stabilization active: ${this.recoveryRemainingSeconds}s remaining.`
        : "All ECLSS subsystems within nominal operating parameters.",
      clinical_recovery_active: this.isRecoveryActive,
      clinical_recovery_seconds_remaining: this.recoveryRemainingSeconds
    };
  }

  public triggerCrisis(mode: SimulationMode = "HYPOXIA_CRITICAL") {
    this.currentMode = mode;
    this.isCrisisActive = true;
    this.isRecoveryActive = false;
    this.crisisElapsedSeconds = 0;
  }

  public triggerRecovery() {
    this.isCrisisActive = false;
    this.isRecoveryActive = true;
    this.recoveryRemainingSeconds = 15;
    this.currentMode = "RECOVERY";
  }

  public resetSimulation() {
    this.currentMode = "NORMAL";
    this.isCrisisActive = false;
    this.isRecoveryActive = false;
    this.crisisElapsedSeconds = 0;
    this.recoveryRemainingSeconds = 0;
    this.resetAllStates();
  }

  public tick(selectedAstronautId: string): {
    active_astronaut: TelemetryPacket;
    crew_overview: CrewOverviewItem[];
  } {
    this.missionSeconds += 1;
    if (this.isCrisisActive) {
      this.crisisElapsedSeconds += 1;
    }
    if (this.isRecoveryActive) {
      this.recoveryRemainingSeconds = Math.max(0, this.recoveryRemainingSeconds - 1);
      if (this.recoveryRemainingSeconds === 0) {
        this.isRecoveryActive = false;
        this.currentMode = "NORMAL";
      }
    }

    // Format mission elapsed time
    const days = Math.floor(this.missionSeconds / 86400);
    const hrs = Math.floor((this.missionSeconds % 86400) / 3600);
    const mins = Math.floor((this.missionSeconds % 3600) / 60);
    const secs = this.missionSeconds % 60;
    const met = `MET ${String(days).padStart(3, "0")}:${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    const nowIso = new Date().toISOString();
    const crewOverview: CrewOverviewItem[] = [];

    // Advance vitals for all crew
    for (const [id, prof] of Object.entries(CREW_PROFILES)) {
      const state = this.liveState[id];
      const jitter = (Math.random() - 0.5) * 0.4;

      if (this.isCrisisActive) {
        // Target crisis vitals
        const targetSpo2 = 82.5 + (Math.random() - 0.5) * 0.4;
        const targetHr = (id === "MS-02" ? 125 : 132) + (Math.random() - 0.5) * 2;
        const targetResp = 26 + (Math.random() - 0.5) * 0.8;
        const targetHrv = 15.2 + (Math.random() - 0.5) * 0.5;
        const targetCo2 = 715 + Math.random() * 5;

        // Smooth transition towards crisis
        state.spo2 += (targetSpo2 - state.spo2) * 0.35;
        state.hr += (targetHr - state.hr) * 0.35;
        state.resp += (targetResp - state.resp) * 0.35;
        state.hrv += (targetHrv - state.hrv) * 0.35;
        state.co2 += (targetCo2 - state.co2) * 0.25;
      } else if (this.isRecoveryActive) {
        // Smooth 15s S-curve back to baseline
        const base = prof.baseline;
        const progressRate = 0.22;
        state.spo2 += (base.spo2 - state.spo2) * progressRate;
        state.hr += (base.heart_rate - state.hr) * progressRate;
        state.resp += (base.respiration_rate - state.resp) * progressRate;
        state.hrv += (base.hrv_rmssd - state.hrv) * progressRate;
        state.co2 += (base.cabin_co2 - state.co2) * progressRate;
      } else {
        // Natural nominal homeostatic drift around baseline
        const base = prof.baseline;
        state.spo2 += (base.spo2 + jitter * 0.2 - state.spo2) * 0.3;
        state.hr += (base.heart_rate + jitter * 1.5 - state.hr) * 0.3;
        state.resp += (base.respiration_rate + jitter * 0.3 - state.resp) * 0.3;
        state.hrv += (base.hrv_rmssd + jitter * 1.2 - state.hrv) * 0.3;
        state.co2 += (base.cabin_co2 + (Math.random() - 0.5) * 5 - state.co2) * 0.2;
      }

      state.temp = prof.baseline.core_temp + (Math.random() - 0.5) * 0.04;

      const crewStatus = this.isCrisisActive ? "CRITICAL" : "NOMINAL";
      crewOverview.push({
        id: prof.id,
        name: prof.name,
        callsign: prof.callsign,
        role: prof.role,
        heart_rate: Math.round(state.hr),
        spo2: parseFloat(state.spo2.toFixed(1)),
        overall_status: crewStatus,
        ml_confidence_pct: this.isCrisisActive ? 94.2 : 8.4,
        primary_contributing_vector: this.isCrisisActive
          ? "Arterial O2 Desaturation"
          : "Nominal Homeostasis",
        anomaly_count: this.isCrisisActive ? 2 : 0,
        hardware_sensor_linked: false
      });
    }

    // Prepare active astronaut packet
    const activeProf = CREW_PROFILES[selectedAstronautId] || CREW_PROFILES["CDR-01"];
    const activeState = this.liveState[activeProf.id];

    let overallStatus = this.isCrisisActive ? "CRITICAL" : "NOMINAL";
    let anomalies: AnomalyRecord[] = [];
    let mlConfidence = 8.4;
    let primaryVector = "Nominal Homeostasis";

    if (this.isCrisisActive) {
      mlConfidence = 94.2;
      primaryVector = "Arterial O2 Desaturation (Hypoxia) (Z = -20.0 sigma)";
      anomalies = [
        {
          id: `ANOM-HYPOXIA-${activeProf.id}`,
          anomaly_type: "ACUTE_HYPOXIA",
          title: "CRITICAL HYPOXIA / RAPID DESATURATION",
          severity: "CRITICAL",
          confidence_score: 0.94,
          ml_confidence_pct: 94.2,
          primary_contributing_vector: primaryVector,
          z_scores: { spo2: -20.0, heart_rate: 6.8, respiration_rate: 5.4 },
          description: `Capillary blood oxygen saturation plummeted to ${activeState.spo2.toFixed(1)}% with compensatory heart rate surge at ${Math.round(activeState.hr)} bpm. Severe risk of cognitive impairment, syncope, and hypoxemic cellular distress.`,
          physiological_impact: "Cerebral hypoperfusion, severe tissue desaturation, compensatory sympathetic overdrive.",
          trigger_metrics: {
            spo2: parseFloat(activeState.spo2.toFixed(1)),
            heart_rate: Math.round(activeState.hr),
            respiration_rate: parseFloat(activeState.resp.toFixed(1))
          },
          countermeasures: DEFAULT_SOP_STEPS,
          protocol_code: "NASA-FLIGHT-MED-ECLSS-09B",
          timestamp: nowIso
        }
      ];
    } else if (this.isRecoveryActive) {
      mlConfidence = 32.5;
      primaryVector = "Closed-Loop Physiological Normalization";
    }

    const activePacket: TelemetryPacket = {
      timestamp: nowIso,
      astronaut_id: activeProf.id,
      astronaut_name: activeProf.name,
      astronaut_callsign: activeProf.callsign,
      astronaut_role: activeProf.role,
      suit_id: activeProf.suit_id,
      vitals: {
        heart_rate: parseFloat(activeState.hr.toFixed(1)),
        hrv_rmssd: parseFloat(activeState.hrv.toFixed(1)),
        spo2: parseFloat(activeState.spo2.toFixed(1)),
        core_temp: parseFloat(activeState.temp.toFixed(2)),
        cabin_co2: Math.round(activeState.co2),
        respiration_rate: Math.round(activeState.resp),
        systolic_bp: activeProf.baseline.systolic_bp,
        diastolic_bp: activeProf.baseline.diastolic_bp,
        perfusion_index: 2.4,
        suit_pressure_psi: 4.30,
        radiation_rate_usvh: 34.2
      },
      overall_status: overallStatus as any,
      anomalies,
      simulation_mode: this.currentMode,
      mission_elapsed_time: met,
      mission_day: days,
      data_quality_index: 99.8,
      ml_confidence_pct: mlConfidence,
      primary_contributing_vector: primaryVector,
      personalized_thresholds: activeProf.personalized_thresholds,
      hardware_sensor_linked: false,
      hardware_device_id: null,
      clinical_recovery_active: this.isRecoveryActive,
      clinical_recovery_seconds_remaining: this.recoveryRemainingSeconds
    };

    return {
      active_astronaut: activePacket,
      crew_overview: crewOverview
    };
  }
}

export const standaloneEngine = new StandaloneBiometricEngine();
