# NEXUS-CRIME

AI-Powered Criminal Network Analysis System — SIH Problem Statement 189.

## Overview
NEXUS-CRIME correlates fragmented law-enforcement data (cell tower dumps, CDRs, financial records, FIR text) into a single relationship graph, scores suspects via transparent weighted formulas, and presents explainable evidence trails to investigators.

## Quick Start (Docker)

1. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
2. **Start Services**:
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```
3. **Generate Synthetic Data & Seed Ground Truth**:
   ```bash
   # Generate ~5,000 pings & ~500 CDRs with planted recoverable ground truth
   python scripts/generator.py

   # Ingest via REST endpoints and trigger background correlation & graph pipeline
   python scripts/seed_db.py CASE-DEMO-001
   ```
4. **Validate 100% Recall KPI**:
   ```bash
   # Asserts 100% recall on planted true positives & 0% near-miss false positives
   python scripts/validate_recall.py CASE-DEMO-001
   ```
5. **Run End-to-End Walkthrough & Rehearsal**:
   ```bash
   # Automated demo walkthrough with <30s latency KPI verification
   bash scripts/rehearse_demo.sh
   ```
6. **Access Applications**:
   - Frontend UI: `http://localhost:5173`
   - FastAPI Docs: `http://localhost:8000/docs`
   - Neo4j Browser: `http://localhost:7474` (Credentials: `neo4j` / `password123`)

## Architecture & Documentation
- `docs/blueprint.md` / `blueprint.md`: Master implementation blueprint
- `docs/prd.md` / `NEXUS-CRIME-PRD.md`: Product Requirements Document
- `database/postgres/schema.sql`: Reference PostgreSQL + PostGIS DDL
- `database/neo4j/constraints.cypher`: Neo4j graph schema constraints
