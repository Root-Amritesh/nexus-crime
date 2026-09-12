"""
Neo4j Bolt Driver Factory.

Provides singleton driver instance with connection timeout and a connectivity test helper.
"""

from typing import Generator
from neo4j import GraphDatabase, Driver
from backend.app.config import settings

_driver_instance: Driver | None = None


def get_neo4j_driver() -> Generator[Driver, None, None]:
    """
    FastAPI Depends() provider yielding the Neo4j Bolt driver.
    """
    global _driver_instance
    if _driver_instance is None:
        _driver_instance = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
            connection_timeout=5.0,  # 5-second timeout per blueprint Section 21
            max_connection_lifetime=3600
        )
    try:
        yield _driver_instance
    finally:
        pass


def check_neo4j_connection(driver: Driver) -> bool:
    """
    Executes a trivial connectivity check (RETURN 1) for the /health endpoint.
    """
    try:
        with driver.session() as session:
            result = session.run("RETURN 1 AS alive")
            record = result.single()
            return record is not None and record["alive"] == 1
    except Exception:
        return False


def close_neo4j_driver() -> None:
    """
    Closes driver during application shutdown.
    """
    global _driver_instance
    if _driver_instance is not None:
        _driver_instance.close()
        _driver_instance = None
