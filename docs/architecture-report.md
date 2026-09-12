# NEXUS-CRIME: Architecture and Tech Stack Report

## 1. System Overview
NEXUS-CRIME is an intelligence correlation platform built to ingest telecom and financial data, model it as a knowledge graph, and provide investigative leads via a RAG interface. 

The architecture is explicitly designed for an **air-gapped, on-premise operational environment**. It eschews external third-party cloud APIs (like OpenAI or Mapbox) in favor of local databases and templated inference patterns to preserve data sovereignty and comply with BNSS §92 evidence handling guidelines.

## 2. Tech Stack

### Frontend (Investigator Workstation)
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand (for complex UI state, Map/Graph filters, and offline mock-data loading)
- **Data Fetching:** Axios / SWR
- **Mapping:** Deck.GL + React-Map-GL (configured for offline/generic tile usage without Mapbox dependencies)
- **Graph Visualization:** React-Force-Graph (WebGL-accelerated for large node sets)
- **Authentication:** Firebase Auth (Email/Password, Google, Phone)

### Backend (Correlation Engine & API)
- **Framework:** FastAPI (Python 3.10+)
- **ORM:** SQLAlchemy (for relational metadata)
- **Authentication Verification:** Firebase Admin SDK
- **Task Queue:** FastAPI BackgroundTasks (for async ingestion pipelines)
- **Data Science / Correlation:** Pandas (for heavy CSV processing)
- **Graph Client:** Neo4j Official Python Driver

### Data Storage
- **Relational Store (PostgreSQL):** Used for structured metadata, case tracking, warrant references, audit logs, and suspect risk scores.
- **Graph Store (Neo4j):** Used for complex relationship mapping (co-location, co-movement, call patterns) and shortest-path graph queries.

## 3. Core Architectural Decisions

### 3.1 Firebase Authentication & Dual-Mode Access
Authentication uses Firebase for credential exchange (Email, Google, Phone OTP). The FastAPI backend verifies the resulting JWTs via `firebase-admin`.
A fallback "Demo Mode" header (`X-Demo-Investigator-Id`) is maintained for hackathon presentations to bypass live auth restrictions during the pitch without weakening the codebase's strict parameter security.

### 3.2 Evidence-Grounded Graph RAG
To comply with the "no external LLM" constraint, the platform implements a specialized "Graph RAG". Instead of sending graph data to a generative AI, it uses regex-based pattern matching on natural language queries to route to specific, highly-optimized Cypher/SQL queries. The output is a deterministically templated natural language response complete with cited evidence from the graph edges.

### 3.3 Audit and Compliance
Every read/write operation involving sensitive case data generates an immutable entry in the `AuditLog` table. This satisfies the legal requirements for chain-of-custody tracking. The audit system records the `investigator_id`, timestamp, and the specific authentication mode used to execute the action.

## 4. Deployment Model
The system is fully containerized using Docker and `docker-compose`. 
- `frontend`: Nginx serving static assets built via Vite.
- `backend`: Uvicorn/Gunicorn running FastAPI.
- `postgres`: Official PostgreSQL 15 image.
- `neo4j`: Official Neo4j 5 image.
