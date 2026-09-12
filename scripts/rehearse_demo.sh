#!/usr/bin/env bash
# ==============================================================================
# NEXUS-CRIME End-to-End Demo Rehearsal & Latency KPI Validation
# Blueprint Section 4 & 27 / PRD Section 5 (KPI: < 30s latency, 100% recall)
# ==============================================================================

set -e

API_BASE_URL=${API_BASE_URL:-"http://localhost:8000/api/v1"}
CASE_ID="CASE-DEMO-001"
LATENCY_KPI_SECONDS=30

echo "========================================================================"
echo "          NEXUS-CRIME END-TO-END DEMO WALKTHROUGH & REHEARSAL           "
echo "========================================================================"
echo "Target Case Reference : ${CASE_ID}"
echo "API Base URL          : ${API_BASE_URL}"
echo "Latency KPI Target    : < ${LATENCY_KPI_SECONDS}s"
echo "========================================================================"

START_TIME=$(date +%s)

# 1. Health Check
echo -e "\n[1/6] Querying System Health (/health)..."
HEALTH_RESP=$(curl -s "${API_BASE_URL}/health")
echo "Health Response: ${HEALTH_RESP}"

# 2. Generate Synthetic Dataset & Plant Ground-Truth
echo -e "\n[2/6] Generating Synthetic Data (~5,000 pings, ~500 CDRs) with planted network..."
python scripts/generator.py

# 3. Seed Database & Trigger Background Pipeline via REST
echo -e "\n[3/6] Seeding Database & Ingesting Uploads via API..."
python scripts/seed_db.py "${CASE_ID}"

# 4. Validate Recall & Accuracy
echo -e "\n[4/6] Validating Recall against Planted Ground Truth..."
python scripts/validate_recall.py "${CASE_ID}"

# 5. Query All Core Investigation Endpoints
echo -e "\n[5/6] Querying Investigation Endpoints..."

echo -e "\n--- GET /cases/${CASE_ID}/suspects ---"
curl -s "${API_BASE_URL}/cases/${CASE_ID}/suspects" | head -c 500
echo -e "\n..."

echo -e "\n--- GET /cases/${CASE_ID}/graph ---"
curl -s "${API_BASE_URL}/cases/${CASE_ID}/graph" | head -c 500
echo -e "\n..."

echo -e "\n--- GET /cases/${CASE_ID}/map-data ---"
curl -s "${API_BASE_URL}/cases/${CASE_ID}/map-data" | head -c 500
echo -e "\n..."

# Fetch top suspect device hash for evidence demonstration
TOP_SUSPECT=$(curl -s "${API_BASE_URL}/cases/${CASE_ID}/suspects" | python -c "import sys, json; data=json.load(sys.stdin); print(data['suspects'][0]['device_hash']) if data.get('suspects') else print('')")
if [ -n "$TOP_SUSPECT" ]; then
    echo -e "\n--- GET /suspects/${TOP_SUSPECT}/evidence ---"
    curl -s "${API_BASE_URL}/suspects/${TOP_SUSPECT}/evidence" | head -c 500
    echo -e "\n..."
fi

# 6. Latency & KPI Evaluation
END_TIME=$(date +%s)
ELAPSED_TIME=$((END_TIME - START_TIME))

echo -e "\n========================================================================"
echo "                     END-TO-END DEMO SUMMARY REPORT                     "
echo "========================================================================"
echo "Total Execution Time : ${ELAPSED_TIME}s"
echo "Latency KPI Target   : ${LATENCY_KPI_SECONDS}s"

if [ ${ELAPSED_TIME} -le ${LATENCY_KPI_SECONDS} ]; then
    echo -e "LATENCY KPI STATUS   : \033[0;32mPASS (< 30s KPI met)\033[0m"
else
    echo -e "LATENCY KPI STATUS   : \033[0;31mFAIL (Exceeded 30s target)\033[0m"
fi
echo "========================================================================"
