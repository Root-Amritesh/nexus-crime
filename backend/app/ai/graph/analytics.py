"""
Graph Analytics Engine (Neo4j GDS + NetworkX Fallback).
Per blueprint.md Section 5.8, Section 9.2 (step 6), PRD FR-06, and PRD Section 37:
"GDS plugin misconfiguration is our #1 listed engineering risk -> robust fallback to NetworkX".

Algorithms Executed:
1. PageRank (pagerank)
2. Betweenness Centrality (betweenness)
3. Louvain Community Detection (community_id)

Normalization Discipline:
- Raw Betweenness in NetworkX is in [0, 1] for undirected graphs.
- Raw PageRank in NetworkX and GDS sums to 1.0 (or is scaled by damping/nodes), but individual values depend on node count N.
- Centrality metric normalized to a consistent [0, 1] range:
  combined_centrality = 0.5 * min_max_normalize(pagerank) + 0.5 * min_max_normalize(betweenness)
  (or per-metric normalized values written directly to nodes).
- Both GDS and NetworkX paths write back IDENTICAL property names and types to Neo4j nodes:
  * pagerank (float)
  * betweenness (float)
  * centrality_normalized (float in [0, 1])
  * community_id (int)

Fallback & Failure Policy:
- GDS unavailable, procedure not found (ClientError with UnknownProcedure), or GDS projection errors ->
  triggers NetworkX fallback, emits structured log: stage="analytics", path="networkx_fallback".
- Genuine Neo4j connection failure (ServiceUnavailable, SessionExpired) ->
  FAILS LOUDLY, never silently ignores connection loss or operates on stale/missing data.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple
import networkx as nx
from neo4j import Driver, Session
from neo4j.exceptions import ClientError, DatabaseError, TransientError, ServiceUnavailable, SessionExpired

from backend.app.core.logging import log_stage_event

logger = logging.getLogger("nexus-crime.ai.graph.analytics")


def min_max_normalize(scores: Dict[str, float]) -> Dict[str, float]:
    """
    Min-max normalizes a dictionary of {node_id: score} into [0.0, 1.0].
    If all values are identical, returns 0.0 (or 1.0 if nonzero) for all nodes.
    """
    if not scores:
        return {}
    values = list(scores.values())
    min_val = min(values)
    max_val = max(values)
    val_range = max_val - min_val

    if val_range == 0.0:
        # Uniform score across all nodes
        return {k: (1.0 if min_val > 0 else 0.0) for k in scores}

    return {k: (v - min_val) / val_range for k, v in scores.items()}


class GraphAnalytics:
    def __init__(self, driver: Driver):
        self.driver = driver

    def run_analytics(self, case_reference: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes PageRank, Betweenness Centrality, and Louvain Community Detection.
        Attempts primary Neo4j GDS execution; seamlessly falls back to NetworkX on GDS error.
        """
        try:
            return self._run_gds_pipeline(case_reference)
        except (ClientError, DatabaseError) as gds_err:
            # Check if error is related to missing GDS plugin / unknown procedure / projection error
            err_msg = str(gds_err).lower()
            if "procedure" in err_msg or "gds" in err_msg or "unknown function" in err_msg:
                logger.warning(
                    f"Neo4j GDS plugin/procedure unavailable ({gds_err}). Activating NetworkX fallback path."
                )
                return self._run_networkx_pipeline(case_reference)
            else:
                # Other Cypher syntax/query error
                logger.error(f"GDS execution failed with database error: {gds_err}. Falling back to NetworkX.")
                return self._run_networkx_pipeline(case_reference)
        except (ServiceUnavailable, SessionExpired) as conn_err:
            # Fatal connection error - fail loudly per specification
            logger.error(f"Fatal connection failure to Neo4j: {conn_err}. Not falling back.")
            log_stage_event(
                stage="analytics",
                outcome="failed",
                details={"error": str(conn_err), "reason": "Neo4j connection unavailable"}
            )
            raise conn_err
        except Exception as e:
            logger.warning(f"Unexpected error in GDS path ({e}). Triggering NetworkX fallback.")
            return self._run_networkx_pipeline(case_reference)

    def _run_gds_pipeline(self, case_reference: Optional[str] = None) -> Dict[str, Any]:
        """
        Primary execution path using Neo4j Graph Data Science (GDS) library.
        Uses parameterized Cypher throughout.
        """
        graph_name = "case_subgraph"

        with self.driver.session() as session:
            # 1. Drop existing GDS in-memory projection if it exists
            session.run(
                """
                CALL gds.graph.exists($graph_name) YIELD exists
                WITH exists WHERE exists
                CALL gds.graph.drop($graph_name) YIELD graphName
                RETURN graphName
                """,
                {"graph_name": graph_name}
            )

            # 2. Project case graph into GDS memory
            # Uses Device nodes and all relationships (CO_LOCATED_AT, CO_MOVED_WITH)
            session.run(
                """
                CALL gds.graph.project(
                    $graph_name,
                    'Device',
                    {
                        CO_LOCATED_AT: {type: 'CO_LOCATED_AT', orientation: 'UNDIRECTED'},
                        CO_MOVED_WITH: {type: 'CO_MOVED_WITH', orientation: 'UNDIRECTED'}
                    }
                )
                """,
                {"graph_name": graph_name}
            )

            # 3. Run PageRank (stream to python to calculate normalized values)
            pr_result = session.run(
                """
                CALL gds.pageRank.stream($graph_name)
                YIELD nodeId, score
                RETURN gds.util.asNode(nodeId).phone_hash AS phone_hash, score
                """,
                {"graph_name": graph_name}
            )
            raw_pagerank = {record["phone_hash"]: float(record["score"]) for record in pr_result}

            # 4. Run Betweenness Centrality
            bw_result = session.run(
                """
                CALL gds.betweenness.stream($graph_name)
                YIELD nodeId, score
                RETURN gds.util.asNode(nodeId).phone_hash AS phone_hash, score
                """,
                {"graph_name": graph_name}
            )
            raw_betweenness = {record["phone_hash"]: float(record["score"]) for record in bw_result}

            # 5. Run Louvain Community Detection
            lv_result = session.run(
                """
                CALL gds.louvain.stream($graph_name)
                YIELD nodeId, communityId
                RETURN gds.util.asNode(nodeId).phone_hash AS phone_hash, communityId
                """,
                {"graph_name": graph_name}
            )
            communities = {record["phone_hash"]: int(record["communityId"]) for record in lv_result}

            # 6. Drop in-memory GDS projection
            session.run(
                """
                CALL gds.graph.drop($graph_name) YIELD graphName
                """,
                {"graph_name": graph_name}
            )

            # 7. Apply consistent min-max normalization
            norm_pr = min_max_normalize(raw_pagerank)
            norm_bw = min_max_normalize(raw_betweenness)

            # Calculate combined normalized centrality: 0.5 * PR + 0.5 * Betweenness
            all_nodes = set(raw_pagerank.keys()) | set(raw_betweenness.keys())
            combined_centrality = {}
            for node in all_nodes:
                pr_n = norm_pr.get(node, 0.0)
                bw_n = norm_bw.get(node, 0.0)
                combined_centrality[node] = (0.5 * pr_n) + (0.5 * bw_n)

            # 8. Write back identical property schema to Neo4j nodes
            self._write_analytics_properties(
                session=session,
                pagerank=raw_pagerank,
                betweenness=raw_betweenness,
                centrality_normalized=combined_centrality,
                communities=communities
            )

        log_stage_event(
            stage="analytics",
            outcome="success",
            details={
                "engine": "neo4j_gds",
                "nodes_scored": len(all_nodes),
                "case_reference": case_reference
            }
        )

        return {
            "engine": "neo4j_gds",
            "nodes_scored": len(all_nodes),
            "pagerank": raw_pagerank,
            "betweenness": raw_betweenness,
            "centrality_normalized": combined_centrality,
            "communities": communities
        }

    def _run_networkx_pipeline(self, case_reference: Optional[str] = None) -> Dict[str, Any]:
        """
        Fallback execution path using NetworkX.
        Pulls nodes and edges from Neo4j, constructs an in-memory graph, computes metrics,
        and writes back the exact same properties.
        """
        # Structured log for fallback activation per PRD Section 28 & non-negotiables
        log_stage_event(
            stage="analytics",
            outcome="fallback_activated",
            details={
                "engine": "networkx_fallback",
                "reason": "GDS plugin unavailable or failed",
                "case_reference": case_reference
            }
        )

        G = nx.Graph()

        with self.driver.session() as session:
            # 1. Read all Device nodes
            nodes_res = session.run("MATCH (d:Device) RETURN d.phone_hash AS phone_hash")
            for record in nodes_res:
                ph = record["phone_hash"]
                if ph:
                    G.add_node(ph)

            # 2. Read all relationships
            edges_res = session.run(
                """
                MATCH (a:Device)-[r]-(b:Device)
                RETURN DISTINCT a.phone_hash AS source, b.phone_hash AS target, coalesce(r.weight, 1.0) AS weight
                """
            )
            for record in edges_res:
                src, tgt, wt = record["source"], record["target"], float(record["weight"])
                if src and tgt and src != tgt:
                    G.add_edge(src, tgt, weight=wt)

            if len(G.nodes) == 0:
                logger.info("Graph is empty; skipping NetworkX calculation")
                return {
                    "engine": "networkx_fallback",
                    "nodes_scored": 0,
                    "pagerank": {},
                    "betweenness": {},
                    "centrality_normalized": {},
                    "communities": {}
                }

            # 3. Compute PageRank
            try:
                raw_pagerank = nx.pagerank(G, weight="weight")
            except Exception as e:
                logger.warning(f"NetworkX PageRank failed: {e}. Assigning default scores.")
                raw_pagerank = {n: 1.0 / len(G.nodes) for n in G.nodes}

            # 4. Compute Betweenness Centrality
            try:
                raw_betweenness = nx.betweenness_centrality(G, weight="weight")
            except Exception as e:
                logger.warning(f"NetworkX Betweenness failed: {e}. Assigning default scores.")
                raw_betweenness = {n: 0.0 for n in G.nodes}

            # 5. Compute Louvain Community Detection
            # Using networkx.algorithms.community.louvain_communities (standard in NetworkX 3.x)
            communities = {}
            try:
                community_sets = nx.algorithms.community.louvain_communities(G, weight="weight", seed=42)
                for comm_id, node_set in enumerate(community_sets):
                    for node in node_set:
                        communities[node] = comm_id
            except Exception as e:
                logger.warning(f"NetworkX Louvain failed: {e}. Assigning default community 0.")
                communities = {n: 0 for n in G.nodes}

            # 6. Apply identical min-max normalization
            norm_pr = min_max_normalize(raw_pagerank)
            norm_bw = min_max_normalize(raw_betweenness)

            combined_centrality = {}
            for node in G.nodes:
                pr_n = norm_pr.get(node, 0.0)
                bw_n = norm_bw.get(node, 0.0)
                combined_centrality[node] = (0.5 * pr_n) + (0.5 * bw_n)

            # 7. Write back identical property schema to Neo4j nodes
            self._write_analytics_properties(
                session=session,
                pagerank=raw_pagerank,
                betweenness=raw_betweenness,
                centrality_normalized=combined_centrality,
                communities=communities
            )

        log_stage_event(
            stage="analytics",
            outcome="success",
            details={
                "engine": "networkx_fallback",
                "nodes_scored": len(G.nodes),
                "case_reference": case_reference
            }
        )

        return {
            "engine": "networkx_fallback",
            "nodes_scored": len(G.nodes),
            "pagerank": raw_pagerank,
            "betweenness": raw_betweenness,
            "centrality_normalized": combined_centrality,
            "communities": communities
        }

    def _write_analytics_properties(
        self,
        session: Session,
        pagerank: Dict[str, float],
        betweenness: Dict[str, float],
        centrality_normalized: Dict[str, float],
        communities: Dict[str, int]
    ) -> None:
        """
        Writes computed metrics back onto Device nodes using parameterized Cypher.
        Ensures strict output shape parity between GDS and NetworkX paths:
        - d.pagerank (Float)
        - d.betweenness (Float)
        - d.centrality_normalized (Float in [0, 1])
        - d.community_id (Integer)
        """
        all_nodes = set(pagerank.keys()) | set(betweenness.keys()) | set(communities.keys())

        # Batch update using UNWIND for high performance and parameterization
        node_payloads = []
        for ph in all_nodes:
            node_payloads.append({
                "phone_hash": ph,
                "pagerank": float(pagerank.get(ph, 0.0)),
                "betweenness": float(betweenness.get(ph, 0.0)),
                "centrality_normalized": float(centrality_normalized.get(ph, 0.0)),
                "community_id": int(communities.get(ph, 0))
            })

        if node_payloads:
            session.run(
                """
                UNWIND $batch AS item
                MATCH (d:Device {phone_hash: item.phone_hash})
                SET d.pagerank = item.pagerank,
                    d.betweenness = item.betweenness,
                    d.centrality_normalized = item.centrality_normalized,
                    d.community_id = item.community_id,
                    d.analytics_updated_at = datetime()
                """,
                {"batch": node_payloads}
            )
