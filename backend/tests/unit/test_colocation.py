"""
Unit tests for Co-location correlation logic.
Covers hand-computed test cases per blueprint.md Section 18:
1. A device correctly flagged at >=2 scenes
2. A device correctly NOT flagged at exactly 1 scene (unflagged data retained)
3. A boundary-timestamp ping correctly included (inclusive edge handling)
4. A missing-tower-metadata case that skips cleanly and doesn't crash the run
"""

from datetime import datetime, timezone
import pytest

from backend.app.ai.correlation.colocation import compute_colocation


def test_colocation_device_flagged_at_two_scenes():
    """
    Device 'DEV-A' is present at both Scene 1 and Scene 2 -> Flagged.
    """
    crime_scenes = [
        {
            "scene_id": "SCENE-1",
            "latitude": 12.97159,
            "longitude": 77.59456,
            "time_window_start": datetime(2026, 8, 31, 10, 0, tzinfo=timezone.utc),
            "time_window_end": datetime(2026, 8, 31, 12, 0, tzinfo=timezone.utc),
        },
        {
            "scene_id": "SCENE-2",
            "latitude": 12.97500,
            "longitude": 77.59800,
            "time_window_start": datetime(2026, 8, 31, 14, 0, tzinfo=timezone.utc),
            "time_window_end": datetime(2026, 8, 31, 16, 0, tzinfo=timezone.utc),
        }
    ]

    towers = [
        {"tower_id": "TOW-1", "latitude": 12.97159, "longitude": 77.59456, "coverage_radius_km": 1.0},
        {"tower_id": "TOW-2", "latitude": 12.97500, "longitude": 77.59800, "coverage_radius_km": 1.0},
    ]

    tower_pings = [
        # DEV-A at Scene 1
        {"phone_hash": "DEV-A", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 10, 30, tzinfo=timezone.utc)},
        # DEV-A at Scene 2
        {"phone_hash": "DEV-A", "tower_id": "TOW-2", "timestamp": datetime(2026, 8, 31, 14, 30, tzinfo=timezone.utc)},
    ]

    result = compute_colocation(crime_scenes, towers, tower_pings)

    flagged = result["flagged_devices"]
    assert len(flagged) == 1
    assert flagged[0]["phone_hash"] == "DEV-A"
    assert flagged[0]["scene_count"] == 2
    assert set(flagged[0]["scenes"]) == {"SCENE-1", "SCENE-2"}
    assert len(flagged[0]["evidence"]) == 2


def test_colocation_device_not_flagged_at_single_scene():
    """
    Device 'DEV-B' is present at Scene 1 only -> NOT flagged, but retained in unflagged list.
    """
    crime_scenes = [
        {
            "scene_id": "SCENE-1",
            "latitude": 12.97159,
            "longitude": 77.59456,
            "time_window_start": datetime(2026, 8, 31, 10, 0, tzinfo=timezone.utc),
            "time_window_end": datetime(2026, 8, 31, 12, 0, tzinfo=timezone.utc),
        },
        {
            "scene_id": "SCENE-2",
            "latitude": 13.08268,
            "longitude": 80.27071,
            "time_window_start": datetime(2026, 8, 31, 14, 0, tzinfo=timezone.utc),
            "time_window_end": datetime(2026, 8, 31, 16, 0, tzinfo=timezone.utc),
        }
    ]

    towers = [
        {"tower_id": "TOW-1", "latitude": 12.97159, "longitude": 77.59456, "coverage_radius_km": 1.0},
        {"tower_id": "TOW-2", "latitude": 13.08268, "longitude": 80.27071, "coverage_radius_km": 1.0},
    ]

    tower_pings = [
        {"phone_hash": "DEV-B", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 11, 0, tzinfo=timezone.utc)},
    ]

    result = compute_colocation(crime_scenes, towers, tower_pings)

    assert len(result["flagged_devices"]) == 0
    assert len(result["unflagged_devices"]) == 1
    assert result["unflagged_devices"][0]["phone_hash"] == "DEV-B"
    assert result["unflagged_devices"][0]["scene_count"] == 1
    assert len(result["all_presences"]) == 1


def test_colocation_boundary_timestamp_ping_included():
    """
    Pings at exact time_window_start and time_window_end must be included (inclusive bounds).
    """
    start_ts = datetime(2026, 8, 31, 10, 0, 0, tzinfo=timezone.utc)
    end_ts = datetime(2026, 8, 31, 12, 0, 0, tzinfo=timezone.utc)

    crime_scenes = [
        {
            "scene_id": "SCENE-1",
            "latitude": 12.97159,
            "longitude": 77.59456,
            "time_window_start": start_ts,
            "time_window_end": end_ts,
        }
    ]

    towers = [
        {"tower_id": "TOW-1", "latitude": 12.97159, "longitude": 77.59456, "coverage_radius_km": 1.0},
    ]

    tower_pings = [
        # Exactly at start boundary
        {"phone_hash": "DEV-START", "tower_id": "TOW-1", "timestamp": start_ts},
        # Exactly at end boundary
        {"phone_hash": "DEV-END", "tower_id": "TOW-1", "timestamp": end_ts},
        # Outside boundaries
        {"phone_hash": "DEV-OUT", "tower_id": "TOW-1", "timestamp": datetime(2026, 8, 31, 9, 59, 59, tzinfo=timezone.utc)},
    ]

    result = compute_colocation(crime_scenes, towers, tower_pings)
    phones_present = {p["phone_hash"] for p in result["all_presences"]}

    assert "DEV-START" in phones_present
    assert "DEV-END" in phones_present
    assert "DEV-OUT" not in phones_present


def test_colocation_missing_tower_metadata_does_not_crash():
    """
    Towers with missing lat/lon, invalid radius <= 0, or missing attributes are skipped without crashing.
    """
    crime_scenes = [
        {
            "scene_id": "SCENE-1",
            "latitude": 12.97159,
            "longitude": 77.59456,
            "time_window_start": datetime(2026, 8, 31, 10, 0, tzinfo=timezone.utc),
            "time_window_end": datetime(2026, 8, 31, 12, 0, tzinfo=timezone.utc),
        }
    ]

    towers = [
        {"tower_id": "TOW-VALID", "latitude": 12.97159, "longitude": 77.59456, "coverage_radius_km": 1.0},
        {"tower_id": "TOW-BAD-COORDS", "latitude": None, "longitude": 77.59456, "coverage_radius_km": 1.0},
        {"tower_id": "TOW-ZERO-RADIUS", "latitude": 12.97159, "longitude": 77.59456, "coverage_radius_km": 0.0},
    ]

    tower_pings = [
        {"phone_hash": "DEV-1", "tower_id": "TOW-VALID", "timestamp": datetime(2026, 8, 31, 10, 30, tzinfo=timezone.utc)},
        {"phone_hash": "DEV-2", "tower_id": "TOW-BAD-COORDS", "timestamp": datetime(2026, 8, 31, 10, 30, tzinfo=timezone.utc)},
        {"phone_hash": "DEV-3", "tower_id": "TOW-ZERO-RADIUS", "timestamp": datetime(2026, 8, 31, 10, 30, tzinfo=timezone.utc)},
    ]

    result = compute_colocation(crime_scenes, towers, tower_pings)

    # Only DEV-1 matches the valid tower
    phones_present = {p["phone_hash"] for p in result["all_presences"]}
    assert "DEV-1" in phones_present
    assert "DEV-2" not in phones_present
    assert "DEV-3" not in phones_present
