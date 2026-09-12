"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-31 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Ensure PostGIS extension exists
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # 2. Table: case
    op.create_table(
        'case',
        sa.Column('case_reference', sa.String(length=128), nullable=False),
        sa.Column('warrant_reference', sa.String(length=128), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('investigator_id', sa.String(length=128), nullable=False),
        sa.PrimaryKeyConstraint('case_reference')
    )

    # 3. Table: tower
    op.create_table(
        'tower',
        sa.Column('tower_id', sa.String(length=64), nullable=False),
        sa.Column('latitude', sa.Float(precision=53), nullable=False),
        sa.Column('longitude', sa.Float(precision=53), nullable=False),
        sa.Column('coverage_radius_km', sa.Float(precision=53), nullable=False),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=True),
        sa.PrimaryKeyConstraint('tower_id')
    )
    # GiST Index on tower(geom)
    op.create_index('idx_tower_geom', 'tower', ['geom'], unique=False, postgresql_using='gist')

    # 4. Table: crime_scene
    op.create_table(
        'crime_scene',
        sa.Column('scene_id', sa.String(length=64), nullable=False),
        sa.Column('case_reference', sa.String(length=128), nullable=False),
        sa.Column('latitude', sa.Float(precision=53), nullable=False),
        sa.Column('longitude', sa.Float(precision=53), nullable=False),
        sa.Column('time_window_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('time_window_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('incident_type', sa.String(length=64), nullable=False),
        sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, from_text='ST_GeomFromEWKT', name='geometry'), nullable=False),
        sa.ForeignKeyConstraint(['case_reference'], ['case.case_reference'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('scene_id')
    )
    # GiST Index on crime_scene(geom) & B-Tree Index on crime_scene(case_reference)
    op.create_index('idx_crime_scene_case', 'crime_scene', ['case_reference'], unique=False)
    op.create_index('idx_crime_scene_geom', 'crime_scene', ['geom'], unique=False, postgresql_using='gist')

    # 5. Table: tower_ping
    op.create_table(
        'tower_ping',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('phone_hash', sa.String(length=64), nullable=False),
        sa.Column('tower_id', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('signal_strength', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['tower_id'], ['tower.tower_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phone_hash', 'tower_id', 'timestamp', name='uq_tower_ping_composite')
    )
    # B-Tree Indexes on tower_ping
    op.create_index('idx_tower_ping_phone_hash', 'tower_ping', ['phone_hash'], unique=False)
    op.create_index('idx_tower_ping_timestamp', 'tower_ping', ['timestamp'], unique=False)
    op.create_index('idx_tower_ping_tower_id', 'tower_ping', ['tower_id'], unique=False)

    # 6. Table: cdr_record
    op.create_table(
        'cdr_record',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('caller_hash', sa.String(length=64), nullable=False),
        sa.Column('callee_hash', sa.String(length=64), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_seconds', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # Composite B-Tree & B-Tree Index on cdr_record
    op.create_index('idx_cdr_record_pairs', 'cdr_record', ['caller_hash', 'callee_hash'], unique=False)
    op.create_index('idx_cdr_record_timestamp', 'cdr_record', ['timestamp'], unique=False)

    # 7. Table: financial_record
    op.create_table(
        'financial_record',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('sender_hash', sa.String(length=64), nullable=False),
        sa.Column('receiver_hash', sa.String(length=64), nullable=False),
        sa.Column('amount', sa.Float(precision=53), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # Composite B-Tree & B-Tree Index on financial_record
    op.create_index('idx_financial_record_pairs', 'financial_record', ['sender_hash', 'receiver_hash'], unique=False)
    op.create_index('idx_financial_record_timestamp', 'financial_record', ['timestamp'], unique=False)

    # 8. Table: audit_log
    op.create_table(
        'audit_log',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('case_reference', sa.String(length=128), nullable=False),
        sa.Column('action', sa.String(length=128), nullable=False),
        sa.Column('investigator_id', sa.String(length=128), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['case_reference'], ['case.case_reference'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    # B-Tree Indexes on audit_log
    op.create_index('idx_audit_log_case', 'audit_log', ['case_reference'], unique=False)
    op.create_index('idx_audit_log_timestamp', 'audit_log', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_audit_log_timestamp', table_name='audit_log')
    op.drop_index('idx_audit_log_case', table_name='audit_log')
    op.drop_table('audit_log')

    op.drop_index('idx_financial_record_timestamp', table_name='financial_record')
    op.drop_index('idx_financial_record_pairs', table_name='financial_record')
    op.drop_table('financial_record')

    op.drop_index('idx_cdr_record_timestamp', table_name='cdr_record')
    op.drop_index('idx_cdr_record_pairs', table_name='cdr_record')
    op.drop_table('cdr_record')

    op.drop_index('idx_tower_ping_tower_id', table_name='tower_ping')
    op.drop_index('idx_tower_ping_timestamp', table_name='tower_ping')
    op.drop_index('idx_tower_ping_phone_hash', table_name='tower_ping')
    op.drop_table('tower_ping')

    op.drop_index('idx_crime_scene_geom', table_name='crime_scene', postgresql_using='gist')
    op.drop_index('idx_crime_scene_case', table_name='crime_scene')
    op.drop_table('crime_scene')

    op.drop_index('idx_tower_geom', table_name='tower', postgresql_using='gist')
    op.drop_table('tower')

    op.drop_table('case')
