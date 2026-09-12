"""
Entity Resolution Module.
Resolves entity records using exact identifier matching first, followed by
RapidFuzz fuzzy similarity scoring per risk-formula.md Section 13.4.

Confidence Banding Rules:
- >= 90% -> AUTO_MERGE
- 70% to <90% -> HUMAN_REVIEW (staged in a separate pending-review queue, NOT auto-merged)
- < 70% -> DISTINCT (kept separate)

Note on NER / Name-based resolution:
- spaCy NER extraction is scheduled for a later stage.
- For Stage 6, structured identifiers (phone_hash) are prioritized directly.
- The name-based fuzzy resolution path is structured and callable with clean extensibility hooks.
"""

import os
import logging
from typing import Any, Dict, List, Optional, Set, Tuple
from rapidfuzz import fuzz

from backend.app.config import settings

logger = logging.getLogger("nexus-crime.ai.entity_resolution")

# Default fallback thresholds
DEFAULT_AUTO_MERGE_THRESHOLD = 90.0
DEFAULT_HUMAN_REVIEW_THRESHOLD = 70.0


def load_resolution_thresholds() -> Tuple[float, float]:
    """
    Loads auto-merge and human-review thresholds from configs/entity_resolution.yaml.
    Externalized per non-negotiables / blueprint conventions.
    """
    config_path = settings.ENTITY_RESOLUTION_CONFIG_PATH
    if os.path.exists(config_path):
        try:
            # Attempt yaml parsing if pyyaml is installed, else parse simple key-value format
            try:
                import yaml
                with open(config_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f) or {}
            except ImportError:
                data = {}
                with open(config_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and ":" in line:
                            k, v = line.split(":", 1)
                            data[k.strip()] = float(v.strip())

            auto_thresh = float(data.get("auto_merge_threshold", DEFAULT_AUTO_MERGE_THRESHOLD))
            review_thresh = float(data.get("human_review_threshold", DEFAULT_HUMAN_REVIEW_THRESHOLD))
            return auto_thresh, review_thresh
        except Exception as e:
            logger.warning(f"Failed to load {config_path}: {e}. Falling back to default thresholds.")
    return DEFAULT_AUTO_MERGE_THRESHOLD, DEFAULT_HUMAN_REVIEW_THRESHOLD


class EntityResolver:
    def __init__(self, auto_merge_threshold: Optional[float] = None, human_review_threshold: Optional[float] = None):
        cfg_auto, cfg_review = load_resolution_thresholds()
        self.auto_merge_threshold = auto_merge_threshold if auto_merge_threshold is not None else cfg_auto
        self.human_review_threshold = human_review_threshold if human_review_threshold is not None else cfg_review

    def resolve_entities(
        self,
        records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Resolves entity records.

        Processing Order:
        1. Structured Identifier First:
           - Records sharing exact `phone_hash` are grouped immediately as the same entity
             without invoking fuzzy similarity.
        2. Name/Attribute Fuzzy Matching:
           - For records with distinct or missing identifiers but candidate names/attributes,
             RapidFuzz token_sort_ratio / ratio is applied.
           - Banding:
             * score >= auto_merge_threshold -> merged into entity cluster
             * human_review_threshold <= score < auto_merge_threshold -> added to review queue (NOT merged)
             * score < human_review_threshold -> remains distinct

        Returns:
        {
            "resolved_entities": [
                {
                    "entity_id": str,
                    "canonical_phone_hash": str,
                    "phone_hashes": [str],
                    "records": [dict]
                }
            ],
            "pending_review_queue": [
                {
                    "source_record": dict,
                    "target_record": dict,
                    "similarity_score": float,
                    "reason": str
                }
            ],
            "distinct_count": int,
            "auto_merged_count": int,
            "review_queue_count": int
        }
        """
        resolved_entities: List[Dict[str, Any]] = []
        pending_review_queue: List[Dict[str, Any]] = []

        # 1. Exact phone_hash grouping (Structured Identifier First)
        phone_hash_groups: Dict[str, List[Dict[str, Any]]] = {}
        non_phone_records: List[Dict[str, Any]] = []

        for rec in records:
            ph = rec.get("phone_hash")
            if ph and isinstance(ph, str) and ph.strip():
                ph_clean = ph.strip()
                if ph_clean not in phone_hash_groups:
                    phone_hash_groups[ph_clean] = []
                phone_hash_groups[ph_clean].append(rec)
            else:
                non_phone_records.append(rec)

        auto_merged_count = 0

        # Build initial resolved entities from exact identifier clusters
        entity_counter = 1
        for ph, group in phone_hash_groups.items():
            if len(group) > 1:
                auto_merged_count += len(group) - 1

            resolved_entities.append({
                "entity_id": f"ENT-{entity_counter:04d}",
                "canonical_phone_hash": ph,
                "phone_hashes": [ph],
                "names": list({r.get("name") for r in group if r.get("name")}),
                "records": group
            })
            entity_counter += 1

        # 2. Fuzzy resolution for names/variants (for future NER integration or named entities)
        # Note: In Stage 6, name-based resolution handles records with names if provided,
        # with full spaCy NER extraction pipeline hooking into this module in Stage 8.
        if non_phone_records:
            for rec in non_phone_records:
                rec_name = rec.get("name", "").strip() if rec.get("name") else ""
                if not rec_name:
                    resolved_entities.append({
                        "entity_id": f"ENT-{entity_counter:04d}",
                        "canonical_phone_hash": None,
                        "phone_hashes": [],
                        "names": [],
                        "records": [rec]
                    })
                    entity_counter += 1
                    continue

                best_match_entity = None
                best_score = 0.0

                for entity in resolved_entities:
                    for e_name in entity.get("names", []):
                        score = fuzz.token_sort_ratio(rec_name, e_name)
                        if score > best_score:
                            best_score = score
                            best_match_entity = entity

                if best_score >= self.auto_merge_threshold and best_match_entity is not None:
                    # >= 90%: Auto-merge
                    best_match_entity["records"].append(rec)
                    if rec_name not in best_match_entity["names"]:
                        best_match_entity["names"].append(rec_name)
                    auto_merged_count += 1
                elif best_score >= self.human_review_threshold and best_match_entity is not None:
                    # 70% to 90%: Human review queue (GENUINELY SEPARATE, NOT MERGED)
                    pending_review_queue.append({
                        "source_record": rec,
                        "target_entity_id": best_match_entity["entity_id"],
                        "target_names": best_match_entity["names"],
                        "similarity_score": round(best_score, 2),
                        "reason": f"Fuzzy similarity {best_score:.1f}% within human review threshold [{self.human_review_threshold}%, {self.auto_merge_threshold}%)"
                    })
                    # Kept as separate distinct entity pending review
                    resolved_entities.append({
                        "entity_id": f"ENT-{entity_counter:04d}",
                        "canonical_phone_hash": None,
                        "phone_hashes": [],
                        "names": [rec_name],
                        "records": [rec],
                        "pending_review": True
                    })
                    entity_counter += 1
                else:
                    # < 70%: Treated as distinct entity
                    resolved_entities.append({
                        "entity_id": f"ENT-{entity_counter:04d}",
                        "canonical_phone_hash": None,
                        "phone_hashes": [],
                        "names": [rec_name],
                        "records": [rec]
                    })
                    entity_counter += 1

        return {
            "resolved_entities": resolved_entities,
            "pending_review_queue": pending_review_queue,
            "distinct_count": len(resolved_entities),
            "auto_merged_count": auto_merged_count,
            "review_queue_count": len(pending_review_queue)
        }
