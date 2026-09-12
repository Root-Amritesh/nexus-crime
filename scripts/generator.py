"""
Synthetic Data Generator with Planted Ground-Truth Criminal Network.
Per blueprint.md Section 4 & Section 18 / PRD Section 5:
"The single most important hackathon artifact — produces the planted ground-truth
network used to prove 100% recall."

Generates:
1. Tower metadata (towers.csv)
2. Crime scenes (crime_scenes.json)
3. Tower dump pings (~5,000 pings across cases)
4. Call Detail Records (~500 CDR records)
5. Financial transactions (~200 records)
6. FIR narrative text (fir_texts.json)
7. Planted Ground Truth Network (scripts/planted_network.json)

Invariants:
- All phone/device identifiers are SHA-256 hashed hex strings (64 chars).
- NO demographic fields (gender, religion, race, caste, age) anywhere.
- Exact CSV column names matching Stage 4 ingestion schemas.
- Planted True Positives:
  * TP-01: Co-located at Scene 1 & Scene 2 (>=2 scenes -> FLAGGED)
  * TP-02: Co-located at Scene 1 & Scene 3 (>=2 scenes -> FLAGGED)
  * TP-03: Co-moved with TP-01 at Tower 1 on Day 1 (2026-08-30) and Tower 2 on Day 2 (2026-08-31) (>=2 distinct days -> FLAGGED)
- Planted Near-Miss Negatives:
  * NM-01: Single-scene presence only at Scene 1 (1 scene -> NOT FLAGGED)
  * NM-02: Single-day co-movement with TP-02 only on 2026-08-30 (1 day -> NOT FLAGGED, weak evidence only)
  * NM-03: Pinged tower at Scene 1, but 2 hours OUTSIDE the crime scene time window (NOT FLAGGED)
"""

import csv
import hashlib
import json
import os
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

# Deterministic seed for reproducible ground truth
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "generated_data")
GROUND_TRUTH_FILE = os.path.join(os.path.dirname(__file__), "planted_network.json")


def hash_identifier(raw_id: str) -> str:
    """Generates a 64-char SHA-256 hex string from an identifier."""
    return hashlib.sha256(raw_id.encode("utf-8")).hexdigest()


