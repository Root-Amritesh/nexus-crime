-- ============================================================================
-- NEXUS-CRIME Reference PostgreSQL + PostGIS Schema (DDL)
-- Blueprint Section 10.1 / PRD Section 17
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Case (Legal Container)
CREATE TABLE IF NOT EXISTS "case" (
    case_reference VARCHAR(128) PRIMARY KEY,
    warrant_reference VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    investigator_id VARCHAR(128) NOT NULL
);

-- 2. Tower Metadata
CREATE TABLE IF NOT EXISTS tower (
    tower_id VARCHAR(64) PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    coverage_radius_km DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326)
);
CREATE INDEX IF NOT EXISTS idx_tower_geom ON tower USING gist (geom);

-- 3. Crime Scene
CREATE TABLE IF NOT EXISTS crime_scene (
    scene_id VARCHAR(64) PRIMARY KEY,
    case_reference VARCHAR(128) NOT NULL REFERENCES "case"(case_reference) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    incident_type VARCHAR(64) NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL
);
-- GiST spatial index on crime_scene geometry is non-negotiable for ST_DWithin performance
CREATE INDEX IF NOT EXISTS idx_crime_scene_geom ON crime_scene USING gist (geom);
CREATE INDEX IF NOT EXISTS idx_crime_scene_case ON crime_scene(case_reference);

-- 4. Tower Ping Records
CREATE TABLE IF NOT EXISTS tower_ping (
    id BIGSERIAL PRIMARY KEY,
    phone_hash VARCHAR(64) NOT NULL,
    tower_id VARCHAR(64) NOT NULL REFERENCES tower(tower_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    signal_strength INTEGER NOT NULL,
    CONSTRAINT uq_tower_ping_composite UNIQUE (phone_hash, tower_id, timestamp)
);
-- B-tree indexes for fast device lookups and time-window filtering
CREATE INDEX IF NOT EXISTS idx_tower_ping_phone_hash ON tower_ping(phone_hash);
CREATE INDEX IF NOT EXISTS idx_tower_ping_timestamp ON tower_ping(timestamp);
CREATE INDEX IF NOT EXISTS idx_tower_ping_tower_id ON tower_ping(tower_id);

-- 5. Call Detail Records (CDR)
CREATE TABLE IF NOT EXISTS cdr_record (
    id BIGSERIAL PRIMARY KEY,
    caller_hash VARCHAR(64) NOT NULL,
    callee_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER NOT NULL
);
-- Composite B-tree for caller/callee pair lookups
CREATE INDEX IF NOT EXISTS idx_cdr_record_pairs ON cdr_record(caller_hash, callee_hash);
CREATE INDEX IF NOT EXISTS idx_cdr_record_timestamp ON cdr_record(timestamp);

-- 6. Financial Records
CREATE TABLE IF NOT EXISTS financial_record (
    id BIGSERIAL PRIMARY KEY,
    sender_hash VARCHAR(64) NOT NULL,
    receiver_hash VARCHAR(64) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_financial_record_pairs ON financial_record(sender_hash, receiver_hash);
CREATE INDEX IF NOT EXISTS idx_financial_record_timestamp ON financial_record(timestamp);

-- 7. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    case_reference VARCHAR(128) NOT NULL REFERENCES "case"(case_reference) ON DELETE CASCADE,
    action VARCHAR(128) NOT NULL,
    investigator_id VARCHAR(128) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_case ON audit_log(case_reference);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);

-- 8. Correlation Staging
CREATE TABLE IF NOT EXISTS correlation_staging (
    id BIGSERIAL PRIMARY KEY,
    case_reference VARCHAR(128) NOT NULL REFERENCES "case"(case_reference) ON DELETE CASCADE,
    job_id VARCHAR(64) NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_correlation_staging_case ON correlation_staging(case_reference);
CREATE INDEX IF NOT EXISTS idx_correlation_staging_job ON correlation_staging(job_id);

-- 9. Suspect Risk Score
CREATE TABLE IF NOT EXISTS suspect_risk_score (
    id BIGSERIAL PRIMARY KEY,
    case_reference VARCHAR(128) NOT NULL REFERENCES "case"(case_reference) ON DELETE CASCADE,
    device_hash VARCHAR(64) NOT NULL,
    risk_score DOUBLE PRECISION NOT NULL,
    score_breakdown JSONB NOT NULL,
    flagged_scenes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suspect_risk_case ON suspect_risk_score(case_reference);
CREATE INDEX IF NOT EXISTS idx_suspect_risk_device ON suspect_risk_score(device_hash);
CREATE INDEX IF NOT EXISTS idx_suspect_risk_score ON suspect_risk_score(risk_score);

