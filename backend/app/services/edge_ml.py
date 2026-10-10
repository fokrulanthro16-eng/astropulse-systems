"""On-Device Edge ML Pipeline for AstroPulse Systems.

Uses an IsolationForest ensemble combined with multi-metric Mahalanobis & standardized
deviation metrics to compute real-time multivariate anomaly scores, anomaly confidence (0-100%),
and identify primary contributing physiological vectors.
"""

from typing import Dict, Any, Tuple
import numpy as np
from sklearn.ensemble import IsolationForest


class EdgeMLAnomalyDetector:
    FEATURE_NAMES = [
        "heart_rate",
        "hrv_rmssd",
        "spo2",
        "respiration_rate",
        "core_temp"
    ]

    # Nominal baselines (mean, std) for normalization and attribution
    FEATURE_BASELINES = {
        "heart_rate": (68.0, 7.5),
        "hrv_rmssd": (55.0, 10.0),
        "spo2": (98.5, 0.8),
        "respiration_rate": (14.0, 1.8),
        "core_temp": (36.9, 0.25)
    }

    def __init__(self, contamination: float = 0.05, n_estimators: int = 100):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.model: IsolationForest = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=42,
            n_jobs=1
        )
        self._train_baseline_model()

    def _train_baseline_model(self):
        """Fit IsolationForest on synthetic nominal human spaceflight physiological manifold."""
        np.random.seed(42)
        n_samples = 1200
        
        # Generate nominal physiological covariance matrix
        hr = np.random.normal(68.0, 6.0, n_samples)
        # HRV is negatively coupled with HR
        hrv = 55.0 - (hr - 68.0) * 0.4 + np.random.normal(0, 5.0, n_samples)
        spo2 = np.clip(np.random.normal(98.6, 0.6, n_samples), 96.5, 100.0)
        resp = np.random.normal(14.0, 1.5, n_samples)
        temp = np.random.normal(36.9, 0.2, n_samples)

        X_train = np.column_stack([hr, hrv, spo2, resp, temp])
        self.model.fit(X_train)

    def evaluate(self, vitals_dict: Dict[str, float]) -> Dict[str, Any]:
        """
        Evaluate vector with on-device Edge ML.
        Returns confidence percentage (0-100%), anomaly flag, and primary contributing vector.
        """
        raw_vals = [
            vitals_dict.get(feat, self.FEATURE_BASELINES[feat][0])
            for feat in self.FEATURE_NAMES
        ]
        x_vec = np.array([raw_vals])

        # 1. Isolation Forest Decision Function
        # Decision function: negative values indicate outliers, positive indicate inliers.
        # Typically ranges from roughly -0.35 to +0.25
        score_raw = float(self.model.decision_function(x_vec)[0])
        pred = int(self.model.predict(x_vec)[0]) # -1 = anomaly, 1 = nominal

        # Calibrate decision score into anomaly probability / confidence (0% to 100%)
        # When score_raw < 0, probability escalates rapidly
        if score_raw < 0:
            # Outlier zone: map [-0.35, 0.0] -> [50.0%, 99.8%]
            scaled = min(1.0, max(0.0, abs(score_raw) / 0.28))
            confidence_pct = round(50.0 + scaled * 49.8, 1)
            is_anomaly = True
        else:
            # Inlier zone: map [0.0, 0.20] -> [2.0%, 48.0%]
            scaled = min(1.0, score_raw / 0.18)
            confidence_pct = round(max(1.5, 48.0 - scaled * 44.0), 1)
            is_anomaly = False

        # 2. Compute individual standardized deviations (Z-scores) to isolate primary vector
        z_deviations: Dict[str, float] = {}
        for feat in self.FEATURE_NAMES:
            val = vitals_dict.get(feat, self.FEATURE_BASELINES[feat][0])
            mean, std = self.FEATURE_BASELINES[feat]
            z = (val - mean) / std
            z_deviations[feat] = round(float(z), 2)

        # 3. Identify Primary Contributing Vector
        # Find the feature with largest absolute standardized deviation
        primary_feat = max(z_deviations.keys(), key=lambda k: abs(z_deviations[k]))
        max_z = z_deviations[primary_feat]

        feature_display_names = {
            "heart_rate": "Heart Rate Tachycardia" if max_z > 0 else "Heart Rate Bradycardia",
            "hrv_rmssd": "HRV Vagal Collapse" if max_z < 0 else "HRV Hyper-Variability",
            "spo2": "Arterial O₂ Desaturation (Hypoxia)" if max_z < 0 else "Oxygen Hyper-saturation",
            "respiration_rate": "Respiratory Tachypnea" if max_z > 0 else "Bradypnea",
            "core_temp": "Core Hyperthermia" if max_z > 0 else "Core Hypothermia"
        }

        # If all deviations are modest (< 1.5), mark nominal
        if abs(max_z) < 1.6 and not is_anomaly:
            primary_contributing_vector = "Nominal Homeostasis (All Vectors < 1.5 sigma)"
        else:
            primary_contributing_vector = f"{feature_display_names.get(primary_feat, primary_feat)} (Z = {max_z:+.1f} sigma)"

        # Relative feature contributions to the multivariate anomaly score
        total_abs_z = sum(abs(v) for v in z_deviations.values()) + 1e-5
        feature_contributions = {
            feat: round((abs(z) / total_abs_z) * 100.0, 1)
            for feat, z in z_deviations.items()
        }

        return {
            "is_ml_anomaly": is_anomaly or abs(max_z) >= 2.5,
            "ml_anomaly_score": round(min(1.0, confidence_pct / 100.0), 3),
            "ml_confidence_pct": confidence_pct,
            "primary_contributing_vector": primary_contributing_vector,
            "feature_z_scores": z_deviations,
            "feature_contributions": feature_contributions,
        }


# Global edge ML detector instance
edge_ml_detector = EdgeMLAnomalyDetector()
