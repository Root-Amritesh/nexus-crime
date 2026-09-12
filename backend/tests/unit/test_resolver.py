"""
Unit tests for Entity Resolution module (resolver.py).
Per Stage 6 specifications:
1. Exact-identifier match bypasses fuzzy matching.
2. >= 90% auto-merges into canonical cluster.
3. 70-90% case lands in review queue and is NOT merged.
4. < 70% case stays distinct.
"""

import pytest
from backend.app.ai.entity_resolution.resolver import EntityResolver


def test_resolver_exact_identifier_bypass_fuzzy():
    """
    Two records sharing the exact same phone_hash are clustered immediately
    without needing fuzzy comparison.
    """
    resolver = EntityResolver()
    records = [
        {"phone_hash": "hash_12345", "name": "Alias One"},
        {"phone_hash": "hash_12345", "name": "Completely Different Name"},
    ]

    result = resolver.resolve_entities(records)

    assert result["distinct_count"] == 1
    assert result["auto_merged_count"] == 1
    assert len(result["pending_review_queue"]) == 0
    resolved = result["resolved_entities"][0]
    assert resolved["canonical_phone_hash"] == "hash_12345"
    assert len(resolved["records"]) == 2


def test_resolver_high_similarity_auto_merges():
    """
    Candidate entity with >= 90% similarity is auto-merged.
    """
    resolver = EntityResolver(auto_merge_threshold=90.0, human_review_threshold=70.0)
    records = [
        {"phone_hash": "hash_aaa", "name": "Vikram Malhotra"},
        {"name": "Vikram Malhotr"},  # 1 char typo -> ~96% similarity
    ]

    result = resolver.resolve_entities(records)

    assert result["distinct_count"] == 1
    assert result["auto_merged_count"] == 1
    assert len(result["pending_review_queue"]) == 0
    resolved = result["resolved_entities"][0]
    assert "Vikram Malhotr" in resolved["names"]
    assert len(resolved["records"]) == 2


def test_resolver_medium_similarity_lands_in_review_queue():
    """
    Candidate entity in 70-90% range lands in pending_review_queue and is NOT merged.
    """
    resolver = EntityResolver(auto_merge_threshold=90.0, human_review_threshold=70.0)
    records = [
        {"phone_hash": "hash_main", "name": "Vikram Malhotra"},
        {"name": "Vikram Mohan Malhotra"},  # Adds middle name -> 83.3% similarity
    ]

    result = resolver.resolve_entities(records)

    assert len(result["pending_review_queue"]) == 1
    review_item = result["pending_review_queue"][0]
    assert 70.0 <= review_item["similarity_score"] < 90.0
    assert result["review_queue_count"] == 1

    # CRITICAL: Confirm the record was NOT merged into the main entity
    assert result["distinct_count"] == 2
    assert result["auto_merged_count"] == 0
    main_ent = next(e for e in result["resolved_entities"] if e["canonical_phone_hash"] == "hash_main")
    assert len(main_ent["records"]) == 1


def test_resolver_low_similarity_remains_distinct():
    """
    Candidate entity with < 70% similarity stays completely distinct.
    """
    resolver = EntityResolver(auto_merge_threshold=90.0, human_review_threshold=70.0)
    records = [
        {"phone_hash": "hash_111", "name": "Rajesh Kumar"},
        {"name": "Suresh Sharma"},  # Completely different name -> low similarity
    ]

    result = resolver.resolve_entities(records)

    assert result["distinct_count"] == 2
    assert result["auto_merged_count"] == 0
    assert len(result["pending_review_queue"]) == 0
    assert result["review_queue_count"] == 0
