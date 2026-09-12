"""
PostgreSQL Engine and Session Factory.

DRIVER CHOICE DECISION:
- Primary API runtime: Async SQLAlchemy via `asyncpg` (`postgresql+asyncpg://`).
  FastAPI relies on asynchronous non-blocking I/O to handle high-concurrency requests
  and complex geospatial queries efficiently.
- Secondary / Migrations runtime: Sync SQLAlchemy via `psycopg2-binary` (`postgresql+psycopg2://`).
  Alembic CLI migrations, offline scripts, and synchronous database seed tools require
  a standard synchronous connection pool.
"""

from typing import AsyncGenerator, Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from backend.app.config import settings

# Shared Declarative Base for all ORM models
Base = declarative_base()

# -----------------------------------------------------------------------------
# Async Driver Configuration (asyncpg for FastAPI runtime)
# -----------------------------------------------------------------------------
async_db_url = settings.DATABASE_URL
if async_db_url.startswith("postgresql://"):
    async_db_url = async_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

async_engine = create_async_engine(
    async_db_url,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# -----------------------------------------------------------------------------
# Sync Driver Configuration (psycopg2 for Alembic and CLI scripts)
# -----------------------------------------------------------------------------
sync_db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://").replace("postgresql://", "postgresql+psycopg2://")

sync_engine = create_engine(
    sync_db_url,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)

# -----------------------------------------------------------------------------
# FastAPI Dependency Provider
# -----------------------------------------------------------------------------
def get_db_session() -> Generator[Session, None, None]:
    """
    Yields a synchronous Session instance for request lifecycle dependency injection.
    Supports easy fallback to SQLite in local test environments.
    """
    with SyncSessionLocal() as session:
        try:
            yield session
        finally:
            session.close()

