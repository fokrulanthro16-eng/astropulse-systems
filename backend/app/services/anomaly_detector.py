"""Anomaly Detection Engine for AstroPulse Systems (Level 2).

Combines NASA aerospace medical threshold guidelines, rolling Z-score statistical
tracking, and on-device Edge ML IsolationForest multivariate anomaly modeling.
"""

from collections import deque
from datetime import datetime, timezone
from typing import Dict, List, Tuple
import numpy as np

from app.models.telemetry import (
    AstronautVitals,
    AnomalySeverity,
    AnomalyRecord,
    CountermeasureStep
)
from app.config import THRESHOLDS
from app.detector import edge_ml_detector


class AnomalyDetector:
    def __init__(self, history_window_size: int = 60):
        self.window_size = history_window_size
        self.history: Dict[str, Dict[str, deque]] = {}

    def _get_or_init_history(self, astro_id: str) -> Dict[str, deque]:
        if astro_id not in self.history:
            self.history[astro_id] = {
                "heart_rate": deque(maxlen=self.window_size),
                "hrv_rmssd": deque(maxlen=self.window_size),
                "spo2": deque(maxlen=self.window_size),
                "core_temp": deque(maxlen=self.window_size),
                "cabin_co2": deque(maxlen=self.window_size),
                "respiration_rate": deque(maxlen=self.window_size),
            }
        return self.history[astro_id]

    def _update_history_and_calc_z_scores(
        self, astro_id: str, vitals: AstronautVitals
    ) -> Dict[str, float]:
        hist = self._get_or_init_history(astro_id)
        current_vals = {
            "heart_rate": vitals.heart_rate,
            "hrv_rmssd": vitals.hrv_rmssd,
            "spo2": vitals.spo2,
            "core_temp": vitals.core_temp,
            "cabin_co2": vitals.cabin_co2,
            "respiration_rate": vitals.respiration_rate,
        }

        z_scores: Dict[str, float] = {}

        for key, val in current_vals.items():
            dq = hist[key]
            if len(dq) >= 10:
                arr = np.array(dq)
                mean = float(np.mean(arr))
                std = float(np.std(arr))
                denom = max(std, 0.5)
                z = (val - mean) / denom
                z_scores[key] = round(float(z), 2)
            else:
                z_scores[key] = 0.0

            dq.append(val)

        return z_scores

    def evaluate_telemetry(
        self, astro_id: str, vitals: AstronautVitals
    ) -> Tuple[AnomalySeverity, List[AnomalyRecord], Dict]:
        z_scores = self._update_history_and_calc_z_scores(astro_id, vitals)
        now_iso = datetime.now(timezone.utc).isoformat()
        anomalies: List[AnomalyRecord] = []

        # ---------------------------------------------------------------------
        # Edge ML Pipeline Evaluation (IsolationForest Multivariate Inference)
        # ---------------------------------------------------------------------
        vitals_dict = {
            "heart_rate": vitals.heart_rate,
            "hrv_rmssd": vitals.hrv_rmssd,
            "spo2": vitals.spo2,
            "respiration_rate": vitals.respiration_rate,
            "core_temp": vitals.core_temp
        }
        ml_result = edge_ml_detector.evaluate(vitals_dict)
        ml_confidence_pct = ml_result["ml_confidence_pct"]
        primary_vector = ml_result["primary_contributing_vector"]
        feature_contributions = ml_result["feature_contributions"]

        # =========================================================================
        # 1. HYPOXIA EVALUATION (Acute O2 desaturation, compensatory tachycardia)
        # =========================================================================
        is_hypoxia_crit = (
            vitals.spo2 <= THRESHOLDS["spo2"]["critical_low"]
            or (vitals.spo2 <= 91.0 and vitals.heart_rate >= 105.0)
            or (vitals.spo2 <= 92.0 and z_scores.get("spo2", 0) <= -2.5)
        )
        is_hypoxia_warn = vitals.spo2 <= THRESHOLDS["spo2"]["warning_low"]

        if is_hypoxia_crit:
            conf_val = min(1.0, max(0.85, ml_confidence_pct / 100.0))
            anomalies.append(
                AnomalyRecord(
                    id=f"ANOM-HYPOXIA-{astro_id}",
                    anomaly_type="HYPOXIA",
                    title="CRITICAL HYPOXIA / RAPID DESATURATION",
                    severity=AnomalySeverity.CRITICAL,
                    confidence_score=round(conf_val, 3),
                    ml_confidence_pct=ml_confidence_pct,
                    primary_contributing_vector=primary_vector,
                    feature_contributions=feature_contributions,
                    z_scores={"spo2": z_scores.get("spo2", 0.0), "heart_rate": z_scores.get("heart_rate", 0.0)},
                    description=(
                        f"Capillary blood oxygen saturation plummeted to {vitals.spo2:.1f}% "
                        f"with compensatory heart rate surge at {vitals.heart_rate:.0f} bpm. "
                        "Severe risk of cognitive impairment, syncope, and hypoxemic cellular distress."
                    ),
                    physiological_impact="Cerebral hypoperfusion, severe tissue desaturation, compensatory sympathetic overdrive.",
                    trigger_metrics={
                        "spo2": vitals.spo2,
                        "heart_rate": vitals.heart_rate,
                        "respiration_rate": vitals.respiration_rate
                    },
                    countermeasures=[
                        CountermeasureStep(
                            step_number=1,
                            title="O2 Mask Sealed & 100% FiO2 Delivery",
                            directive="Immediately seal Emergency Oxygen Mask (100% FiO2 at 12 L/min continuous positive pressure). Verify mask seal differential > 4.3 psi.",
                            subsystem="ECLSS-O2-EMERGENCY",
                            target_window_seconds=30,
                            requires_flight_director_signoff=False,
                            clinical_category="O2_DELIVERY"
                        ),
                        CountermeasureStep(
                            step_number=2,
                            title="ECLSS Scrubber / Regulator Valve Stage-2 Override",
                            directive="Issue manual solenoid command to ECLSS Primary O2 regulator valve line 4B. Purge EMU atmosphere loop.",
                            subsystem="ECLSS-VALVE-O2B",
                            target_window_seconds=60,
                            requires_flight_director_signoff=True,
                            clinical_category="ECLSS_OVERRIDE"
                        ),
                        CountermeasureStep(
                            step_number=3,
                            title="IV Fluid Saline Prep / Volume Expansion",
                            directive="Stage peripheral IV cannula and 500 mL normal saline (0.9% NaCl) bolus to combat hypoperfusion and preserve cardiac preload.",
                            subsystem="MED-PHARMA-INFUSION",
                            target_window_seconds=120,
                            requires_flight_director_signoff=False,
                            clinical_category="PHARMA_SALINE"
                        ),
                        CountermeasureStep(
                            step_number=4,
                            title="Restrict High-g Movement & Supine Perfusion Posture",
                            directive="Astronaut to cease all mechanical exertion and assume supine posture with lower limbs elevated to maximize cerebral oxygenation.",
                            subsystem="CREW-ERGONOMICS",
                            target_window_seconds=180,
                            requires_flight_director_signoff=False,
                            clinical_category="RESTRICT_MOVEMENT"
                        )
                    ],
                    protocol_code="NASA-FLIGHT-MED-ECLSS-09B",
                    timestamp=now_iso
                )
            )
        elif is_hypoxia_warn:
            anomalies.append(
                AnomalyRecord(
                    id=f"ANOM-HYPOXIA-WARN-{astro_id}",
                    anomaly_type="HYPOXIA",
                    title="MILD HYPOXIA / OXYGEN DRIFT",
                    severity=AnomalySeverity.WARNING,
                    confidence_score=0.74,
                    ml_confidence_pct=ml_confidence_pct,
                    primary_contributing_vector=primary_vector,
                    feature_contributions=feature_contributions,
                    z_scores={"spo2": z_scores.get("spo2", 0.0)},
                    description=f"SpO2 has drifted down to {vitals.spo2:.1f}%. Mild arterial desaturation detected.",
                    physiological_impact="Mild sub-threshold oxygenation reduction, subtle psychomotor slowing.",
                    trigger_metrics={"spo2": vitals.spo2},
                    countermeasures=[
                        CountermeasureStep(
                            step_number=1,
                            title="O2 Mask Inspection & Partial Pressure Boost",
                            directive="Verify environmental O2 partial pressure exceeds 21.0 kPa (158 mmHg). Stage emergency mask.",
                            subsystem="ECLSS-O2-INJECTOR",
                            target_window_seconds=90,
                            requires_flight_director_signoff=False,
                            clinical_category="O2_DELIVERY"
                        ),
                        CountermeasureStep(
                            step_number=2,
                            title="Restrict High-g Movement",
                            directive="Reduce crew metabolic demand; verify pulse oximeter optode skin contact.",
                            subsystem="BIOMETRIC-SENSOR-ARRAY",
                            target_window_seconds=120,
                            requires_flight_director_signoff=False,
                            clinical_category="RESTRICT_MOVEMENT"
                        )
                    ],
                    protocol_code="NASA-FLIGHT-MED-ECLSS-09A",
                    timestamp=now_iso
                )
            )

        # =========================================================================
        # 2. CARDIAC DECONDITIONING (Vagal withdrawal, low HRV RMSSD, tachycardia)
        # =========================================================================
        is_cardiac_crit = (
            vitals.hrv_rmssd <= THRESHOLDS["hrv_rmssd"]["critical_low"]
            and vitals.heart_rate >= 96.0
        )
        is_cardiac_warn = (
            vitals.hrv_rmssd <= THRESHOLDS["hrv_rmssd"]["warning_low"]
            or (vitals.hrv_rmssd <= 28.0 and z_scores.get("hrv_rmssd", 0) <= -2.2)
        )

        if is_cardiac_crit:
            conf_val = min(0.98, max(0.82, ml_confidence_pct / 100.0))
            anomalies.append(
                AnomalyRecord(
                    id=f"ANOM-CARDIO-DECOND-{astro_id}",
                    anomaly_type="CARDIAC_DECONDITIONING",
                    title="SEVERE CARDIAC DECONDITIONING / VAGAL SUPPRESSION",
                    severity=AnomalySeverity.CRITICAL,
                    confidence_score=round(conf_val, 3),
                    ml_confidence_pct=ml_confidence_pct,
                    primary_contributing_vector=primary_vector,
                    feature_contributions=feature_contributions,
                    z_scores={"hrv_rmssd": z_scores.get("hrv_rmssd", 0.0), "heart_rate": z_scores.get("heart_rate", 0.0)},
                    description=(
                        f"Heart rate variability RMSSD collapsed to {vitals.hrv_rmssd:.1f} ms "
                        f"alongside persistent resting tachycardia ({vitals.heart_rate:.0f} bpm). "
                        "Indicates marked parasympathetic withdrawal, microgravity baroreceptor deconditioning, "
                        "and severe orthostatic vulnerability."
                    ),
                    physiological_impact="Depleted cardiac autonomic buffer, increased ventricular ectopic irritability, orthostatic intolerance.",
                    trigger_metrics={
                        "hrv_rmssd": vitals.hrv_rmssd,
                        "heart_rate": vitals.heart_rate,
                        "systolic_bp": vitals.systolic_bp,
                        "diastolic_bp": vitals.diastolic_bp
                    },
                    countermeasures=[
                        CountermeasureStep(
                            step_number=1,
                            title="Activate Lower Body Negative Pressure (LBNP)",
                            directive="Secure crew member in LBNP chamber, initiate target suction differential at -35 mmHg for 20 minutes to draw blood cephalad to caudal.",
                            subsystem="MED-COUNTERMEASURE-LBNP",
                            target_window_seconds=120,
                            requires_flight_director_signoff=False,
                            clinical_category="ERGONOMICS"
                        ),
                        CountermeasureStep(
                            step_number=2,
                            title="IV Fluid Saline Prep / AstroLyte Rehydration",
                            directive="Administer 1.0 Liter oral electrolyte rehydration solution (AstroLyte Saline Formulation) or stage IV isotonic saline line.",
                            subsystem="MED-NUTRITION-FLUID",
                            target_window_seconds=300,
                            requires_flight_director_signoff=False,
                            clinical_category="PHARMA_SALINE"
                        ),
                        CountermeasureStep(
                            step_number=3,
                            title="Restrict High-g Movement & Dynamic Tilts",
                            directive="Restrict sudden postural angular accelerations; lock astronaut in recumbent restraint harness during vehicle burns.",
                            subsystem="CREW-SAFETY-H-G",
                            target_window_seconds=180,
                            requires_flight_director_signoff=False,
                            clinical_category="RESTRICT_MOVEMENT"
                        ),
                        CountermeasureStep(
                            step_number=4,
                            title="Prescribed CEVIS Resistive Ergometer Interval",
                            directive="Execute 30-minute high-resistance interval protocol on ARED / CEVIS at 75% VO2 peak following fluid loading.",
                            subsystem="EXERCISE-SYSTEM-CEVIS",
                            target_window_seconds=900,
                            requires_flight_director_signoff=True,
                            clinical_category="EXERCISE"
                        )
                    ],
                    protocol_code="NASA-HRP-CARDIO-DECOND-04",
                    timestamp=now_iso
                )
            )
        elif is_cardiac_warn:
            anomalies.append(
                AnomalyRecord(
                    id=f"ANOM-CARDIO-WARN-{astro_id}",
                    anomaly_type="CARDIAC_DECONDITIONING",
                    title="AUTONOMIC DYSREGULATION / REDUCED HRV",
                    severity=AnomalySeverity.WARNING,
                    confidence_score=0.76,
                    ml_confidence_pct=ml_confidence_pct,
                    primary_contributing_vector=primary_vector,
                    feature_contributions=feature_contributions,
                    z_scores={"hrv_rmssd": z_scores.get("hrv_rmssd", 0.0)},
                    description=(
                        f"HRV RMSSD decreased to {vitals.hrv_rmssd:.1f} ms. "
                        "Mild autonomic exhaustion and elevated sympathetic tone observed."
                    ),
                    physiological_impact="Decreased heart rate variability indicates cardiovascular fatigue or dehydration.",
                    trigger_metrics={"hrv_rmssd": vitals.hrv_rmssd, "heart_rate": vitals.heart_rate},
                    countermeasures=[
                        CountermeasureStep(
                            step_number=1,
                            title="Crew Hydration & Saline Protocol",
                            directive="Administer 500 mL electrolyte fluid intake and mandate 15-minute relaxation/paced breathing interval.",
                            subsystem="CREW-HEALTH-ROUTINE",
                            target_window_seconds=300,
                            requires_flight_director_signoff=False,
                            clinical_category="PHARMA_SALINE"
                        ),
                        CountermeasureStep(
                            step_number=2,
                            title="Restrict High-g Movement",
                            directive="Hold non-essential EVA transitions; verify CEVIS resistive logs.",
                            subsystem="EXERCISE-LOG-ANALYSIS",
                            target_window_seconds=600,
                            requires_flight_director_signoff=False,
                            clinical_category="RESTRICT_MOVEMENT"
                        )
                    ],
                    protocol_code="NASA-HRP-CARDIO-02",
                    timestamp=now_iso
                )
            )

        # =========================================================================
        # 3. HIGH CABIN CO2 / HYPERCAPNIA (LiOH canister failure, CDRA bed saturation)
        # =========================================================================
        is_co2_crit = (
            vitals.cabin_co2 >= THRESHOLDS["cabin_co2"]["critical_high"]
            or (vitals.cabin_co2 >= 2600.0 and vitals.respiration_rate >= 20.0)
            or (vitals.cabin_co2 >= 3000.0 and z_scores.get("cabin_co2", 0) >= 2.5)
        )
        is_co2_warn = vitals.cabin_co2 >= THRESHOLDS["cabin_co2"]["warning_high"]

        if is_co2_crit:
            conf_val = min(0.99, 0.88 + (vitals.cabin_co2 - 3200.0) * 0.0001)
            anomalies.append(
                AnomalyRecord(
                    id=f"ANOM-HYPERCAPNIA-{astro_id}",
                    anomaly_type="HYPERCAPNIA",
                    title="CRITICAL HYPERCAPNIA / ECLSS SCRUBBER FAILURE",
                    severity=AnomalySeverity.CRITICAL,
                    confidence_score=round(conf_val, 3),
                    ml_confidence_pct=ml_confidence_pct,
                    primary_contributing_vector=f"Toxic Cabin CO2 ({vitals.cabin_co2:.0f} ppm)",
                    feature_contributions=feature_contributions,
                    z_scores={"cabin_co2": z_scores.get("cabin_co2", 0.0), "respiration_rate": z_scores.get("respiration_rate", 0.0)},
                    description=(
                        f"Ambient Cabin CO2 level reached toxic threshold of {vitals.cabin_co2:.0f} ppm. "
                        f"Astronaut exhibiting compensatory tachypnea ({vitals.respiration_rate:.0f} br/min). "
                        "Severe risk of hypercapnic acidosis, acute throbbing cephalalgia, visual disturbance, "
                        "and cognitive impairment."
                    ),
                    physiological_impact="Respiratory acidosis, cerebral vasodilation, dyspnea, confusion, visual blur.",
                    trigger_metrics={
                        "cabin_co2": vitals.cabin_co2,
                        "respiration_rate": vitals.respiration_rate,
                        "heart_rate": vitals.heart_rate
                    },
                    countermeasures=[
                        CountermeasureStep(
                            step_number=1,
                            title="ECLSS Scrubber Valve Stage-2 Override",
                            directive="Issue manual cycle override command to Carbon Dioxide Removal Assembly (CDRA) desorbing valve Bed B.",
                            subsystem="ECLSS-CDRA-DESORB",
                            target_window_seconds=60,
                            requires_flight_director_signoff=True,
                            clinical_category="ECLSS_OVERRIDE"
                        ),
                        CountermeasureStep(
                            step_number=2,
                            title="Lithium Hydroxide (LiOH) Canister Insertion in Node 2",
                            directive="Crew to open Bay 2 auxiliary stowage, retrieve 2x fresh Lithium Hydroxide (LiOH) canisters, lock into Node 2 manifold.",
                            subsystem="ECLSS-LIOH-SCRUBBER",
                            target_window_seconds=180,
                            requires_flight_director_signoff=False,
                            clinical_category="ECLSS_OVERRIDE"
                        ),
                        CountermeasureStep(
                            step_number=3,
                            title="Maximize Cabin Atmosphere IMV Ventilation Fans",
                            directive="Engage inter-module ventilation (IMV) fans to 100% boost mode to eliminate localized stagnant CO2 pockets.",
                            subsystem="ECLSS-IMV-VENTILATION",
                            target_window_seconds=90,
                            requires_flight_director_signoff=False,
                            clinical_category="ECLSS_OVERRIDE"
                        ),
                        CountermeasureStep(
                            step_number=4,
                            title="Stage Portable Breathing Apparatus (PBA) & Restrict High-g Movement",
                            directive="Astronauts to keep Portable Breathing Apparatus (PBA) at immediate reach; minimize metabolic physical tasks.",
                            subsystem="CREW-SAFETY-PBA",
                            target_window_seconds=240,
                            requires_flight_director_signoff=False,
                            clinical_category="RESTRICT_MOVEMENT"
                        )
                    ],
                    protocol_code="NASA-ECLSS-HYPERCAPNIA-CDRA-02",
                    timestamp=now_iso
                )
            )
        elif is_co2_warn:
            anomalies.append(
                AnomalyRecord(
                    id=f"ANOM-HYPERCAPNIA-WARN-{astro_id}",
                    anomaly_type="HYPERCAPNIA",
                    title="ELEVATED CABIN CO2 / SCRUBBER DRIFT",
                    severity=AnomalySeverity.WARNING,
                    confidence_score=0.79,
                    ml_confidence_pct=ml_confidence_pct,
                    primary_contributing_vector=f"Cabin CO2 Drift ({vitals.cabin_co2:.0f} ppm)",
                    feature_contributions=feature_contributions,
                    z_scores={"cabin_co2": z_scores.get("cabin_co2", 0.0)},
                    description=(
                        f"Cabin CO2 has risen to {vitals.cabin_co2:.0f} ppm (nominal threshold < 1,000 ppm). "
                        "Early indication of ECLSS scrubber bed saturation."
                    ),
                    physiological_impact="Early headache, subtle fatigue, increased minute ventilation volume.",
                    trigger_metrics={"cabin_co2": vitals.cabin_co2, "respiration_rate": vitals.respiration_rate},
                    countermeasures=[
                        CountermeasureStep(
                            step_number=1,
                            title="ECLSS Scrubber Valve Stage-2 Check",
                            directive="Telemetry check on CDRA half-cycle selector valve telemetry and desorb heater temperature.",
                            subsystem="ECLSS-CDRA-DIAGNOSTIC",
                            target_window_seconds=180,
                            requires_flight_director_signoff=False,
                            clinical_category="ECLSS_OVERRIDE"
                        ),
                        CountermeasureStep(
                            step_number=2,
                            title="Restrict High-g Movement & Clear Vents",
                            directive="Verify diffuser vents in current compartment are free of debris or stowage bag obstruction.",
                            subsystem="HABITAT-DIFFUSER-CHECK",
                            target_window_seconds=300,
                            requires_flight_director_signoff=False,
                            clinical_category="RESTRICT_MOVEMENT"
                        )
                    ],
                    protocol_code="NASA-ECLSS-HYPERCAPNIA-CDRA-01",
                    timestamp=now_iso
                )
            )

        # =========================================================================
        # 4. CORE TEMPERATURE / HEAT STRESS EVALUATION
        # =========================================================================
        if vitals.core_temp >= THRESHOLDS["core_temp"]["critical_high"]:
            anomalies.append(
                AnomalyRecord(
                    id=f"ANOM-HEAT-STRESS-{astro_id}",
                    anomaly_type="HEAT_STRESS",
                    title="CRITICAL HYPERTHERMIA / LCVG FAILURE",
                    severity=AnomalySeverity.CRITICAL,
                    confidence_score=0.91,
                    ml_confidence_pct=ml_confidence_pct,
                    primary_contributing_vector=primary_vector,
                    feature_contributions=feature_contributions,
                    z_scores={"core_temp": z_scores.get("core_temp", 0.0)},
                    description=f"Astronaut core body temperature exceeded safety envelope at {vitals.core_temp:.2f}°C.",
                    physiological_impact="Impaired thermoregulation, heat exhaustion risk, delirium.",
                    trigger_metrics={"core_temp": vitals.core_temp},
                    countermeasures=[
                        CountermeasureStep(
                            step_number=1,
                            title="Liquid Cooling Garment (LCVG) Max Flow",
                            directive="Turn suit coolant control valve to MAXIMUM COLD (Loop 1 flow 100 kg/hr).",
                            subsystem="SUIT-LCVG-COOLING",
                            target_window_seconds=30,
                            requires_flight_director_signoff=False,
                            clinical_category="ERGONOMICS"
                        ),
                        CountermeasureStep(
                            step_number=2,
                            title="Restrict High-g Movement & Active Cooling",
                            directive="Cease physical EVA operations immediately; cool core with ice water garment loop.",
                            subsystem="CREW-SAFETY-THERMAL",
                            target_window_seconds=60,
                            requires_flight_director_signoff=False,
                            clinical_category="RESTRICT_MOVEMENT"
                        )
                    ],
                    protocol_code="NASA-EVA-THERMAL-01",
                    timestamp=now_iso
                )
            )

        # =========================================================================
        # Determine overall status
        # =========================================================================
        severities = [a.severity for a in anomalies]
        if AnomalySeverity.CRITICAL in severities:
            overall = AnomalySeverity.CRITICAL
        elif AnomalySeverity.WARNING in severities:
            overall = AnomalySeverity.WARNING
        elif AnomalySeverity.CAUTION in severities:
            overall = AnomalySeverity.CAUTION
        else:
            # Check if Edge ML flagged high anomaly confidence without explicit rule breach
            if ml_result["is_ml_anomaly"] and ml_confidence_pct >= 80.0:
                overall = AnomalySeverity.CAUTION
            else:
                overall = AnomalySeverity.NOMINAL

        ml_metadata = {
            "ml_confidence_pct": ml_confidence_pct,
            "primary_contributing_vector": primary_vector,
            "feature_contributions": feature_contributions,
        }

        return overall, anomalies, ml_metadata


# Global instance
anomaly_detector = AnomalyDetector(history_window_size=60)
