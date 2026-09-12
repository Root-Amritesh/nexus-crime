from datetime import datetime
from sqlalchemy import BigInteger, String, Float, DateTime, Index, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.postgres import Base


class FinancialRecord(Base):
    __tablename__ = "financial_record"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    sender_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    receiver_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[float] = mapped_column(Float(precision=53), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_financial_record_pairs", "sender_hash", "receiver_hash"),
        Index("idx_financial_record_timestamp", "timestamp"),
    )
