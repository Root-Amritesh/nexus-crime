from datetime import datetime
from typing import List
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.postgres import Base


class Case(Base):
    __tablename__ = "case"

    case_reference: Mapped[str] = mapped_column(String(128), primary_key=True)
    warrant_reference: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    investigator_id: Mapped[str] = mapped_column(String(128), nullable=False)

    # Relationships
    crime_scenes: Mapped[List["CrimeScene"]] = relationship(
        "CrimeScene", back_populates="case", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", back_populates="case", cascade="all, delete-orphan"
    )
