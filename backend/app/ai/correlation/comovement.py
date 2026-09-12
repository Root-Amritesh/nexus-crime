"""
Co-movement correlation module.
Pure-ish functions callable independently of FastAPI per blueprint.md Section 24.

Rules and Assumptions:
1. Timeline Construction:
   - For each device, build chronological timeline of tower pings.
2. Co-occurrence Detection:
   - For each device pair (D1, D2), detect same-tower co-occurrence within a +/- 15-minute window
     per risk-formula.md Section 13.3.
3. Co-movement Flagging Rule:
   - Flag a pair iff same-tower co-occurrence occurs on >= 2 distinct calendar days.
   - Same-tower co-occurrence on only 1 calendar day is classified and returned as "weak evidence",
     retained in the output structure but NOT flagged.
4. Complexity Note:
   - Comparing all pairs of devices across all pings is O(devices^2 * pings_per_device) in naive form.
   - Complexity is acceptable at hackathon data volumes (~5,000 pings across case scope).
   - In production or high-volume environments, spatial indexing or bucketing by (tower_id, 15-min-time-bucket)
     would be applied.
5. Sparse-Ping Limitation (PRD Section 29):
   - Devices with low ping frequencies or power-saving modes may fail to produce overlapping pings
     even if physically co-moving, resulting in false negatives.
   - In accordance with project specifications, we document this limitation and do not interpolate
     or guess missing locations.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Set, Tuple

logger = logging.getLogger("nexus-crime.correlation.comovement")

CO_OCCURRENCE_WINDOW_MINUTES = 15


def compute_comovement(
    tower_pings: List[Dict[str, Any]],
    window_minutes: int = CO_OCCURRENCE_WINDOW_MINUTES
) -> Dict[str, Any]:
    """
    Computes co-movement correlations across all device pairs.

    Parameters:
    - tower_pings: List of dicts with:
        phone_hash: str
        tower_id: str
        timestamp: datetime or ISO str

    Returns:
    {
        "flagged_pairs": [
            {
                "device_pair": [phone_a, phone_b],
                "distinct_days_count": int,
                "days": [str (YYYY-MM-DD)],
                "events": [
                    {
                        "tower_id": str,
                        "timestamp_a": str,
                        "timestamp_b": str,
                        "time_delta_seconds": float
                    }
                ],
                "evidence": [...]
            }
        ],
        "weak_evidence_pairs": [  # Single calendar day co-occurrences
            {
                "device_pair": [phone_a, phone_b],
                "distinct_days_count": 1,
                "days": [str (YYYY-MM-DD)],
                "events": [...],
                "evidence": [...]
            }
        ],
        "sparse_ping_notice": "Documented limitation: Sparse ping devices may yield false negatives; no interpolation applied."
    }
    """
    # Document sparse ping limitation in logger
    logger.info("Computing co-movement. Limitation: Sparse pings produce false negatives without artificial interpolation.")

    # 1. Parse and organize pings by tower_id for efficient co-occurrence scanning
    # tower_pings_by_tower: tower_id -> list of (timestamp, phone_hash)
    tower_pings_by_tower: Dict[str, List[Tuple[datetime, str]]] = {}

    for ping in tower_pings:
        phone_hash = ping.get("phone_hash")
        tower_id = ping.get("tower_id")
        ts = ping.get("timestamp")

        if not phone_hash or not tower_id or not ts:
            continue

        if isinstance(ts, str):
            # Parse ISO string if needed
            ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        else:
            ts_dt = ts

        if tower_id not in tower_pings_by_tower:
            tower_pings_by_tower[tower_id] = []
        tower_pings_by_tower[tower_id].append((ts_dt, phone_hash))

    # Sort pings at each tower by timestamp
    for tower_id in tower_pings_by_tower:
        tower_pings_by_tower[tower_id].sort(key=lambda x: x[0])

    # 2. Find all same-tower co-occurrences within +/- window_minutes
    # Map normalized pair (min(p1, p2), max(p1, p2)) -> list of co-movement event dicts
    pair_events: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    time_window = timedelta(minutes=window_minutes)

    for tower_id, pings in tower_pings_by_tower.items():
        n = len(pings)
        for i in range(n):
            ts_a, phone_a = pings[i]
            for j in range(i + 1, n):
                ts_b, phone_b = pings[j]

                # If timestamp difference exceeds the window, break inner loop since list is sorted
                if ts_b - ts_a > time_window:
                    break

                # Exclude self-matches
                if phone_a == phone_b:
                    continue

                pair_key = (min(phone_a, phone_b), max(phone_a, phone_b))
                if pair_key not in pair_events:
                    pair_events[pair_key] = []

                delta_sec = abs((ts_b - ts_a).total_seconds())
                pair_events[pair_key].append({
                    "tower_id": tower_id,
                    "timestamp_a": ts_a.isoformat(),
                    "timestamp_b": ts_b.isoformat(),
                    "calendar_day": ts_a.date().isoformat(),
                    "time_delta_seconds": delta_sec
                })

    # 3. Classify pairs based on distinct calendar days
    flagged_pairs: List[Dict[str, Any]] = []
    weak_evidence_pairs: List[Dict[str, Any]] = []

    for pair_key, events in pair_events.items():
        # Get unique calendar days
        distinct_days = sorted(list(set(e["calendar_day"] for e in events)))
        distinct_days_count = len(distinct_days)

        # Build evidence payloads suitable for Stage 6 Neo4j graph edge creation
        evidence_list = [
            {
                "type": "CO_MOVED_WITH",
                "tower_id": e["tower_id"],
                "timestamp": e["timestamp_a"],
                "timestamp_peer": e["timestamp_b"],
                "time_delta_seconds": e["time_delta_seconds"]
            }
            for e in events
        ]

        pair_summary = {
            "device_pair": [pair_key[0], pair_key[1]],
            "distinct_days_count": distinct_days_count,
            "days": distinct_days,
            "events": events,
            "evidence": evidence_list
        }

        if distinct_days_count >= 2:
            # Flagged: occurs on >= 2 distinct calendar days
            flagged_pairs.append(pair_summary)
        else:
            # Weak evidence: single calendar day occurrence, retained in output
            weak_evidence_pairs.append(pair_summary)

    return {
        "flagged_pairs": flagged_pairs,
        "weak_evidence_pairs": weak_evidence_pairs,
        "sparse_ping_notice": "Documented limitation: Sparse ping devices may yield false negatives; no interpolation applied."
    }
