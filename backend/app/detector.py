"""AstroPulse Edge ML Detector Module.
Directly implements and exports the IsolationForest multivariate pipeline.
"""

from app.services.edge_ml import EdgeMLAnomalyDetector, edge_ml_detector

__all__ = ["EdgeMLAnomalyDetector", "edge_ml_detector"]
