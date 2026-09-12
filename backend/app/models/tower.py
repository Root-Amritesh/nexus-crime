from typing import List, Optional
from geoalchemy2 import Geometry
from sqlalchemy import String, Float, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.postgres import Base


class Tower(Base):
    __tablename__ = "tower"

    tower_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    latitude: Mapped[float] = mapped_column(Float(precision=53), nullable=False)
    longitude: Mapped[float] = mapped_column(Float(precision=53), nullable=False)
    coverage_radius_km: Mapped[float] = mapped_column(Float(precision=53), nullable=False)
    geom: Mapped[Optional[str]] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True
    )

    # Relationships
    pings: Mapped[List["TowerPing"]] = relationship(
        "TowerPing", back_populates="tower", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_tower_geom", "geom", postgresql_using="gist"),
    )
