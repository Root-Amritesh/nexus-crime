"""
Unit tests for Risk Scoring Engine (risk_score.py).
Tests:
1. All four signals present -> exact formula match with hand-computed values.
2. One signal missing -> proportional reweighting math is exact.
3. All signals missing -> returns Sentinel (None), NOT 0.0.
4. min(count/cap, 1.0) capping behavior with count exceeding cap.
"""

import pytest
from backend.app.ai.scoring.risk_score import compute_suspect_risk_score

# Test weights: centrality=0.30, colocation=0.25, comovement=0.25, call_frequency=0.20, cap=5.0
TEST_WEIGHTS = {
    "centrality": 0.30,
    "colocation": 0.25,
    "comovement": 0.25,
    "call_frequency": 0.20,
    "cap": 5.0,
}


def test_risk_score_all_signals_present_exact_match():
    """
    Hand calculation:
    centrality_norm = 0.8
    colocation_count = 3 (3/5 = 0.6)
    comovement_count = 2 (2/5 = 0.4)
    call_freq_norm = 0.5
    
    score = (0.30 * 0.8) + (0.25 * 0.6) + (0.25 * 0.4) + (0.20 * 0.5)
          = 0.24 + 0.15 + 0.10 + 0.10
          = 0.5900
    """
    score, breakdown = compute_suspect_risk_score(
        centrality_normalized=0.8,
        colocation_count=3,
        comovement_count=2,
        call_frequency_normalized=0.5,
        weights_config=TEST_WEIGHTS
    )

    assert score == 0.5900
    assert breakdown["centrality"] == 0.8
    assert breakdown["colocation_count"] == 3
    assert breakdown["comovement_count"] == 2
    assert breakdown["call_frequency"] == 50


def test_risk_score_missing_signal_proportional_reweighting():
    """
    Test case with call_frequency missing (None):
    Available weights: centrality (0.30), colocation (0.25), comovement (0.25)
    Total available weight = 0.30 + 0.25 + 0.25 = 0.80
    
    Reweighted weights:
    w_centrality = 0.30 / 0.80 = 0.375
    w_colocation = 0.25 / 0.80 = 0.3125
    w_comovement = 0.25 / 0.80 = 0.3125
    
    Inputs:
    centrality_norm = 0.6
    colocation_count = 4 (4/5 = 0.8)
    comovement_count = 1 (1/5 = 0.2)
    
    score = (0.375 * 0.6) + (0.3125 * 0.8) + (0.3125 * 0.2)
          = 0.225 + 0.250 + 0.0625
          = 0.5375
    """
    score, breakdown = compute_suspect_risk_score(
        centrality_normalized=0.6,
        colocation_count=4,
        comovement_count=1,
        call_frequency_normalized=None,  # Missing
        weights_config=TEST_WEIGHTS
    )

    assert score == 0.5375
    assert breakdown["call_frequency"] == 0


def test_risk_score_all_signals_missing_returns_sentinel():
    """
    Non-negotiable rule: If all signals are missing, return Sentinel (None), NOT 0.0.
    """
    score, breakdown = compute_suspect_risk_score(
        centrality_normalized=None,
        colocation_count=None,
        comovement_count=None,
        call_frequency_normalized=None,
        weights_config=TEST_WEIGHTS
    )

    assert score is None  # MUST be None sentinel
    assert score != 0.0


def test_risk_score_capping_behavior():
    """
    Counts exceeding cap (cap=5.0) are capped at 1.0:
    colocation_count = 10 -> min(10/5, 1.0) = 1.0
    comovement_count = 8  -> min(8/5, 1.0) = 1.0
    centrality_norm = 1.0
    call_freq_norm = 1.0
    
    score = (0.30*1.0) + (0.25*1.0) + (0.25*1.0) + (0.20*1.0) = 1.0000
    """
    score, breakdown = compute_suspect_risk_score(
        centrality_normalized=1.0,
        colocation_count=10,  # Exceeds cap 5
        comovement_count=8,   # Exceeds cap 5
        call_frequency_normalized=1.0,
        weights_config=TEST_WEIGHTS
    )

    assert score == 1.0000
    assert breakdown["colocation_count"] == 10
    assert breakdown["comovement_count"] == 8
