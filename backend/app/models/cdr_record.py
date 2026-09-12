from datetime import datetime
from sqlalchemy import BigInteger, String, Integer, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.postgres import Base


class CDRRecord(Base):
    __tablename__ = "cdr_record"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    caller_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    callee_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        Index("idx_cdr_record_pairs", "caller_hash", "callee_hash"),
        Index("idx_cdr_record_timestamp", "timestamp"),
    )
