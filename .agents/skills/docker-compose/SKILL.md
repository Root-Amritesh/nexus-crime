---
name: docker-compose
description: Multi-service compose authoring, healthchecks gating backend startup, postgis/postgis + neo4j:5-community with GDS plugin.
---

# Docker Compose — NEXUS-CRIME Topology

## When to use
Activate when creating or updating `docker/docker-compose.yml`, `docker/docker-compose.override.yml`, Dockerfiles, or container orchestration configurations.

## Topology & Services
- **postgres**:
  - Image: `postgis/postgis:16-3.4`
  - Ports: `5432:5432`
  - Healthcheck: `pg_isready -U ${POSTGRES_USER:-postgres}`
  - Pre-installed PostGIS extension avoids manual `CREATE EXTENSION`.
- **neo4j**:
  - Image: `neo4j:5-community`
  - Ports: `7474:7474` (HTTP), `7687:7687` (Bolt)
  - Environment: `NEO4J_PLUGINS=["graph-data-science"]`, `NEO4J_AUTH=${NEO4J_USER:-neo4j}/${NEO4J_PASSWORD:-password}`
  - Healthcheck: Cypher check via `cypher-shell` or HTTP probe on port 7474.
- **backend**:
  - Image: Python 3.12-slim based.
  - Ports: `8000:8000`
  - Depends on `postgres` and `neo4j` with condition `service_healthy`.
- **frontend**:
  - Pre-built React Vite app served via nginx or dev server.

## Healthcheck-Gated Startup
Compose healthchecks must gate backend startup so API and DB connections do not fail on cold start.
