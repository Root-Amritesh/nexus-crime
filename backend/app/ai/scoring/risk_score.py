"""
Pure-function Risk Scoring Engine.
Per non-negotiables.md and risk-formula.md Section 13.1 / PRD FR-07:
"risk score weights live in configs/risk_weights.yaml, NEVER hardcoded here."

Formula:
risk_score = (w_centrality * centrality_normalized)
           + (w_colocation * min(colocation_count / cap, 1.0))
           + (w_comovement * min(comovement_count / cap, 1.0))
           + (w_call_freq * call_frequency_with_flagged_normalized)

Default Config Defaults (loaded from yaml):
w_centrality: 0.30
w_colocation: 0.25
w_comovement: 0.25
w_call_freq: 0.20
cap: 5.0

Fallback/Reweighting Policy:
- If a signal is entirely unavailable (e.g. None), exclude its term and proportionally
  re-normalize remaining weights so the score stays on a comparable 0.0 - 1.0 scale.
- All-signals-missing edge case: returns (None, score_breakdown) sentinel.
  MUST NOT return 0.0. The caller will exclude the suspect with a logged warning.
"""

import os
import logging
from typing import Any, Dict, Optional, Tuple

from backend.app.config import settings

logger = logging.getLogger("nexus-crime.ai.scoring.risk_score")

DEFAULT_WEIGHTS = {
    "centrality": 0.30,
    "colocation": 0.25,
    "comovement": 0.25,
    "call_frequency": 0.20,
    "cap": 5.0,
}


def load_risk_weights(config_path: Optional[str] = None) -> Dict[str, float]:
    """
    Loads risk score weights from external YAML config file.
    """
    path = config_path or settings.RISK_WEIGHTS_PATH
    if os.path.exists(path):
        try:
            try:
                import yaml
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f) or {}
            except ImportError:
                data = {}
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and ":" in line:
                            k, v = line.split(":", 1)
                            data[k.strip()] = float(v.strip())

            return {
                "centrality": float(data.get("centrality", DEFAULT_WEIGHTS["centrality"])),
                "colocation": float(data.get("colocation", DEFAULT_WEIGHTS["colocation"])),
                "comovement": float(data.get("comovement", DEFAULT_WEIGHTS["comovement"])),
                "call_frequency": float(data.get("call_frequency", DEFAULT_WEIGHTS["call_frequency"])),
                "cap": float(data.get("cap", DEFAULT_WEIGHTS["cap"])),
            }
        except Exception as e:
            logger.warning(f"Error loading {path}: {e}. Using default weights.")
    return dict(DEFAULT_WEIGHTS)


def compute_suspect_risk_score(
    centrality_normalized: Optional[float],
    colocation_count: Optional[int],
    comovement_count: Optional[int],
    call_frequency_normalized: Optional[float],
    weights_config: Optional[Dict[str, float]] = None,
) -> Tuple[Optional[float], Dict[str, Any]]:
    """
    Pure function to compute risk score and breakdown for a single suspect.

    Inputs:
    - centrality_normalized: float in [0, 1] or None if graph analytics unavailable
    - colocation_count: int or None if no colocation analysis ran
    - comovement_count: int or None if no comovement analysis ran
    - call_frequency_normalized: float in [0, 1] or None if CDR data unavailable
    - weights_config: dict of weights from load_risk_weights()

    Returns:
    (risk_score, score_breakdown)
    - risk_score: float in [0.0, 1.0] rounded to 4 decimals, or None (Sentinel for all-signals-missing)
    - score_breakdown: {
        "centrality": float,
        "colocation_count": int,
        "comovement_count": int,
        "call_frequency": float
      }
    """
    cfg = weights_config or load_risk_weights()
    cap = float(cfg.get("cap", 5.0))

    # Determine availability of each signal
    available_signals = {}
    signal_values = {}

    if centrality_normalized is not None:
        available_signals["centrality"] = float(cfg["centrality"])
        signal_values["centrality"] = max(0.0, min(1.0, float(centrality_normalized)))

    if colocation_count is not None:
        available_signals["colocation"] = float(cfg["colocation"])
        # min(colocation_count / cap, 1.0)
        signal_values["colocation"] = min(max(0, colocation_count) / cap, 1.0)

    if comovement_count is not None:
        available_signals["comovement"] = float(cfg["comovement"])
        # min(comovement_count / cap, 1.0)
        signal_values["comovement"] = min(max(0, comovement_count) / cap, 1.0)

    if call_frequency_normalized is not None:
        available_signals["call_frequency"] = float(cfg["call_frequency"])
        signal_values["call_frequency"] = max(0.0, min(1.0, float(call_frequency_normalized)))

    # Edge Case: All signals missing -> return Sentinel (None, not 0.0)
    if not available_signals:
        breakdown = {
            "centrality": 0.0,
            "colocation_count": 0,
            "comovement_count": 0,
            "call_frequency": 0,
        }
        return None, breakdown

    # Fallback / Reweighting Math:
    # If a signal is missing, re-normalize available weights proportionally
    total_available_weight = sum(available_signals.values())

    if total_available_weight == 0.0:
        return None, {
            "centrality": 0.0,
            "colocation_count": 0,
            "comovement_count": 0,
            "call_frequency": 0,
        }

    raw_score = 0.0
    for signal_name, base_weight in available_signals.items():
        reweighted_weight = base_weight / total_available_weight
        val = signal_values[signal_name]
        raw_score += reweighted_weight * val

    final_score = round(max(0.0, min(1.0, raw_score)), 4)

    score_breakdown = {
        "centrality": round(centrality_normalized if centrality_normalized is not None else 0.0, 4),
        "colocation_count": colocation_count if colocation_count is not None else 0,
        "comovement_count": comovement_count if comovement_count is not None else 0,
        "call_frequency": int(call_frequency_normalized * 100) if call_frequency_normalized is not None else 0,
    }

    return final_score, score_breakdown
