---
name: rapidfuzz-entity-resolution
description: RapidFuzz entity resolution with exact confidence banding (≥90% auto-merge, 70-90% review, <70% distinct) for NEXUS-CRIME.
---

# RapidFuzz Entity Resolution — NEXUS-CRIME

## When to use
Activate when implementing or modifying `backend/app/ai/entity_resolution/resolver.py` or resolving entities extracted from FIR text and data sources.

## Exact Confidence Banding Rules
- **Score ≥ 90.0%**: `AUTO_MERGE` — Automatically merge entities into a single canonical node before graph creation.
- **70.0% ≤ Score < 90.0%**: `HUMAN_REVIEW` — Route to human-review queue; provisionally created with pending status in MVP, but flagged for investigator validation.
- **Score < 70.0%**: `DISTINCT` — Treated strictly as separate entities.

## Implementation Pattern
```python
from rapidfuzz import fuzz, process

def resolve_entity(query_name: str, existing_entities: list[str]) -> tuple[str, float, str]:
    if not existing_entities:
        return query_name, 100.0, "NEW"
        
    best_match = process.extractOne(
        query_name,
        existing_entities,
        scorer=fuzz.token_sort_ratio
    )
    if not best_match:
        return query_name, 0.0, "DISTINCT"
        
    match_name, score, _ = best_match
    if score >= 90.0:
        return match_name, score, "AUTO_MERGE"
    elif score >= 70.0:
        return match_name, score, "HUMAN_REVIEW"
    else:
        return query_name, score, "DISTINCT"
```
Never auto-merge entities in the 70–90% band.
