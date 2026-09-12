from datetime import datetime
from sqlalchemy import BigInteger, String, DateTime, ForeignKey, Index, func, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.postgres import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    case_reference: Mapped[str] = mapped_column(
        String(128), ForeignKey("case.case_reference", ondelete="CASCADE"), nullable=False
    )
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    investigator_id: Mapped[str] = mapped_column(String(128), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship
    case: Mapped["Case"] = relationship("Case", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_log_case", "case_reference"),
        Index("idx_audit_log_timestamp", "timestamp"),
    )
