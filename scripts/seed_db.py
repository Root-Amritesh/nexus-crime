"""
Database Seeding Script.
Per blueprint.md Section 4 & PRD Section 13:
Seeds metadata (towers, crime scenes, case) into PostgreSQL, and uploads
tower dumps, CDR, financial, and FIR text via HTTP endpoints to exercise
the complete real validation and background processing pipeline.
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Dict, Any
import httpx

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.db.postgres import SyncSessionLocal
from backend.app.models.case import Case
from backend.app.models.tower import Tower
from backend.app.models.crime_scene import CrimeScene
from scripts.generator import generate_synthetic_data, OUTPUT_DIR, GROUND_TRUTH_FILE

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")


def seed_metadata_directly(case_reference: str) -> None:
    """
    Seeds initial reference data: Case container, Towers, and CrimeScenes in Postgres.
    """
    print(f"Seeding base case and metadata for '{case_reference}' into PostgreSQL...")
    db: Session = SyncSessionLocal()
    try:
        # 1. Case
        existing_case = db.query(Case).filter(Case.case_reference == case_reference).first()
        if not existing_case:
            case_obj = Case(
                case_reference=case_reference,
                warrant_reference="WARR-DEMO-2026-BLR",
                investigator_id="INV-LEAD-001"
            )
            db.add(case_obj)
            db.flush()

        # 2. Towers
        towers_file = os.path.join(OUTPUT_DIR, "towers.json")
        if os.path.exists(towers_file):
            with open(towers_file, "r", encoding="utf-8") as f:
                towers_data = json.load(f)
            for tw in towers_data:
                existing_tw = db.query(Tower).filter(Tower.tower_id == tw["tower_id"]).first()
                if not existing_tw:
                    tw_obj = Tower(
                        tower_id=tw["tower_id"],
                        latitude=tw["latitude"],
                        longitude=tw["longitude"],
                        coverage_radius_km=tw["coverage_radius_km"],
                        geom=f"POINT({tw['longitude']} {tw['latitude']})"
                    )
                    db.add(tw_obj)

        # 3. Crime Scenes
        scenes_file = os.path.join(OUTPUT_DIR, "crime_scenes.json")
        if os.path.exists(scenes_file):
            with open(scenes_file, "r", encoding="utf-8") as f:
                scenes_data = json.load(f)
            for sc in scenes_data:
                existing_sc = db.query(CrimeScene).filter(CrimeScene.scene_id == sc["scene_id"]).first()
                if not existing_sc:
                    sc_obj = CrimeScene(
                        scene_id=sc["scene_id"],
                        case_reference=case_reference,
                        latitude=sc["latitude"],
                        longitude=sc["longitude"],
                        time_window_start=datetime.fromisoformat(sc["time_window_start"].replace("Z", "+00:00")),
                        time_window_end=datetime.fromisoformat(sc["time_window_end"].replace("Z", "+00:00")),
                        incident_type=sc["incident_type"],
                        geom=f"POINT({sc['longitude']} {sc['latitude']})"
                    )
                    db.add(sc_obj)

        db.commit()
        print("Base metadata seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding metadata: {e}")
        raise e
    finally:
        db.close()


def upload_datasets_via_api(case_reference: str, base_url: str = API_BASE_URL) -> Dict[str, Any]:
    """
    Uploads generated synthetic datasets via actual HTTP endpoints:
    - POST /upload/tower-dump (triggers background correlation -> graph -> analytics -> scoring)
    - POST /upload/cdr
    - POST /upload/financial
    - POST /upload/fir-text
    """
    print(f"Uploading datasets via REST API ({base_url}) for case '{case_reference}'...")
    results = {}

    with httpx.Client(base_url=base_url, timeout=30.0) as client:
        # 1. Tower dump upload
        tower_dump_csv = os.path.join(OUTPUT_DIR, "tower_dump.csv")
        with open(tower_dump_csv, "rb") as f:
            resp = client.post(
                "/upload/tower-dump",
                data={"case_reference": case_reference},
                files={"file": ("tower_dump.csv", f, "text/csv")}
            )
            print(f"Tower dump upload status: {resp.status_code} - {resp.text}")
            results["tower_dump"] = resp.json()

        # 2. CDR upload
        cdr_csv = os.path.join(OUTPUT_DIR, "cdr.csv")
        with open(cdr_csv, "rb") as f:
            resp = client.post(
                "/upload/cdr",
                data={"case_reference": case_reference},
                files={"file": ("cdr.csv", f, "text/csv")}
            )
            print(f"CDR upload status: {resp.status_code} - {resp.text}")
            results["cdr"] = resp.json()

        # 3. Financial upload
        fin_csv = os.path.join(OUTPUT_DIR, "financial.csv")
        with open(fin_csv, "rb") as f:
            resp = client.post(
                "/upload/financial",
                data={"case_reference": case_reference},
                files={"file": ("financial.csv", f, "text/csv")}
            )
            print(f"Financial upload status: {resp.status_code} - {resp.text}")
            results["financial"] = resp.json()

        # 4. FIR text upload
        fir_json = os.path.join(OUTPUT_DIR, "fir_text.json")
        with open(fir_json, "r", encoding="utf-8") as f:
            fir_data = json.load(f)
            resp = client.post(
                "/upload/fir-text",
                json=fir_data
            )
            print(f"FIR text upload status: {resp.status_code} - {resp.text}")
            results["fir_text"] = resp.json()

    print("All datasets uploaded via HTTP API successfully.")
    return results


def run_seeding_pipeline(case_reference: str = "CASE-DEMO-001", api_url: str = API_BASE_URL) -> None:
    # 1. Generate fresh synthetic data
    generate_synthetic_data(case_reference=case_reference)

    # 2. Seed metadata into Postgres
    seed_metadata_directly(case_reference=case_reference)

    # 3. Upload data via API
    upload_datasets_via_api(case_reference=case_reference, base_url=api_url)


if __name__ == "__main__":
    case_ref = sys.argv[1] if len(sys.argv) > 1 else "CASE-DEMO-001"
    run_seeding_pipeline(case_reference=case_ref)
