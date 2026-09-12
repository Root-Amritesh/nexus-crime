---
name: faker-synthetic-data
description: Planted ground-truth generator (scripts/generator.py) for NEXUS-CRIME, producing documented, recoverable criminal networks per blueprint.md Section 4.
---

# Faker Synthetic Data Generator — NEXUS-CRIME

## When to use
Activate when creating or updating `scripts/generator.py`, `scripts/seed_db.py`, or `scripts/validate_recall.py`.

## Critical Purpose
`scripts/generator.py` is the single most important hackathon artifact per blueprint Section 4. It must produce a **documented, recoverable planted network** (known suspects, coordinators, co-locations, and co-movements) mixed into background noise, rather than purely random fake data.

## Ground Truth Requirements
- **Planted Network**:
  - Core coordinator(s) with high betweenness/PageRank.
  - ≥2 distinct crime scenes where specific suspect devices are co-located.
  - Co-movement pairs: devices sharing towers within ±15 minutes on ≥2 distinct calendar days.
  - CDR call clusters and financial transactions linking associates.
- **Background Noise**:
  - ~5,000 tower pings across multiple towers and dates.
  - Random bystander devices and transactions.
- **Validation**:
  - Generate a `ground_truth.json` manifest specifying planted suspects.
  - `scripts/validate_recall.py` must assert 100% recall on the planted suspects.
