"""
Unit tests for Co-movement correlation logic.
Covers hand-computed test cases per blueprint.md Section 18:
1. A device pair flagged for co-movement on >=2 distinct days
2. A device pair NOT flagged for a single same-day occurrence (present in weak evidence)
3. 15-minute window cutoff boundary precision
"""

from datetime import datetime, timezone
import pytest

from backend.app.ai.correlation.comovement import compute_comovement


def test_comovement_pair_flagged_on_two_distinct_days():
    """
    Device pair (DEV-1, DEV-2) pings at the same tower within 15 mins on two distinct days:
    - Day 1: 2026-08-30
    - Day 2: 2026-08-31
    -> Correctly FLAGGED in flagged_pairs.
    """
    tower_pings = [
        # Day 1: 2026-08-30 (diff = 10 mins at TOW-1)
        {"phone_hash": "DEV-1", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc)},
        {"phone_hash": "DEV-2", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 30, 10, 10, tzinfo=timezone.utc)},
        # Day 2: 2026-08-31 (diff = 5 mins at TOW-2)
        {"phone_hash": "DEV-1", "tower_id": "TOW-2", "timestamp": datetime(2026, 8, 31, 15, 0, tzinfo=timezone.utc)},
        {"phone_hash": "DEV-2", "tower_id": "TOW-2", "timestamp": datetime(2026, 8, 31, 15, 5, tzinfo=timezone.utc)},
    ]

    result = compute_comovement(tower_pings)

    flagged = result["flagged_pairs"]
    assert len(flagged) == 1
    pair = flagged[0]
    assert set(pair["device_pair"]) == {"DEV-1", "DEV-2"}
    assert pair["distinct_days_count"] == 2
    assert set(pair["days"]) == {"2026-08-30", "2026-08-31"}
    assert len(pair["events"]) == 2
    assert len(pair["evidence"]) == 2
    assert len(result["weak_evidence_pairs"]) == 0


def test_comovement_single_day_weak_evidence_not_flagged():
    """
    Device pair (DEV-A, DEV-B) pings at the same tower on only ONE calendar day:
    - 2026-08-31 (even if multiple times that same day)
    -> NOT in flagged_pairs, but present in weak_evidence_pairs.
    """
    tower_pings = [
        # Occurrence 1 on 2026-08-31 at TOW-1
        {"phone_hash": "DEV-A", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 10, 0, tzinfo=timezone.utc)},
        {"phone_hash": "DEV-B", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 10, 8, tzinfo=timezone.utc)},
        # Occurrence 2 on same day 2026-08-31 at TOW-2
        {"phone_hash": "DEV-A", "tower_id": "TOW-2", "timestamp": datetime(2026, 8, 31, 14, 0, tzinfo=timezone.utc)},
        {"phone_hash": "DEV-B", "tower_id": "TOW-2", "timestamp": datetime(2026, 8, 31, 14, 5, tzinfo=timezone.utc)},
    ]

    result = compute_comovement(tower_pings)

    assert len(result["flagged_pairs"]) == 0
    assert len(result["weak_evidence_pairs"]) == 1

    weak = result["weak_evidence_pairs"][0]
    assert set(weak["device_pair"]) == {"DEV-A", "DEV-B"}
    assert weak["distinct_days_count"] == 1
    assert weak["days"] == ["2026-08-31"]
    assert len(weak["events"]) == 2
    assert len(weak["evidence"]) == 2


def test_comovement_fifteen_minute_window_precision():
    """
    Checks that pings with delta <= 15 min are matched, and delta > 15 min are ignored.
    """
    tower_pings = [
        # Exactly 15 minutes apart -> Matched
        {"phone_hash": "DEV-1", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 10, 0, 0, tzinfo=timezone.utc)},
        {"phone_hash": "DEV-2", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 10, 15, 0, tzinfo=timezone.utc)},
        # 15 minutes and 1 second apart -> Ignored
        {"phone_hash": "DEV-3", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)},
        {"phone_hash": "DEV-4", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 12, 15, 1, tzinfo=timezone.utc)},
    ]

    result = compute_comovement(tower_pings)

    all_pairs = result["flagged_pairs"] + result["weak_evidence_pairs"]
    matched_pairs = [set(p["device_pair"]) for p in all_pairs]

    assert {"DEV-1", "DEV-2"} in matched_pairs
    assert {"DEV-3", "DEV-4"} not in matched_pairs
