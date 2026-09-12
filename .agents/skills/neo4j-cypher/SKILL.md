---
name: neo4j-cypher
description: Parameterized Cypher queries, GDS algorithms (PageRank, Betweenness, Louvain), and Bolt driver session patterns for NEXUS-CRIME (blueprint.md Section 10.2).
---

# Neo4j & Cypher — NEXUS-CRIME Patterns

## When to use
Activate when writing or modifying any Neo4j driver interactions, graph construction, relationship queries, or GDS analytics (`backend/app/ai/graph/*`, `backend/app/db/neo4j_driver.py`).

## Graph Schema
- **Nodes**:
  - `:Device { phone_hash: string (indexed unique), risk_score: float, community_id: int }`
  - `:Person { person_id: string, name: string, confidence: float }` (optional, post-resolution)
  - `:Location { location_id: string, lat: float, lon: float }`
- **Edges**:
  - `[:CO_LOCATED_AT { weight: int, scene_ids: list[str], evidence: list[map] }]`
  - `[:CO_MOVED_WITH { weight: int, event_timestamps: list[str], evidence: list[map] }]`
  - `[:CALLED { count: int, total_duration: int, evidence: list[map] }]`
  - `[:TRANSACTED_WITH { count: int, total_amount: float, evidence: list[map] }]`

## Bolt Driver & Session Pattern
Always parameterize queries. **NEVER string-concatenate user input or identifiers into Cypher.**

```python
from neo4j import AsyncGraphDatabase, AsyncDriver

async def create_or_update_relationship(
    driver: AsyncDriver,
    source_hash: str,
    target_hash: str,
    rel_type: str,
    weight: int,
    evidence: list[dict]
):
    query = """
    MERGE (a:Device {phone_hash: $source_hash})
    MERGE (b:Device {phone_hash: $target_hash})
    MERGE (a)-[r:CO_LOCATED_AT]->(b)
    ON CREATE SET r.weight = $weight, r.evidence = $evidence
    ON MATCH SET r.weight = r.weight + $weight, r.evidence = r.evidence + $evidence
    """
    async with driver.session() as session:
        await session.run(query, source_hash=source_hash, target_hash=target_hash, weight=weight, evidence=evidence)
```

## Neo4j GDS Library Calls
Use GDS procedures for PageRank, Betweenness Centrality, and Louvain Community Detection:
- `gds.graph.project` to project the case subgraph.
- `gds.pageRank.stream` or `gds.betweenness.stream` for centrality calculation.
- `gds.louvain.stream` for community clustering.

Always ensure evidence arrays are never empty (PRD FR-10). Fallback to NetworkX in-memory computation if GDS fails to load.