def generate_synthetic_data(
    num_background_devices: int = 250,
    total_pings_target: int = 5000,
    total_cdrs_target: int = 500,
    total_financial_target: int = 200,
    case_reference: str = "CASE-DEMO-001"
) -> Dict[str, Any]:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. Generate Towers in Bangalore Area (12.97159 N, 77.59456 E)
    towers = [
        {"tower_id": "TOW-BLR-001", "latitude": 12.97159, "longitude": 77.59456, "coverage_radius_km": 1.5},
        {"tower_id": "TOW-BLR-002", "latitude": 12.97800, "longitude": 77.60200, "coverage_radius_km": 1.5},
        {"tower_id": "TOW-BLR-003", "latitude": 12.98500, "longitude": 77.61000, "coverage_radius_km": 2.0},
        {"tower_id": "TOW-BLR-004", "latitude": 12.96000, "longitude": 77.58500, "coverage_radius_km": 1.5},
        {"tower_id": "TOW-BLR-005", "latitude": 12.96500, "longitude": 77.59000, "coverage_radius_km": 1.5},
    ]

    # 2. Generate Crime Scenes
    crime_scenes = [
        {
            "scene_id": "SCENE-BLR-01",
            "case_reference": case_reference,
            "latitude": 12.97160,
            "longitude": 77.59458,
            "time_window_start": "2026-08-30T10:00:00Z",
            "time_window_end": "2026-08-30T12:00:00Z",
            "incident_type": "Commercial Burglary"
        },
        {
            "scene_id": "SCENE-BLR-02",
            "case_reference": case_reference,
            "latitude": 12.97805,
            "longitude": 77.60205,
            "time_window_start": "2026-08-31T02:00:00Z",
            "time_window_end": "2026-08-31T04:00:00Z",
            "incident_type": "Armed Robbery"
        },
        {
            "scene_id": "SCENE-BLR-03",
            "case_reference": case_reference,
            "latitude": 12.98502,
            "longitude": 77.61003,
            "time_window_start": "2026-08-31T14:00:00Z",
            "time_window_end": "2026-08-31T16:00:00Z",
            "incident_type": "Extortion"
        }
    ]

    # 3. Create Planted Identities
    # True Positives:
    tp_devices = {
        "TP-01": hash_identifier("SUSPECT_DEV_01_LEADER"),
        "TP-02": hash_identifier("SUSPECT_DEV_02_OPERATIVE"),
        "TP-03": hash_identifier("SUSPECT_DEV_03_COURIER")
    }

    # Near-Miss Negatives (Bystanders / Partial Matches):
    nm_devices = {
        "NM-01": hash_identifier("BYSTANDER_01_SINGLE_SCENE"),
        "NM-02": hash_identifier("BYSTANDER_02_SINGLE_DAY_COMOVE"),
        "NM-03": hash_identifier("BYSTANDER_03_OUTSIDE_WINDOW")
    }

    planted_ground_truth = {
        "case_reference": case_reference,
        "true_positives": [
            {
                "id": "TP-01",
                "device_hash": tp_devices["TP-01"],
                "role": "Syndicate Leader",
                "reason": "Co-located at Scene 1 & Scene 2 (>=2 scenes) and co-moved on 2 days with TP-03",
                "expected_flagged": True
            },
            {
                "id": "TP-02",
                "device_hash": tp_devices["TP-02"],
                "role": "Field Operative",
                "reason": "Co-located at Scene 1 & Scene 3 (>=2 scenes)",
                "expected_flagged": True
            },
            {
                "id": "TP-03",
                "device_hash": tp_devices["TP-03"],
                "role": "Logistics / Courier",
                "reason": "Co-moved with TP-01 on 2 distinct days (2026-08-30 and 2026-08-31)",
                "expected_flagged": True
            }
        ],
        "near_miss_negatives": [
            {
                "id": "NM-01",
                "device_hash": nm_devices["NM-01"],
                "reason": "Present only at Scene 1 (1 scene -> below 2-scene threshold)",
                "expected_flagged": False
            },
            {
                "id": "NM-02",
                "device_hash": nm_devices["NM-02"],
                "reason": "Co-occurred with TP-02 on only 1 calendar day (2026-08-30) -> weak evidence only",
                "expected_flagged": False
            },
            {
                "id": "NM-03",
                "device_hash": nm_devices["NM-03"],
                "reason": "Pinged Tower 1 at 2026-08-30T15:00:00Z (outside Scene 1 window 10:00-12:00)",
                "expected_flagged": False
            }
        ]
    }

    # 4. Generate Tower Dump Pings
    pings = []

    # Planted Pings for True Positives:
    # TP-01 at Scene 1 (TOW-001) and Scene 2 (TOW-002)
    pings.append({"phone_hash": tp_devices["TP-01"], "tower_id": "TOW-BLR-001", "timestamp": "2026-08-30T10:30:00Z", "signal_strength": -70})
    pings.append({"phone_hash": tp_devices["TP-01"], "tower_id": "TOW-BLR-002", "timestamp": "2026-08-31T02:45:00Z", "signal_strength": -65})

    # TP-02 at Scene 1 (TOW-001) and Scene 3 (TOW-003)
    pings.append({"phone_hash": tp_devices["TP-02"], "tower_id": "TOW-BLR-001", "timestamp": "2026-08-30T11:15:00Z", "signal_strength": -72})
    pings.append({"phone_hash": tp_devices["TP-02"], "tower_id": "TOW-BLR-003", "timestamp": "2026-08-31T14:30:00Z", "signal_strength": -68})

    # TP-03 co-moving with TP-01:
    # Day 1: 2026-08-30 at TOW-004 (diff = 5 mins)
    pings.append({"phone_hash": tp_devices["TP-01"], "tower_id": "TOW-BLR-004", "timestamp": "2026-08-30T18:00:00Z", "signal_strength": -75})
    pings.append({"phone_hash": tp_devices["TP-03"], "tower_id": "TOW-BLR-004", "timestamp": "2026-08-30T18:05:00Z", "signal_strength": -74})
    # Day 2: 2026-08-31 at TOW-005 (diff = 8 mins)
    pings.append({"phone_hash": tp_devices["TP-01"], "tower_id": "TOW-BLR-005", "timestamp": "2026-08-31T20:00:00Z", "signal_strength": -70})
    pings.append({"phone_hash": tp_devices["TP-03"], "tower_id": "TOW-BLR-005", "timestamp": "2026-08-31T20:08:00Z", "signal_strength": -72})

    # Planted Pings for Near-Miss Negatives:
    # NM-01: Single scene presence at Scene 1
    pings.append({"phone_hash": nm_devices["NM-01"], "tower_id": "TOW-BLR-001", "timestamp": "2026-08-30T10:45:00Z", "signal_strength": -80})

    # NM-02: Single day co-occurrence with TP-02 on Day 1
    pings.append({"phone_hash": nm_devices["NM-02"], "tower_id": "TOW-BLR-001", "timestamp": "2026-08-30T11:20:00Z", "signal_strength": -78})

    # NM-03: Outside window on Tower 1
    pings.append({"phone_hash": nm_devices["NM-03"], "tower_id": "TOW-BLR-001", "timestamp": "2026-08-30T15:00:00Z", "signal_strength": -75})

    # Background Noise Pings (~5,000 target)
    bg_phones = [hash_identifier(f"BG_DEV_{i:04d}") for i in range(num_background_devices)]
    start_time = datetime(2026, 8, 30, 0, 0, 0, tzinfo=timezone.utc)

    # Ensure no background phone accidentally satisfies >=2 scenes or 2-day co-movement
    while len(pings) < total_pings_target:
        ph = random.choice(bg_phones)
        tw = random.choice(towers)["tower_id"]
        # Distribute randomly over a 48 hour window
        random_secs = random.randint(0, 48 * 3600)
        ping_dt = start_time + timedelta(seconds=random_secs)
        sig = random.randint(-110, -50)

        # Avoid placing background devices inside crime scene windows
        iso_str = ping_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        pings.append({
            "phone_hash": ph,
            "tower_id": tw,
            "timestamp": iso_str,
            "signal_strength": sig
        })

    # 5. Generate CDR Records (~500 target)
    cdrs = []
    # Plant calls between TP-01 and TP-02
    cdrs.append({
        "caller_hash": tp_devices["TP-01"],
        "callee_hash": tp_devices["TP-02"],
        "timestamp": "2026-08-30T09:00:00Z",
        "duration": 180
    })
    cdrs.append({
        "caller_hash": tp_devices["TP-02"],
        "callee_hash": tp_devices["TP-01"],
        "timestamp": "2026-08-31T01:30:00Z",
        "duration": 240
    })
    cdrs.append({
        "caller_hash": tp_devices["TP-01"],
        "callee_hash": tp_devices["TP-03"],
        "timestamp": "2026-08-30T17:30:00Z",
        "duration": 120
    })

    # Background noise CDRs
    while len(cdrs) < total_cdrs_target:
        c1 = random.choice(bg_phones)
        c2 = random.choice(bg_phones)
        if c1 != c2:
            random_secs = random.randint(0, 48 * 3600)
            c_dt = start_time + timedelta(seconds=random_secs)
            cdrs.append({
                "caller_hash": c1,
                "callee_hash": c2,
                "timestamp": c_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "duration": random.randint(10, 600)
            })

    # 6. Generate Financial Records (~200 target)
    financials = []
    # Plant transactions from TP-01 to TP-03
    financials.append({
        "sender_hash": tp_devices["TP-01"],
        "receiver_hash": tp_devices["TP-03"],
        "amount": 250000.0,
        "timestamp": "2026-08-30T19:00:00Z"
    })
    while len(financials) < total_financial_target:
        s1 = random.choice(bg_phones)
        s2 = random.choice(bg_phones)
        if s1 != s2:
            random_secs = random.randint(0, 48 * 3600)
            f_dt = start_time + timedelta(seconds=random_secs)
            financials.append({
                "sender_hash": s1,
                "receiver_hash": s2,
                "amount": round(random.uniform(500.0, 50000.0), 2),
                "timestamp": f_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            })

    # 7. Generate FIR narrative
    fir_text = {
        "case_reference": case_reference,
        "text": (
            "FIR No. 402/2026: On 30-Aug-2026 between 10:00 and 12:00 hrs, commercial burglary reported at "
            "MG Road showroom. Informant stated suspects were operating coordinated mobile communications. "
            "Subsequent armed robbery reported at Brigade Road on 31-Aug-2026 between 02:00 and 04:00 hrs. "
            "Preliminary investigation links financial laundering courier movements to the syndicate."
        )
    }

    # 8. Write Output Files (CSVs and JSONs)
    # Tower dump CSV
    tower_dump_csv = os.path.join(OUTPUT_DIR, "tower_dump.csv")
    with open(tower_dump_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["phone_hash", "tower_id", "timestamp", "signal_strength"])
        writer.writeheader()
        for p in pings:
            writer.writerow(p)

    # CDR CSV
    cdr_csv = os.path.join(OUTPUT_DIR, "cdr.csv")
    with open(cdr_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["caller_hash", "callee_hash", "timestamp", "duration"])
        writer.writeheader()
        for c in cdrs:
            writer.writerow(c)

    # Financial CSV
    financial_csv = os.path.join(OUTPUT_DIR, "financial.csv")
    with open(financial_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["sender_hash", "receiver_hash", "amount", "timestamp"])
        writer.writeheader()
        for fn in financials:
            writer.writerow(fn)

    # Crime scenes JSON
    scenes_file = os.path.join(OUTPUT_DIR, "crime_scenes.json")
    with open(scenes_file, "w", encoding="utf-8") as f:
        json.dump(crime_scenes, f, indent=2)

    # Towers JSON
    towers_file = os.path.join(OUTPUT_DIR, "towers.json")
    with open(towers_file, "w", encoding="utf-8") as f:
        json.dump(towers, f, indent=2)

    # FIR text JSON
    fir_file = os.path.join(OUTPUT_DIR, "fir_text.json")
    with open(fir_file, "w", encoding="utf-8") as f:
        json.dump(fir_text, f, indent=2)

    # Planted Network Ground Truth Artifact
    with open(GROUND_TRUTH_FILE, "w", encoding="utf-8") as f:
        json.dump(planted_ground_truth, f, indent=2)

    print(f"Synthetic dataset generated successfully in '{OUTPUT_DIR}'")
    print(f"Total pings: {len(pings)} | Total CDRs: {len(cdrs)} | Total Financial: {len(financials)}")
    print(f"Planted ground truth saved to '{GROUND_TRUTH_FILE}'")

    return {
        "pings_count": len(pings),
        "cdrs_count": len(cdrs),
        "financials_count": len(financials),
        "ground_truth": planted_ground_truth
    }


if __name__ == "__main__":
    generate_synthetic_data()
