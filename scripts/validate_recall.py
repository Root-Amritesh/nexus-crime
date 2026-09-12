"""
Recall Validation Script.
Per blueprint.md Section 18 & PRD Section 5:
"Asserts 100% recall against the planted ground-truth criminal network."

Reads scripts/planted_network.json, queries GET /cases/{case_id}/suspects,
and verifies:
1. True Positive Recall = 100%: All planted true-positive suspects are flagged.
2. Near-Miss Specificity: None of the planted near-miss negative devices are flagged.
3. Exits with non-zero code if recall is < 100% or false positives occur.
"""

import json
import os
import sys
import time
import httpx

from scripts.generator import GROUND_TRUTH_FILE

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")
MAX_POLL_RETRIES = 15
POLL_INTERVAL_SECONDS = 2


def validate_case_recall(
    case_reference: str = "CASE-DEMO-001",
    api_url: str = API_BASE_URL,
    ground_truth_file: str = GROUND_TRUTH_FILE
) -> bool:
    if not os.path.exists(ground_truth_file):
        print(f"ERROR: Ground truth file '{ground_truth_file}' not found. Run generator.py first.")
        sys.exit(1)

    with open(ground_truth_file, "r", encoding="utf-8") as f:
        ground_truth = json.load(f)

    true_positives = ground_truth.get("true_positives", [])
    near_miss_negatives = ground_truth.get("near_miss_negatives", [])

    expected_tp_hashes = {tp["device_hash"]: tp for tp in true_positives}
    expected_nm_hashes = {nm["device_hash"]: nm for nm in near_miss_negatives}

    print(f"\n=======================================================")
    print(f"VALIDATING RECALL FOR CASE: {case_reference}")
    print(f"Target True Positives to recover: {len(expected_tp_hashes)}")
    print(f"Target Near-Miss Negatives to exclude: {len(expected_nm_hashes)}")
    print(f"=======================================================\n")

    suspects_data = []
    with httpx.Client(base_url=api_url, timeout=10.0) as client:
        # Poll GET /cases/{case_id}/suspects until pipeline output is available
        for attempt in range(1, MAX_POLL_RETRIES + 1):
            try:
                resp = client.get(f"/cases/{case_reference}/suspects")
                if resp.status_code == 200:
                    resp_json = resp.json()
                    suspects_data = resp_json.get("suspects", [])
                    if suspects_data:
                        print(f"Received {len(suspects_data)} scored suspects from API on attempt {attempt}.")
                        break
            except Exception as e:
                print(f"Attempt {attempt}: API query failed ({e}). Retrying in {POLL_INTERVAL_SECONDS}s...")

            time.sleep(POLL_INTERVAL_SECONDS)

    if not suspects_data:
        print(f"FAILURE: No suspects returned by API after {MAX_POLL_RETRIES * POLL_INTERVAL_SECONDS}s.")
        sys.exit(1)

    flagged_hashes = {s["device_hash"]: s for s in suspects_data}

    # 1. Evaluate True Positives (Recall)
    recovered_tps = []
    missed_tps = []

    for ph, tp_info in expected_tp_hashes.items():
        if ph in flagged_hashes:
            recovered_tps.append(tp_info)
            actual_score = flagged_hashes[ph]["risk_score"]
            print(f"[RECOVERED TP] {tp_info['id']} ({tp_info['role']}) - Score: {actual_score:.4f} | Hash: {ph[:12]}...")
        else:
            missed_tps.append(tp_info)
            print(f"[MISSED TP]    {tp_info['id']} ({tp_info['role']}) - Reason: {tp_info['reason']} | Hash: {ph[:12]}...")

    recall_pct = (len(recovered_tps) / len(expected_tp_hashes)) * 100.0 if expected_tp_hashes else 0.0

    # 2. Evaluate Near-Miss Negatives (False Positive Resistance)
    correctly_excluded_nms = []
    falsely_flagged_nms = []

    for ph, nm_info in expected_nm_hashes.items():
        if ph not in flagged_hashes:
            correctly_excluded_nms.append(nm_info)
            print(f"[CORRECTLY EXCLUDED] {nm_info['id']} (Near-Miss) - {nm_info['reason']}")
        else:
            falsely_flagged_nms.append(nm_info)
            print(f"[FALSE POSITIVE]     {nm_info['id']} was erroneously flagged!")

    # Summary Report
    print("\n----------------- RECALL & ACCURACY REPORT -----------------")
    print(f"True Positives Recovered: {len(recovered_tps)} / {len(expected_tp_hashes)} ({recall_pct:.1f}%)")
    print(f"Near-Miss Negatives Excluded: {len(correctly_excluded_nms)} / {len(expected_nm_hashes)}")
    print(f"False Positives in Near-Misses: {len(falsely_flagged_nms)}")

    if recall_pct == 100.0 and len(falsely_flagged_nms) == 0:
        print("\n>>> VALIDATION RESULT: PASS (100% RECALL ACHIEVED, 0 FALSE POSITIVES) <<<\n")
        return True
    else:
        print("\n>>> VALIDATION RESULT: FAIL <<<\n")
        sys.exit(1)


if __name__ == "__main__":
    case_ref = sys.argv[1] if len(sys.argv) > 1 else "CASE-DEMO-001"
    validate_case_recall(case_reference=case_ref)
