"""
Risk Scoring Model.
Stores computed risk scores and breakdown per suspect for a case in PostgreSQL.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import BigInteger, String, Float, DateTime, ForeignKey, Index, Integer, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.postgres import Base


class SuspectRiskScore(Base):
    __tablename__ = "suspect_risk_score"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    case_reference: Mapped[str] = mapped_column(
        String(128), ForeignKey("case.case_reference", ondelete="CASCADE"), nullable=False
    )
    device_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float(precision=53), nullable=False)
    score_breakdown: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    flagged_scenes: Mapped[List[str]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    case: Mapped["Case"] = relationship("Case", backref="suspect_scores")

    __table_args__ = (
        Index("idx_suspect_risk_case", "case_reference"),
        Index("idx_suspect_risk_device", "device_hash"),
        Index("idx_suspect_risk_score", "risk_score"),
    )
