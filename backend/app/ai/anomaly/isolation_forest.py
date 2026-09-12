"""
Isolation Forest / Statistical Outlier Anomaly Detection Signal.
Per blueprint.md Section 4 & Section 22.
"""

from typing import List, Dict, Any
import numpy as np


def detect_frequency_anomalies(
    feature_matrix: List[List[float]],
    contamination: float = 0.05
) -> List[float]:
    """
    Computes anomaly scores for input feature vectors.
    Uses statistical Z-score / IQR fallback if scikit-learn is not installed.
    """
    if not feature_matrix or len(feature_matrix) == 0:
        return []

    try:
        from sklearn.ensemble import IsolationForest
        clf = IsolationForest(contamination=contamination, random_state=42)
        clf.fit(feature_matrix)
        # Decision function: lower values -> more anomalous
        scores = clf.decision_function(feature_matrix)
        # Normalize to 0 (normal) to 1 (highly anomalous)
        min_s, max_s = scores.min(), scores.max()
        if max_s > min_s:
            return list((max_s - scores) / (max_s - min_s))
        return [0.0] * len(feature_matrix)
    except Exception:
        # Fallback to mean Euclidean deviation if sklearn is unavailable
        arr = np.array(feature_matrix)
        mean_vec = np.mean(arr, axis=0)
        dists = np.linalg.norm(arr - mean_vec, axis=1)
        max_d = np.max(dists) if len(dists) > 0 else 0
        if max_d > 0:
            return list(dists / max_d)
        return [0.0] * len(feature_matrix)
