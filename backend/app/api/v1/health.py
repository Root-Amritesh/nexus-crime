from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from neo4j import Driver

from backend.app.dependencies import get_db_session, get_neo4j_driver
from backend.app.db.neo4j_driver import check_neo4j_connection

router = APIRouter()


@router.get("", summary="Get application database health status")
def get_health(
    db: Session = Depends(get_db_session),
    neo4j_drv: Driver = Depends(get_neo4j_driver)
):
    """
    Checks connection to both PostgreSQL and Neo4j databases.
    """
    # Check Postgres
    postgres_status = "error"
    try:
        db.execute(text("SELECT 1"))
        postgres_status = "ok"
    except Exception:
        pass

    # Check Neo4j
    neo4j_status = "ok" if check_neo4j_connection(neo4j_drv) else "error"

    overall_status = "ok" if (postgres_status == "ok" and neo4j_status == "ok") else "error"

    return {
        "status": overall_status,
        "postgres": postgres_status,
        "neo4j": neo4j_status
    }
