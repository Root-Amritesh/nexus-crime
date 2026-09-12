"""
Unit Smoke Test for SQLAlchemy ORM Models.
Verifies that all model modules can be imported without error
and that all expected tables are registered in Base.metadata.
"""

from backend.app.db.postgres import Base
from backend.app.models import (
    Case,
    Tower,
    CrimeScene,
    TowerPing,
    CDRRecord,
    FinancialRecord,
    AuditLog,
)


def test_models_registered_in_metadata():
    """
    Assert that all 7 entities are registered with correct table names in Base.metadata.
    """
    expected_tables = {
        "case",
        "tower",
        "crime_scene",
        "tower_ping",
        "cdr_record",
        "financial_record",
        "audit_log",
    }
    registered_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(registered_tables), (
        f"Missing tables in Base.metadata. Registered: {registered_tables}, Expected: {expected_tables}"
    )


def test_individual_model_attributes():
    """
    Smoke check for basic attributes on each model.
    """
    assert Case.__tablename__ == "case"
    assert Tower.__tablename__ == "tower"
    assert CrimeScene.__tablename__ == "crime_scene"
    assert TowerPing.__tablename__ == "tower_ping"
    assert CDRRecord.__tablename__ == "cdr_record"
    assert FinancialRecord.__tablename__ == "financial_record"
    assert AuditLog.__tablename__ == "audit_log"
