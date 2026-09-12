# NEXUS-CRIME: 5-Minute Hackathon Demo Script

## Setup & Prep (Before Pitch)
1. Ensure Docker containers are running: `docker-compose up -d`
2. Ensure Firebase `.env` variables are correctly set in the `frontend/` directory.
3. Open two browser tabs:
   - Tab 1: Live Application (`http://localhost:5173`)
   - Tab 2: Neo4j Browser (`http://localhost:7474`) - to prove local data residency.

## The Script

### 0:00 – 0:30 | The Problem & The Solution
* **Screen:** Login Page.
* **Speaker:** "Welcome to NEXUS-CRIME. In complex investigations like the Delhi Transit Hijack, law enforcement is drowning in disparate data—thousands of phone records, tower dumps, and financial transactions. Our solution is a unified intelligence correlator that turns raw data into actionable leads, entirely on-premise."
* **Action:** Log in using Phone Authentication or Google Sign-In to demonstrate secure, modern auth.

### 0:30 – 1:30 | The Workstation & Map View
* **Screen:** Dashboard / Map View.
* **Action:** Click "Load Synthetic Benchmark Dataset".
* **Speaker:** "We arrive at the investigator workstation. To demonstrate the system's power without violating data privacy, we are loading a synthetic dataset. As you can see on the map, the platform has automatically geolocated cell towers, crime scenes, and flagged suspect devices across the city."
* **Action:** Use the timeline slider at the bottom of the map.
* **Speaker:** "Investigators can scrub through time to see how devices moved in relation to the crime scenes."

### 1:30 – 2:30 | The Knowledge Graph & Risk Scoring
* **Screen:** Graph Tab.
* **Action:** Switch to the Network Graph view. Zoom in on a dense cluster.
* **Speaker:** "Behind the scenes, NEXUS-CRIME isn't just plotting points; it's building a complex knowledge graph in Neo4j. It automatically correlates millions of records to find co-locations, co-movements, and communication chains. Based on these edges, the system calculates a composite Risk Score for each device."
* **Action:** Open the "Explainability" panel for a top suspect.
* **Speaker:** "Crucially, this isn't a black box. Every risk score is fully explainable. We can see exactly why a device was flagged, down to the specific evidence records."

### 2:30 – 3:30 | Evidence-Grounded Graph RAG
* **Screen:** Assistant / RAG Panel (or equivalent UI).
* **Action:** Type query: "How is DEV-9A8F connected to DEV-3B7C?"
* **Speaker:** "To make this accessible, we built a Graph RAG system. Unlike typical AI, our system operates completely offline without sending sensitive data to external LLMs. It parses the natural language, runs localized graph pathfinding, and returns a deterministic answer supported by direct evidence citations."

### 3:30 – 4:30 | Audit & Compliance (BNSS §92)
* **Screen:** Audit Logs Tab.
* **Action:** Show the immutable audit trail.
* **Speaker:** "Because this system handles sensitive telecommunications data governed by BNSS Section 92, strict compliance is built-in. Every action—from data upload to suspect querying—is immutably logged with the investigator's ID, the warrant reference, and the timestamp, ensuring total chain of custody."

### 4:30 – 5:00 | Conclusion & Impact
* **Screen:** Dashboard Overview.
* **Speaker:** "NEXUS-CRIME reduces weeks of manual data correlation into seconds. It respects data sovereignty, enforces strict compliance, and provides transparent, evidence-backed leads. Thank you."
