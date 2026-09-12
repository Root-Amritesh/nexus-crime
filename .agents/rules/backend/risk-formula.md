13.1 Risk Scoring Formula
Inputs: centrality_normalized (0–1, PageRank/Betweenness), colocation_count (int), comovement_count (int), call_frequency_with_flagged (int, min-max normalized within case dataset).

risk_score = (0.30 × centrality_normalized)
           + (0.25 × min(colocation_count / 5, 1.0))
           + (0.25 × min(comovement_count / 5, 1.0))
           + (0.20 × call_frequency_with_flagged_normalized)

Normalization caps at 5 occurrences — tunable constant, externalized to configs/risk_weights.yaml, never hardcoded.

Fallback logic: if a signal is entirely unavailable (e.g. no CDR data uploaded), its term is excluded and remaining weights are proportionally re-normalized so the score stays on a comparable 0–1 scale.

Edge case: all-signals-missing case → score undefined, suspect excluded from ranked list with a logged warning, never silently scored 0.

13.2 Co-location Flagging Rule
Flag if device appears in ≥2 distinct crime scenes for the same case. Single-scene presence retained in the data model but not surfaced as a default flag. Boundary-timestamp pings resolved via inclusive boundary handling.

13.3 Co-movement Flagging Rule
Flag if devices share a tower within ±15 minutes on ≥2 distinct calendar days. Single same-day occurrence logged as weak evidence only. Sparse-ping devices produce false negatives — documented limitation, not hidden.

13.4 Entity Resolution
RapidFuzz similarity ≥90% → auto-merge; 70–90% → human-review queue; <70% → treated as distinct entities.

13.5 Duplicate Ingestion Handling
Reject exact duplicate (phone_hash, tower_id, timestamp) composite on re-upload to prevent double-counting.
