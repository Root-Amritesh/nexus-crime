from datetime import datetime
from geoalchemy2 import Geometry
from sqlalchemy import String, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.postgres import Base


class CrimeScene(Base):
    __tablename__ = "crime_scene"

    scene_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_reference: Mapped[str] = mapped_column(
        String(128), ForeignKey("case.case_reference", ondelete="CASCADE"), nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float(precision=53), nullable=False)
    longitude: Mapped[float] = mapped_column(Float(precision=53), nullable=False)
    time_window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    time_window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    incident_type: Mapped[str] = mapped_column(String(64), nullable=False)
    geom: Mapped[str] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False), nullable=False
    )

    # Relationship
    case: Mapped["Case"] = relationship("Case", back_populates="crime_scenes")

    __table_args__ = (
        Index("idx_crime_scene_geom", "geom", postgresql_using="gist"),
        Index("idx_crime_scene_case", "case_reference"),
    )
