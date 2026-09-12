---
name: networkx-fallback
description: In-memory NetworkX graph analytics fallback producing identical output shape to Neo4j GDS when GDS plugin fails to load (FR-06).
---

# NetworkX Fallback — NEXUS-CRIME

## When to use
Activate when implementing or debugging `backend/app/ai/graph/analytics.py` to handle environments where Neo4j GDS is unavailable or fails to load.

## Output Shape Consistency
NetworkX calculations must produce an exact matching dictionary/property structure to GDS output:
- **PageRank**: dictionary `{ node_id (str): score (float 0.0-1.0) }`
- **Betweenness Centrality**: dictionary `{ node_id (str): score (float 0.0-1.0) }`
- **Louvain Community Detection**: dictionary `{ node_id (str): community_id (int) }`

## Implementation Pattern
```python
import networkx as nx

def compute_analytics_fallback(edges: list[dict]) -> dict:
    G = nx.Graph()
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], weight=edge.get("weight", 1))
    
    pagerank = nx.pagerank(G, weight="weight")
    betweenness = nx.betweenness_centrality(G, weight="weight")
    try:
        from networkx.algorithms.community import louvain_communities
        communities = louvain_communities(G, weight="weight")
        community_map = {node: idx for idx, comm in enumerate(communities) for node in comm}
    except Exception:
        community_map = {node: 0 for node in G.nodes()}
        
    return {
        "pagerank": pagerank,
        "betweenness": betweenness,
        "community": community_map
    }
```
Logging must record fallback activation when GDS fails.
