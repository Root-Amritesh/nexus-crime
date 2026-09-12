from datetime import datetime
from sqlalchemy import BigInteger, String, Integer, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.postgres import Base


class TowerPing(Base):
    __tablename__ = "tower_ping"

    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    phone_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    tower_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("tower.tower_id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    signal_strength: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationship
    tower: Mapped["Tower"] = relationship("Tower", back_populates="pings")

    __table_args__ = (
        UniqueConstraint("phone_hash", "tower_id", "timestamp", name="uq_tower_ping_composite"),
        Index("idx_tower_ping_phone_hash", "phone_hash"),
        Index("idx_tower_ping_timestamp", "timestamp"),
        Index("idx_tower_ping_tower_id", "tower_id"),
    )
