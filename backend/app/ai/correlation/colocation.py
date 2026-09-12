"""
Co-location correlation module.
Pure-ish functions callable independently of FastAPI per blueprint.md Section 24.

Rules and Assumptions:
1. Spatial Query:
   - For PostGIS geography/geometry queries, ST_DWithin calculates distance.
   - Assumption: When using ST_DWithin with EPSG:4326 geometry cast to geography, radius is in meters:
     radius_meters = coverage_radius_km * 1000.0.
   - For in-memory/fallback calculations (e.g. SQLite / unit tests), Haversine or Euclidean distance is used.
2. Time-Window Bounds:
   - Inclusive boundaries: time_window_start <= timestamp <= time_window_end per risk-formula.md 13.2.
3. Co-location Flagging:
   - A device is flagged as a co-location suspect iff it appears in >= 2 distinct scenes for the same case.
   - Single-scene presence is retained in the full data model/evidence list, but not flagged.
4. Robustness:
   - Missing tower metadata or invalid radius/coordinates -> skip tower, log warning, never crash the case.
   - Returns evidence-shaped records (tower_id, timestamp, scene_id) suitable for Stage 6 Neo4j ingestion.
"""

import logging
import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("nexus-crime.correlation.colocation")


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two points in kilometers.
    Used for in-memory / SQLite fallback distance calculations.
    """
    R = 6371.0  # Earth's mean radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def find_towers_for_scene_in_memory(
    scene_lat: float,
    scene_lon: float,
    towers: List[Dict[str, Any]]
) -> List[str]:
    """
    Filters towers whose coverage circle contains the scene location.
    Explicit Unit Assumption: coverage_radius_km is in kilometers; haversine returns km.
    Defensive checks:
    - Skip towers missing coordinates or with coverage_radius_km <= 0.
    """
    candidate_tower_ids = []
    for tower in towers:
        tower_id = tower.get("tower_id")
        lat = tower.get("latitude")
        lon = tower.get("longitude")
        radius_km = tower.get("coverage_radius_km")

        if not tower_id:
            continue

        # Defensive check: malformed / zero coverage radius or invalid coords (PRD Sec 29)
        if lat is None or lon is None or radius_km is None:
            logger.warning(f"Skipping tower {tower_id}: missing coordinates or radius")
            continue
        if radius_km <= 0 or not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
            logger.warning(f"Skipping tower {tower_id}: invalid coordinates ({lat}, {lon}) or radius {radius_km}")
            continue

        dist_km = haversine_distance_km(scene_lat, scene_lon, lat, lon)
        if dist_km <= radius_km:
            candidate_tower_ids.append(tower_id)

    return candidate_tower_ids


def compute_colocation(
    crime_scenes: List[Dict[str, Any]],
    towers: List[Dict[str, Any]],
    tower_pings: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Computes co-location correlation across crime scenes for a case.

    Parameters:
    - crime_scenes: List of dicts with:
        scene_id: str
        latitude: float
        longitude: float
        time_window_start: datetime
        time_window_end: datetime
    - towers: List of dicts with:
        tower_id: str
        latitude: float
        longitude: float
        coverage_radius_km: float
    - tower_pings: List of dicts with:
        phone_hash: str
        tower_id: str
        timestamp: datetime
        signal_strength: Optional[int]

    Returns:
    {
        "all_presences": [  # Full unflagged + flagged presence records
            {
                "phone_hash": str,
                "scene_id": str,
                "tower_id": str,
                "timestamp": str (ISO 8601),
                "signal_strength": int
            }
        ],
        "device_scene_map": {
            phone_hash: [scene_id_1, scene_id_2, ...]  # Distinct scenes per device
        },
        "flagged_devices": [
            {
                "phone_hash": str,
                "scene_count": int,
                "scenes": [str],
                "evidence": [
                    {
                        "type": "CO_LOCATED_AT",
                        "scene_id": str,
                        "tower_id": str,
                        "timestamp": str
                    }
                ]
            }
        ],
        "unflagged_devices": [
            {
                "phone_hash": str,
                "scene_count": int,
                "scenes": [str]
            }
        ]
    }
    """
    # Map scene_id to scene candidate towers
    scene_candidate_towers: Dict[str, Set[str]] = {}
    valid_scenes: Dict[str, Dict[str, Any]] = {}

    for scene in crime_scenes:
        scene_id = scene.get("scene_id")
        lat = scene.get("latitude")
        lon = scene.get("longitude")
        t_start = scene.get("time_window_start")
        t_end = scene.get("time_window_end")

        if not scene_id or lat is None or lon is None or not t_start or not t_end:
            logger.warning(f"Skipping crime scene {scene_id}: missing essential attributes")
            continue

        # Find all towers whose coverage radius encompasses this crime scene
        candidate_towers = set(find_towers_for_scene_in_memory(lat, lon, towers))
        scene_candidate_towers[scene_id] = candidate_towers
        valid_scenes[scene_id] = scene

    # Group pings by tower for fast lookup
    # Also evaluate scene intersection: Location AND Time Window matched TOGETHER
    all_presences: List[Dict[str, Any]] = []
    device_scene_pairs: Set[Tuple[str, str]] = set()
    device_evidence: Dict[str, List[Dict[str, Any]]] = {}

    for ping in tower_pings:
        phone_hash = ping.get("phone_hash")
        tower_id = ping.get("tower_id")
        ts = ping.get("timestamp")
        signal_strength = ping.get("signal_strength", 0)

        if not phone_hash or not tower_id or not ts:
            continue

        # Check against each crime scene
        for scene_id, scene in valid_scenes.items():
            candidate_towers = scene_candidate_towers[scene_id]
            # Spatial condition: tower is in candidate tower set
            if tower_id in candidate_towers:
                # Temporal condition: inclusive boundaries [time_window_start, time_window_end]
                # Ensures boundary timestamps (exact start or end) are included
                if scene["time_window_start"] <= ts <= scene["time_window_end"]:
                    ts_iso = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
                    presence_record = {
                        "phone_hash": phone_hash,
                        "scene_id": scene_id,
                        "tower_id": tower_id,
                        "timestamp": ts_iso,
                        "signal_strength": signal_strength,
                    }
                    all_presences.append(presence_record)
                    device_scene_pairs.add((phone_hash, scene_id))

                    if phone_hash not in device_evidence:
                        device_evidence[phone_hash] = []
                    device_evidence[phone_hash].append({
                        "type": "CO_LOCATED_AT",
                        "scene_id": scene_id,
                        "tower_id": tower_id,
                        "timestamp": ts_iso
                    })

    # Group distinct scenes per device
    device_scene_map: Dict[str, List[str]] = {}
    for phone_hash, scene_id in device_scene_pairs:
        if phone_hash not in device_scene_map:
            device_scene_map[phone_hash] = []
        device_scene_map[phone_hash].append(scene_id)

    flagged_devices: List[Dict[str, Any]] = []
    unflagged_devices: List[Dict[str, Any]] = []

    for phone_hash, scenes in device_scene_map.items():
        distinct_scenes = sorted(list(set(scenes)))
        scene_count = len(distinct_scenes)

        if scene_count >= 2:
            # Flagged suspect: present in >= 2 distinct scenes
            flagged_devices.append({
                "phone_hash": phone_hash,
                "scene_count": scene_count,
                "scenes": distinct_scenes,
                "evidence": device_evidence.get(phone_hash, [])
            })
        else:
            # Single-scene presence: retained in data model, but not flagged
            unflagged_devices.append({
                "phone_hash": phone_hash,
                "scene_count": scene_count,
                "scenes": distinct_scenes,
                "evidence": device_evidence.get(phone_hash, [])
            })

    return {
        "all_presences": all_presences,
        "device_scene_map": device_scene_map,
        "flagged_devices": flagged_devices,
        "unflagged_devices": unflagged_devices,
    }
