from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import BigInteger, String, DateTime, ForeignKey, Index, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.postgres import Base


class CorrelationStaging(Base):
    """
    Staging table for raw correlation outputs (Co-location and Co-movement)
    prior to Neo4j graph population and GDS risk scoring in Stage 6.
    """
    __tablename__ = "correlation_staging"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    case_reference: Mapped[str] = mapped_column(
        String(128), ForeignKey("case.case_reference", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[str] = mapped_column(String(64), nullable=False)
    results: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="correlations")

    __table_args__ = (
        Index("idx_correlation_staging_case", "case_reference"),
        Index("idx_correlation_staging_job", "job_id"),
    )
