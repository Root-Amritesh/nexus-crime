---
name: alembic-migrations
description: PostgreSQL migration authoring and versioning discipline, autogenerate workflow for NEXUS-CRIME.
---

# Alembic Migrations — NEXUS-CRIME

## When to use
Activate when creating, reviewing, or applying database schema migrations in `backend/app/db/migrations/`.

## Workflow & Guidelines
1. **Model Source of Truth**: Always define models in `backend/app/models/` using SQLAlchemy 2.0 and GeoAlchemy2.
2. **Autogenerate Revision**:
   ```bash
   alembic revision --autogenerate -m "add_table_or_column"
   ```
3. **Inspect Generated Migration**:
   - Verify PostGIS `Geometry` columns and SRID 4326 types.
   - Verify GiST index creation on spatial columns: `CREATE INDEX ... USING gist (geom)`.
   - Verify composite unique constraints on `tower_ping(phone_hash, tower_id, timestamp)`.
4. **DDL Sync**:
   - Keep `database/postgres/schema.sql` synchronized with any migration changes as reference DDL.
5. **Idempotence**:
   - Migrations should apply cleanly via `alembic upgrade head`.
