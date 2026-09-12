// ============================================================================
// NEXUS-CRIME Neo4j Constraints & Indexes
// Blueprint Section 10.2 / 10.3
// ============================================================================

// 1. Device uniqueness constraint (Mandatory)
CREATE CONSTRAINT constraint_device_phone_hash IF NOT EXISTS
FOR (d:Device)
REQUIRE d.phone_hash IS UNIQUE;

// 2. Person identity constraint (Optional / Post-resolution)
CREATE CONSTRAINT constraint_person_id IF NOT EXISTS
FOR (p:Person)
REQUIRE p.person_id IS UNIQUE;

// 3. Location node index
CREATE INDEX idx_location_id IF NOT EXISTS
FOR (l:Location)
ON (l.location_id);

// 4. Node lookup indexes for fast traversal and write matching
CREATE INDEX idx_device_community IF NOT EXISTS
FOR (d:Device)
ON (d.community_id);

CREATE INDEX idx_device_risk IF NOT EXISTS
FOR (d:Device)
ON (d.risk_score);
