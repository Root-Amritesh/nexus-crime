export type BackendStatus = 'CONNECTED' | 'DISCONNECTED' | 'LOADING' | 'ERROR';

export type RelationshipType = 
  | 'CO_LOCATED_AT' 
  | 'CO_MOVED_WITH' 
  | 'CALLED' 
  | 'TRANSACTED_WITH';

export type EntityType = 
  | 'PERSON' 
  | 'LOCATION' 
  | 'PHONE' 
  | 'VEHICLE' 
  | 'ORG';

export interface CrimeScene {
  scene_id: string;
  case_reference: string;
  name: string;
  latitude: number;
  longitude: number;
  time_window_start: string;
  time_window_end: string;
  incident_type: string;
  description?: string;
}

export interface Tower {
  tower_id: string;
  name: string;
  latitude: number;
  longitude: number;
  coverage_radius_km: number;
  operator?: string;
}

export interface TowerPing {
  id: number;
  phone_hash: string;
  tower_id: string;
  timestamp: string;
  signal_strength: number;
}

export interface CDRRecord {
  id: number;
  caller_hash: string;
  callee_hash: string;
  timestamp: string;
  duration_seconds: number;
}

export interface FinancialRecord {
  id: number;
  sender_hash: string;
  receiver_hash: string;
  amount: number;
  currency?: string;
  timestamp: string;
  transaction_type?: string;
}

export interface EvidenceItem {
  type: RelationshipType | 'FIR_ENTITY';
  tower_id?: string;
  timestamp?: string;
  scene_id?: string;
  scene_name?: string;
  other_device_hash?: string;
  amount?: number;
  duration?: number;
  details: string;
  source_record_id?: string;
}

export interface ScoreBreakdown {
  centrality: number;
  colocation_count: number;
  comovement_count: number;
  call_frequency: number;
  centrality_contribution: number;
  colocation_contribution: number;
  comovement_contribution: number;
  call_contribution: number;
}

export interface Suspect {
  device_hash: string;
  alias?: string;
  risk_score: number;
  score_breakdown: ScoreBreakdown;
  flagged_scenes: string[];
  community_id: number;
  centrality_score: number;
  co_location_count: number;
  co_movement_count: number;
  call_frequency: number;
  anomaly_flag?: boolean;
  notes?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'device' | 'person' | 'location';
  risk_score: number;
  community: number;
  centrality: number;
  colocation_count: number;
  alias?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  weight: number;
  evidence: EvidenceItem[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface FIREntity {
  id: string;
  text: string;
  type: EntityType;
  start_char: number;
  end_char: number;
  confidence: number;
  status: 'accepted' | 'pending_review' | 'flagged';
}

export interface EntityResolutionCandidate {
  id: string;
  entity_a: { name: string; type: EntityType; source: string; hash?: string };
  entity_b: { name: string; type: EntityType; source: string; hash?: string };
  similarity_score: number; // e.g. 0.84 (84%)
  status: 'pending' | 'merged' | 'rejected';
  reason: string;
}

export interface AuditLogEntry {
  id: string;
  case_reference: string;
  investigator_id: string;
  action: string;
  timestamp: string;
  details: string;
  warrant_reference: string;
  status: 'VERIFIED' | 'LOGGED';
}

export interface Case {
  case_reference: string;
  warrant_reference: string;
  investigator_id: string;
  title: string;
  incident_date: string;
  created_at: string;
  status: 'ACTIVE_ANALYSIS' | 'EVIDENCE_PREPARED' | 'ARCHIVED';
  description: string;
  stats: {
    total_pings: number;
    total_devices: number;
    flagged_suspects: number;
    crime_scenes_count: number;
    communities_count: number;
    calls_analyzed: number;
    transactions_analyzed: number;
  };
}

export interface IngestedRecord {
  id: string;
  type: 'FIR' | 'CDR' | 'FINANCIAL' | 'SURVEILLANCE' | 'ENTITY';
  source_reference: string;
  entities_extracted: number;
  relationships_created: number;
  status: 'PENDING_REVIEW' | 'PROCESSED' | 'MERGED' | 'REJECTED';
  timestamp: string;
  summary: string;
  raw_payload: any;
  extracted_entities?: FIREntity[];
}

export interface RiskWeightsConfig {
  centrality: number;      // default 0.30
  colocation: number;      // default 0.25
  comovement: number;      // default 0.25
  call_frequency: number;  // default 0.20
  colocation_cap: number;  // default 5
  comovement_cap: number;  // default 5
}
