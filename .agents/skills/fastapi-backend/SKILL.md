---
name: fastapi-backend
description: Async FastAPI patterns, Pydantic v2 validation, BackgroundTasks usage, Depends()-based DI for the NEXUS-CRIME backend (blueprint.md Section 7).
---

# FastAPI Backend — NEXUS-CRIME Patterns

## When to use
Activate this skill when writing or modifying any file under `backend/app/`. Every backend pattern must match blueprint.md Section 7 and the repo structure in `.agents/rules/backend/repo-structure.md`.

## Stack
- **Python 3.12**, **FastAPI**, **Uvicorn**
- **Pydantic v2** (`BaseModel`, `BaseSettings`, `model_validator`)
- **SQLAlchemy 2.0** async sessions via `asyncpg` or sync via `psycopg2`
- **neo4j** Python Bolt driver

## App Factory (`main.py`)
```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: init DB engines, load spaCy model, connect Neo4j
    yield
    # shutdown: dispose engines, close Neo4j driver

app = FastAPI(title="NEXUS-CRIME", version="0.1.0", lifespan=lifespan)
app.include_router(v1_router, prefix="/api/v1")
```

## Controller Pattern (Thin Routes)
Routes in `api/v1/*.py` are **thin** — parse request, call one service method, map result to response. No business logic in controllers.

```python
@router.post("/upload/tower-dump", status_code=202)
async def upload_tower_dump(
    case_reference: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db_session),
    neo4j: Driver = Depends(get_neo4j_driver),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    result = await ingestion_service.ingest_tower_dump(db, file, case_reference)
    background_tasks.add_task(run_correlation_pipeline, case_reference, db, neo4j)
    return result
```

## Dependency Injection (`dependencies.py`)
All DI providers defined here — never instantiate DB sessions or drivers inline:
- `get_db_session()` — yields an async SQLAlchemy session, auto-commits/rollbacks
- `get_neo4j_driver()` — returns the singleton Bolt driver from app state
- `get_current_investigator()` — **stub** for MVP; returns a mocked investigator ID. Do NOT build a real auth flow — JWT/bcrypt scaffolding exists in `core/security.py` but is intentionally inactive.

## Pydantic v2 Validation
- Every request body has a dedicated schema in `schemas/` — one file per data type (`tower_dump.py`, `cdr.py`, `financial.py`, `fir.py`, `suspect.py`, `graph.py`).
- Use `model_validator(mode="after")` for cross-field validation (e.g., `time_window_end > time_window_start`).
- Config via `BaseSettings` in `config.py` reading from `.env`.

## Background Tasks
- Use `FastAPI.BackgroundTasks` for the post-upload correlation pipeline (hackathon scope).
- The pipeline runs: ingestion → preprocessing → correlation → graph write → analytics → scoring.
- Each stage logs one structured line minimum: `request_id`, `timestamp`, `stage`, `outcome`.
- Do NOT introduce Celery/Redis — that's documented as the production migration path, not MVP.

## Error Handling
- `core/exceptions.py` defines domain exceptions: `SchemaValidationError`, `MissingCaseReferenceError`, `UnknownTowerIdError`.
- FastAPI exception handlers map these to structured JSON error bodies with specific error codes.
- Never swallow exceptions silently — log with full context, then return a structured error or re-raise.

## Non-Negotiable Rules
- `case_reference` required on every processing endpoint. No exceptions.
- Parameterized queries only (SQL and Cypher).
- Phone/IMSI identifiers SHA-256 hashed before pipeline entry.
- Risk score weights live in `configs/risk_weights.yaml`, never hardcoded.
- Upload endpoints return `202 Accepted` + `job_id`; correlation results are polled separately.
- API is versioned under `/api/v1`; breaking changes get a new prefix.
