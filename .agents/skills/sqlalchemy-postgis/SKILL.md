---
name: sqlalchemy-postgis
description: SQLAlchemy 2.0 ORM + GeoAlchemy2 geometry columns, ST_DWithin query patterns for NEXUS-CRIME (blueprint.md Section 10).
---

# SQLAlchemy + PostGIS — NEXUS-CRIME Patterns

## When to use
Activate when writing or modifying files under `backend/app/models/`, `backend/app/db/`, or any code that touches PostgreSQL/PostGIS queries.

## Stack
- **PostgreSQL 16** + **PostGIS 3.4** (via `postgis/postgis:16-3.4` Docker image — extension pre-installed)
- **SQLAlchemy 2.0** (new-style `Mapped[]` type annotations, `mapped_column()`)
- **GeoAlchemy2** for geometry columns
- **psycopg2** (sync) or **asyncpg** (async) driver

## ORM Model Pattern
```python
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Float, DateTime, Integer, ForeignKey
from geoalchemy2 import Geometry

class Base(DeclarativeBase):
    pass

class Tower(Base):
    __tablename__ = "tower"
    tower_id: Mapped[str] = mapped_column(String, primary_key=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    coverage_radius_km: Mapped[float] = mapped_column(Float, nullable=False)
    # PostGIS geometry column for spatial queries
    geom: Mapped[str] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )
    pings: Mapped[list["TowerPing"]] = relationship(back_populates="tower")
```

## Geometry Column Rules
- Use `Geometry(geometry_type="POINT", srid=4326)` for all lat/long columns.
- Populate geometry from lat/long at write time: `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`.
- Keep both the raw `latitude`/`longitude` floats AND the `geom` column for developer clarity. Production should collapse to `geography` only.

## ST_DWithin Query Pattern (Co-location)
This is the core spatial query — blueprint.md Section 10, FR-03.

```python
from sqlalchemy import func, select
from geoalchemy2.functions import ST_DWithin, ST_SetSRID, ST_MakePoint

async def find_devices_near_scene(
    session: AsyncSession,
    scene_lat: float,
    scene_lon: float,
    radius_meters: float,
    time_start: datetime,
    time_end: datetime,
) -> list[str]:
    """Find all device hashes with pings within radius of a crime scene during its time window."""
    scene_point = ST_SetSRID(ST_MakePoint(scene_lon, scene_lat), 4326)

    stmt = (
        select(TowerPing.phone_hash)
        .join(Tower, TowerPing.tower_id == Tower.tower_id)
        .where(
            ST_DWithin(
                Tower.geom,
                func.ST_GeogFromWKB(scene_point),  # cast to geography for meter-based distance
                radius_meters,
            ),
            TowerPing.timestamp >= time_start,
            TowerPing.timestamp <= time_end,  # inclusive boundaries per blueprint 13.2
        )
        .distinct()
    )
    result = await session.execute(stmt)
    return [row[0] for row in result.all()]
```

## Required Indexes
| Table.Column | Index Type | Reason |
|---|---|---|
| `tower_ping(phone_hash)` | B-tree | Fast per-device lookup |
| `tower_ping(timestamp)` | B-tree | Fast time-window filtering |
| `crime_scene(geom)` | GiST | `ST_DWithin` performance — **non-negotiable** |
| `cdr_record(caller_hash, callee_hash)` | Composite B-tree | Fast pair lookups |

## Constraints
- `tower_ping(phone_hash, tower_id, timestamp)` — composite uniqueness constraint. Rejects exact duplicate ingestion (blueprint Section 13.5).
- `crime_scene.case_reference` → `case.case_reference` (FK)
- `tower_ping.tower_id` → `tower.tower_id` (FK)
- `audit_log.case_reference` → `case.case_reference` (FK)

## Session Factory Pattern
```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(settings.DATABASE_URL)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def get_db_session():
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## Migration Strategy
- Alembic for PostgreSQL schema migrations (`backend/app/db/migrations/`).
- `alembic revision --autogenerate` to create migrations from model changes.
- Keep `database/postgres/schema.sql` reference DDL in sync with migrations.
- Neo4j schema changes are separate — tracked as versioned Cypher scripts with `CREATE CONSTRAINT IF NOT EXISTS`.

## Non-Negotiable Rules
- **Never string-concatenate SQL.** Always use SQLAlchemy's expression language or parameterized text().
- GiST spatial index on crime_scene geometry is **mandatory** — without it, ST_DWithin is a full table scan.
- Inclusive boundary handling for time windows (use `>=` and `<=`, not `>` and `<`).
- All timestamps stored as UTC.
