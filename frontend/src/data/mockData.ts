import type { Case, CrimeScene, Tower, Suspect, GraphData, FIREntity, EntityResolutionCandidate, AuditLogEntry, EvidenceItem, RiskWeightsConfig } from '../types';

export const DEFAULT_RISK_WEIGHTS: RiskWeightsConfig = {
  centrality: 0.30,
  colocation: 0.25,
  comovement: 0.25,
  call_frequency: 0.20,
  colocation_cap: 5,
  comovement_cap: 5,
};

export const MOCK_CASES: Case[] = [
  {
    case_reference: "CASE-2026-DEL-189",
    warrant_reference: "WR-DEL-HC-2026-8812 (BNSS §92 Authorization)",
    investigator_id: "INSP-R-SHARMA-742",
    title: "Coordinated Commercial Robbery & Inter-Scene Telecom Correlation",
    incident_date: "2026-08-14 to 2026-08-28",
    created_at: "2026-08-29T10:15:00Z",
    status: "ACTIVE_ANALYSIS",
    description: "Series of high-value coordinated commercial burglaries targeting wholesale bullion facilities across Connaught Place, Karol Bagh, Nehru Place, and Rohini Sector 18, involving cross-scene tower pings and encrypted call coordination.",
    stats: {
      total_pings: 5420,
      total_devices: 418,
      flagged_suspects: 6,
      crime_scenes_count: 4,
      communities_count: 2,
      calls_analyzed: 894,
      transactions_analyzed: 142,
    }
  },
  {
    case_reference: "CASE-2026-MUM-042",
    warrant_reference: "WR-MUM-MM-2026-4401 (BNSS §92 Authorization)",
    investigator_id: "ACP-K-DESHMUKH-109",
    title: "Bandra-BKC Financial Fraud & SIM-Array Analysis",
    incident_date: "2026-07-10 to 2026-07-22",
    created_at: "2026-08-01T14:30:00Z",
    status: "EVIDENCE_PREPARED",
    description: "Financial fraud ring operating via cloned IMEI devices and mule accounts across BKC, Andheri East, and Navi Mumbai commercial sectors.",
    stats: {
      total_pings: 3890,
      total_devices: 312,
      flagged_suspects: 4,
      crime_scenes_count: 3,
      communities_count: 2,
      calls_analyzed: 620,
      transactions_analyzed: 85,
    }
  }
];

export const MOCK_CRIME_SCENES: CrimeScene[] = [
  {
    scene_id: "scene_1",
    case_reference: "CASE-2026-DEL-189",
    name: "Scene 1: Connaught Place Outer Circle (Vault Facility)",
    latitude: 28.6315,
    longitude: 77.2167,
    time_window_start: "2026-08-15T19:00:00Z",
    time_window_end: "2026-08-15T21:30:00Z",
    incident_type: "Commercial Burglary & Vault Breach",
    description: "Depository vault breach; multiple masked perpetrators with communications lookout deployed outside."
  },
  {
    scene_id: "scene_2",
    case_reference: "CASE-2026-DEL-189",
    name: "Scene 2: Karol Bagh Commercial District",
    latitude: 28.6521,
    longitude: 77.1904,
    time_window_start: "2026-08-19T17:30:00Z",
    time_window_end: "2026-08-19T20:00:00Z",
    incident_type: "Transit Hijack & Bullion Snatch",
    description: "Transit van stopped along arterial road; localized RF interference detected in immediate perimeter."
  },
  {
    scene_id: "scene_3",
    case_reference: "CASE-2026-DEL-189",
    name: "Scene 3: Nehru Place Commercial Complex",
    latitude: 28.5494,
    longitude: 77.2536,
    time_window_start: "2026-08-23T13:45:00Z",
    time_window_end: "2026-08-23T16:15:00Z",
    incident_type: "Illegal Fund Handover & Extortion",
    description: "Unregulated cash handover point; financial transfer coordinated via cellular triggers."
  },
  {
    scene_id: "scene_4",
    case_reference: "CASE-2026-DEL-189",
    name: "Scene 4: Rohini Sector 18 Staging Area",
    latitude: 28.7360,
    longitude: 77.1328,
    time_window_start: "2026-08-27T22:00:00Z",
    time_window_end: "2026-08-28T04:00:00Z",
    incident_type: "Logistics Staging & Asset Redistribution",
    description: "Suspect staging facility where proceeds were processed and transport vehicles swapped."
  }
];

export const MOCK_TOWERS: Tower[] = [
  { tower_id: "T-101", name: "CP Inner-Radial Tower 4", latitude: 28.6310, longitude: 77.2180, coverage_radius_km: 0.85, operator: "Airtel Delhi-NCR" },
  { tower_id: "T-102", name: "Barakhamba Road Microcell", latitude: 28.6280, longitude: 77.2240, coverage_radius_km: 0.70, operator: "Jio Digital" },
  { tower_id: "T-103", name: "Karol Bagh Metro High-Gain", latitude: 28.6515, longitude: 77.1915, coverage_radius_km: 0.90, operator: "Vi Delhi" },
  { tower_id: "T-104", name: "Pusa Road Junction", latitude: 28.6440, longitude: 77.1820, coverage_radius_km: 1.10, operator: "Airtel Delhi-NCR" },
  { tower_id: "T-105", name: "Nehru Place Plaza Tower", latitude: 28.5488, longitude: 77.2529, coverage_radius_km: 0.80, operator: "Jio Digital" },
  { tower_id: "T-106", name: "Kalkaji Mandir Overpass", latitude: 28.5440, longitude: 77.2600, coverage_radius_km: 1.20, operator: "BSNL Delhi" },
  { tower_id: "T-107", name: "Rohini West Sector 18", latitude: 28.7355, longitude: 77.1320, coverage_radius_km: 1.30, operator: "Airtel Delhi-NCR" },
  { tower_id: "T-108", name: "Badli Industrial Area Pole", latitude: 28.7420, longitude: 77.1450, coverage_radius_km: 1.40, operator: "Vi Delhi" },
];

export const MOCK_SUSPECT_EVIDENCE: Record<string, EvidenceItem[]> = {
  "9a8f21e0b4": [
    { type: "CO_LOCATED_AT", tower_id: "T-101", scene_id: "scene_1", scene_name: "CP Outer Circle", timestamp: "2026-08-15T19:42:11Z", details: "Device active at T-101 within 42 mins of vault alarm trigger. Signal: -68 dBm." },
    { type: "CO_LOCATED_AT", tower_id: "T-103", scene_id: "scene_2", scene_name: "Karol Bagh District", timestamp: "2026-08-19T18:14:05Z", details: "Tower ping at T-103 during transit stop event. Signal: -74 dBm." },
    { type: "CO_LOCATED_AT", tower_id: "T-105", scene_id: "scene_3", scene_name: "Nehru Place Complex", timestamp: "2026-08-23T14:35:22Z", details: "Tower ping recorded at T-105 during financial handover window." },
    { type: "CO_MOVED_WITH", tower_id: "T-103 -> T-107", timestamp: "2026-08-19 & 2026-08-27", other_device_hash: "3b7c91a4f0", details: "Co-movement verified across 2 distinct calendar days with DEV-3B7C91A4F0." },
    { type: "CALLED", other_device_hash: "e5d284c17a", duration: 480, details: "14 voice sessions logged with staging node DEV-E5D284C17A." },
    { type: "TRANSACTED_WITH", other_device_hash: "7f4d19e83b", amount: 450000, details: "Banking transaction of ₹4,50,000 post-Karol Bagh incident." }
  ],
  "3b7c91a4f0": [
    { type: "CO_LOCATED_AT", tower_id: "T-101", scene_id: "scene_1", scene_name: "CP Outer Circle", timestamp: "2026-08-15T19:38:50Z", details: "Device active near T-101 during CP vault incident." },
    { type: "CO_LOCATED_AT", tower_id: "T-103", scene_id: "scene_2", scene_name: "Karol Bagh District", timestamp: "2026-08-19T18:05:12Z", details: "Active at T-103 during Karol Bagh incident window." },
    { type: "CO_MOVED_WITH", tower_id: "T-101 -> T-104", timestamp: "2026-08-15 & 2026-08-19", other_device_hash: "9a8f21e0b4", details: "Synchronized tower handovers within 6 mins window." },
    { type: "CALLED", other_device_hash: "9a8f21e0b4", duration: 320, details: "8 direct voice sessions coordinated with DEV-9A8F21E0B4." }
  ],
  "e5d284c17a": [
    { type: "CO_LOCATED_AT", tower_id: "T-103", scene_id: "scene_2", scene_name: "Karol Bagh District", timestamp: "2026-08-19T18:32:00Z", details: "Tower ping registered along transit perimeter." },
    { type: "CO_LOCATED_AT", tower_id: "T-107", scene_id: "scene_4", scene_name: "Rohini Staging Area", timestamp: "2026-08-27T23:14:00Z", details: "Active volume at staging tower T-107." },
    { type: "CALLED", other_device_hash: "9a8f21e0b4", duration: 540, details: "Frequent night calls preceding and succeeding operational windows." },
    { type: "TRANSACTED_WITH", other_device_hash: "c29e48a1f6", amount: 280000, details: "₹2,80,000 transferred to vector node DEV-C29E48A1F6." }
  ],
  "7f4d19e83b": [
    { type: "CO_LOCATED_AT", tower_id: "T-105", scene_id: "scene_3", scene_name: "Nehru Place Complex", timestamp: "2026-08-23T14:40:15Z", details: "Pinged inside Nehru Place commercial sector during handover." },
    { type: "CO_LOCATED_AT", tower_id: "T-107", scene_id: "scene_4", scene_name: "Rohini Staging Area", timestamp: "2026-08-28T01:10:00Z", details: "Present at staging area during post-incident consolidation." },
    { type: "TRANSACTED_WITH", other_device_hash: "9a8f21e0b4", amount: 450000, details: "Financial receiver node for correlated funds." }
  ],
  "c29e48a1f6": [
    { type: "CO_LOCATED_AT", tower_id: "T-101", scene_id: "scene_1", scene_name: "CP Outer Circle", timestamp: "2026-08-15T20:10:00Z", details: "Positioned along transit corridor near Connaught Place." },
    { type: "CO_LOCATED_AT", tower_id: "T-105", scene_id: "scene_3", scene_name: "Nehru Place Complex", timestamp: "2026-08-23T14:28:00Z", details: "Transit ping recorded at Nehru Place arterial route." },
    { type: "CALLED", other_device_hash: "e5d284c17a", duration: 180, details: "5 coordination calls with staging node DEV-E5D284C17A." }
  ],
  "1d6b83f9e2": [
    { type: "CO_LOCATED_AT", tower_id: "T-103", scene_id: "scene_2", scene_name: "Karol Bagh District", timestamp: "2026-08-19T18:20:00Z", details: "Secondary observer device active at Karol Bagh perimeter." },
    { type: "CALLED", other_device_hash: "3b7c91a4f0", duration: 95, details: "2 short trigger calls with DEV-3B7C91A4F0." }
  ]
};

export const MOCK_SUSPECTS: Suspect[] = [
  {
    device_hash: "9a8f21e0b4",
    alias: "Primary Correlated Target (Hub-01)",
    risk_score: 0.94,
    score_breakdown: {
      centrality: 0.92,
      colocation_count: 3,
      comovement_count: 2,
      call_frequency: 18,
      centrality_contribution: 0.276,
      colocation_contribution: 0.150,
      comovement_contribution: 0.100,
      call_contribution: 0.200
    },
    flagged_scenes: ["scene_1", "scene_2", "scene_3"],
    community_id: 1,
    centrality_score: 0.92,
    co_location_count: 3,
    co_movement_count: 2,
    call_frequency: 18,
    anomaly_flag: true,
    notes: "High-degree network hub. Correlated across 3 distinct crime scenes with heavy call volume and financial transfers."
  },
  {
    device_hash: "3b7c91a4f0",
    alias: "Co-Movement Target (Lookout-01)",
    risk_score: 0.81,
    score_breakdown: {
      centrality: 0.78,
      colocation_count: 2,
      comovement_count: 2,
      call_frequency: 12,
      centrality_contribution: 0.234,
      colocation_contribution: 0.100,
      comovement_contribution: 0.100,
      call_contribution: 0.160
    },
    flagged_scenes: ["scene_1", "scene_2"],
    community_id: 1,
    centrality_score: 0.78,
    co_location_count: 2,
    co_movement_count: 2,
    call_frequency: 12,
    notes: "Direct co-movement associate of Hub-01 across multiple incidents; acted as operational perimeter observer."
  },
  {
    device_hash: "e5d284c17a",
    alias: "Logistics Bridge (Staging-01)",
    risk_score: 0.76,
    score_breakdown: {
      centrality: 0.80,
      colocation_count: 2,
      comovement_count: 1,
      call_frequency: 14,
      centrality_contribution: 0.240,
      colocation_contribution: 0.100,
      comovement_contribution: 0.050,
      call_contribution: 0.180
    },
    flagged_scenes: ["scene_2", "scene_4"],
    community_id: 2,
    centrality_score: 0.80,
    co_location_count: 2,
    co_movement_count: 1,
    call_frequency: 14,
    notes: "Key bridge between field team and staging facility network; high betweenness centrality."
  },
  {
    device_hash: "7f4d19e83b",
    alias: "Financial Transact Target (Transact-01)",
    risk_score: 0.71,
    score_breakdown: {
      centrality: 0.65,
      colocation_count: 2,
      comovement_count: 1,
      call_frequency: 9,
      centrality_contribution: 0.195,
      colocation_contribution: 0.100,
      comovement_contribution: 0.050,
      call_contribution: 0.120
    },
    flagged_scenes: ["scene_3", "scene_4"],
    community_id: 2,
    centrality_score: 0.65,
    co_location_count: 2,
    co_movement_count: 1,
    call_frequency: 9,
    notes: "Financial receiver node handling fund distribution at Nehru Place and Rohini."
  },
  {
    device_hash: "c29e48a1f6",
    alias: "Transit Corridor Target (Vector-01)",
    risk_score: 0.68,
    score_breakdown: {
      centrality: 0.54,
      colocation_count: 2,
      comovement_count: 1,
      call_frequency: 8,
      centrality_contribution: 0.162,
      colocation_contribution: 0.100,
      comovement_contribution: 0.050,
      call_contribution: 0.100
    },
    flagged_scenes: ["scene_1", "scene_3"],
    community_id: 1,
    centrality_score: 0.54,
    co_location_count: 2,
    co_movement_count: 1,
    call_frequency: 8,
    notes: "Co-located along Connaught Place and Nehru Place corridors during critical operational timestamps."
  },
  {
    device_hash: "1d6b83f9e2",
    alias: "Perimeter Sensor Node (Observer-01)",
    risk_score: 0.42,
    score_breakdown: {
      centrality: 0.35,
      colocation_count: 1,
      comovement_count: 1,
      call_frequency: 4,
      centrality_contribution: 0.105,
      colocation_contribution: 0.050,
      comovement_contribution: 0.050,
      call_contribution: 0.050
    },
    flagged_scenes: ["scene_2"],
    community_id: 1,
    centrality_score: 0.35,
    co_location_count: 1,
    co_movement_count: 1,
    call_frequency: 4,
    notes: "Secondary peripheral device with single-scene co-location and low network centrality."
  }
];

export const MOCK_GRAPH_DATA: GraphData = {
  nodes: [
    { id: "9a8f21e0b4", label: "DEV-9A8F21E0B4", type: "person", risk_score: 0.94, community: 1, centrality: 0.92, colocation_count: 3, alias: "Hub-01" },
    { id: "3b7c91a4f0", label: "DEV-3B7C91A4F0", type: "person", risk_score: 0.81, community: 1, centrality: 0.78, colocation_count: 2, alias: "Lookout-01" },
    { id: "e5d284c17a", label: "DEV-E5D284C17A", type: "person", risk_score: 0.76, community: 2, centrality: 0.80, colocation_count: 2, alias: "Staging-01" },
    { id: "7f4d19e83b", label: "DEV-7F4D19E83B", type: "person", risk_score: 0.71, community: 2, centrality: 0.65, colocation_count: 2, alias: "Transact-01" },
    { id: "c29e48a1f6", label: "DEV-C29E48A1F6", type: "person", risk_score: 0.68, community: 1, centrality: 0.54, colocation_count: 2, alias: "Vector-01" },
    { id: "1d6b83f9e2", label: "DEV-1D6B83F9E2", type: "device", risk_score: 0.42, community: 1, centrality: 0.35, colocation_count: 1, alias: "Observer-01" },
    { id: "scene_1", label: "Connaught Place Vault", type: "location", risk_score: 0.0, community: 0, centrality: 0.6, colocation_count: 3 },
    { id: "scene_2", label: "Karol Bagh District", type: "location", risk_score: 0.0, community: 0, centrality: 0.7, colocation_count: 3 },
    { id: "scene_3", label: "Nehru Place Complex", type: "location", risk_score: 0.0, community: 0, centrality: 0.5, colocation_count: 3 },
    { id: "scene_4", label: "Rohini Staging Area", type: "location", risk_score: 0.0, community: 0, centrality: 0.4, colocation_count: 2 },
  ],
  edges: [
    { id: "e1", source: "9a8f21e0b4", target: "3b7c91a4f0", type: "CO_MOVED_WITH", weight: 2, evidence: MOCK_SUSPECT_EVIDENCE["9a8f21e0b4"] },
    { id: "e2", source: "9a8f21e0b4", target: "3b7c91a4f0", type: "CALLED", weight: 8, evidence: MOCK_SUSPECT_EVIDENCE["9a8f21e0b4"] },
    { id: "e3", source: "9a8f21e0b4", target: "e5d284c17a", type: "CALLED", weight: 14, evidence: MOCK_SUSPECT_EVIDENCE["9a8f21e0b4"] },
    { id: "e4", source: "9a8f21e0b4", target: "7f4d19e83b", type: "TRANSACTED_WITH", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["9a8f21e0b4"] },
    { id: "e5", source: "e5d284c17a", target: "7f4d19e83b", type: "CO_LOCATED_AT", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["e5d284c17a"] },
    { id: "e6", source: "e5d284c17a", target: "c29e48a1f6", type: "TRANSACTED_WITH", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["e5d284c17a"] },
    { id: "e7", source: "9a8f21e0b4", target: "c29e48a1f6", type: "CO_LOCATED_AT", weight: 2, evidence: MOCK_SUSPECT_EVIDENCE["9a8f21e0b4"] },
    { id: "e8", source: "3b7c91a4f0", target: "1d6b83f9e2", type: "CALLED", weight: 2, evidence: MOCK_SUSPECT_EVIDENCE["3b7c91a4f0"] },
    { id: "e9", source: "9a8f21e0b4", target: "scene_1", type: "CO_LOCATED_AT", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["9a8f21e0b4"] },
    { id: "e10", source: "9a8f21e0b4", target: "scene_2", type: "CO_LOCATED_AT", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["9a8f21e0b4"] },
    { id: "e11", source: "9a8f21e0b4", target: "scene_3", type: "CO_LOCATED_AT", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["9a8f21e0b4"] },
    { id: "e12", source: "3b7c91a4f0", target: "scene_1", type: "CO_LOCATED_AT", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["3b7c91a4f0"] },
    { id: "e13", source: "3b7c91a4f0", target: "scene_2", type: "CO_LOCATED_AT", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["3b7c91a4f0"] },
    { id: "e14", source: "e5d284c17a", target: "scene_4", type: "CO_LOCATED_AT", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["e5d284c17a"] },
    { id: "e15", source: "7f4d19e83b", target: "scene_4", type: "CO_LOCATED_AT", weight: 1, evidence: MOCK_SUSPECT_EVIDENCE["7f4d19e83b"] },
  ]
};

export const MOCK_FIR_TEXT = `FIRST INFORMATION REPORT (FIR No. 412/2026 - Special Cell, Lodhi Colony)
Under Sections 309(4), 310(2), 61(2) of Bharatiya Nyaya Sanhita (BNS, 2023)
Case Subject: Multi-Scene Coordinated Commercial Robbery & Inter-Scene Telecom Correlation

Official Statement:
On 15-08-2026 at 19:30 hrs, four armed individuals entered the Connaught Place Vault facility. Primary operative referenced in communications as DEV-9A8F21E0B4 was identified on cellular perimeter. A perimeter lookout near Regal Cinema was observed communicating via device ending in digits 8812. The perpetrators departed via a dark Bajaj Pulsar motorcycle bearing partial registration DL-4S-NA-88**.

Subsequent correlation links this occurrence to the Karol Bagh Commercial District incident on 19-08-2026 where staging node DEV-E5D284C17A was logged along Ajmal Khan Road. Asset transfers were routed through financial node DEV-7F4D19E83B near Nehru Place and staged at Sector 18 Rohini. Surveillance logs indicate coordinated voice sessions between DEV-9A8F21E0B4 and DEV-3B7C91A4F0 during both operational intervals.`;

export const MOCK_FIR_ENTITIES: FIREntity[] = [
  { id: "ent-1", text: "Special Cell, Lodhi Colony", type: "ORG", start_char: 38, end_char: 65, confidence: 0.98, status: "accepted" },
  { id: "ent-2", text: "Connaught Place Vault", type: "LOCATION", start_char: 260, end_char: 281, confidence: 0.96, status: "accepted" },
  { id: "ent-3", text: "DEV-9A8F21E0B4", type: "PERSON", start_char: 337, end_char: 351, confidence: 0.94, status: "accepted" },
  { id: "ent-4", text: "Regal Cinema", type: "LOCATION", start_char: 419, end_char: 431, confidence: 0.92, status: "accepted" },
  { id: "ent-5", text: "Bajaj Pulsar", type: "VEHICLE", start_char: 508, end_char: 520, confidence: 0.91, status: "accepted" },
  { id: "ent-6", text: "DL-4S-NA-88**", type: "VEHICLE", start_char: 555, end_char: 568, confidence: 0.88, status: "pending_review" },
  { id: "ent-7", text: "Karol Bagh Commercial District", type: "LOCATION", start_char: 624, end_char: 654, confidence: 0.95, status: "accepted" },
  { id: "ent-8", text: "DEV-E5D284C17A", type: "PERSON", start_char: 697, end_char: 711, confidence: 0.93, status: "accepted" },
  { id: "ent-9", text: "Ajmal Khan Road", type: "LOCATION", start_char: 732, end_char: 747, confidence: 0.94, status: "accepted" },
  { id: "ent-10", text: "DEV-7F4D19E83B", type: "PERSON", start_char: 797, end_char: 811, confidence: 0.89, status: "pending_review" },
  { id: "ent-11", text: "Nehru Place", type: "LOCATION", start_char: 817, end_char: 828, confidence: 0.97, status: "accepted" },
  { id: "ent-12", text: "Sector 18 Rohini", type: "LOCATION", start_char: 843, end_char: 859, confidence: 0.95, status: "accepted" },
  { id: "ent-13", text: "DEV-9A8F21E0B4", type: "PERSON", start_char: 919, end_char: 933, confidence: 0.86, status: "pending_review" },
  { id: "ent-14", text: "DEV-3B7C91A4F0", type: "PERSON", start_char: 938, end_char: 952, confidence: 0.92, status: "accepted" },
];

export const MOCK_ENTITY_RESOLUTION_QUEUE: EntityResolutionCandidate[] = [
  {
    id: "res-101",
    entity_a: { name: "DEV-9A8F21E0B4 (Primary Hub)", type: "PERSON", source: "FIR No. 412/2026", hash: "9a8f21e0b4" },
    entity_b: { name: "DEV-9A8F21E0B4 (Cellular Ping)", type: "PERSON", source: "Tower Dump T-101", hash: "9a8f21e0b4" },
    similarity_score: 0.89,
    status: "pending",
    reason: "Cryptographic hash match in 70-90% corridor across Connaught Place and Karol Bagh sectors."
  },
  {
    id: "res-102",
    entity_a: { name: "DEV-7F4D19E83B (Transact Node)", type: "PERSON", source: "Financial Ledger #88", hash: "7f4d19e83b" },
    entity_b: { name: "DEV-7F4D19E83B (Nehru Place Ping)", type: "PERSON", source: "Tower Dump T-105", hash: "7f4d19e83b" },
    similarity_score: 0.78,
    status: "pending",
    reason: "Spatial-temporal correlation between UPI transfer timestamp and cellular sector occupancy."
  },
  {
    id: "res-103",
    entity_a: { name: "DEV-E5D284C17A (Staging)", type: "PERSON", source: "FIR No. 412/2026", hash: "e5d284c17a" },
    entity_b: { name: "DEV-E5D284C17A (Rohini Ping)", type: "PERSON", source: "Tower Dump T-107", hash: "e5d284c17a" },
    similarity_score: 0.94,
    status: "merged",
    reason: "Confidence ≥90% with matching spatial sector in Rohini Sector 18. Auto-merged under BNSS §92 rule."
  }
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud-901",
    case_reference: "CASE-2026-DEL-189",
    investigator_id: "INSP-R-SHARMA-742",
    action: "TOWER_DUMP_INGESTION",
    timestamp: "2026-08-29T10:18:22Z",
    details: "Ingested 5,420 tower pings across 8 cell towers under court warrant WR-DEL-HC-2026-8812.",
    warrant_reference: "WR-DEL-HC-2026-8812 (BNSS §92)",
    status: "VERIFIED"
  },
  {
    id: "aud-902",
    case_reference: "CASE-2026-DEL-189",
    investigator_id: "SYSTEM_AI_ENGINE",
    action: "CORRELATION_PIPELINE_COMPLETE",
    timestamp: "2026-08-29T10:18:48Z",
    details: "PostGIS radius correlation (ST_DWithin) surfaced 6 multi-scene targets; 2 co-movement clusters.",
    warrant_reference: "WR-DEL-HC-2026-8812",
    status: "LOGGED"
  },
  {
    id: "aud-903",
    case_reference: "CASE-2026-DEL-189",
    investigator_id: "SYSTEM_GRAPH_BUILDER",
    action: "NEO4J_GDS_ANALYTICS",
    timestamp: "2026-08-29T10:19:04Z",
    details: "PageRank and Louvain community detection finished. Evidence arrays attached to 15 edges.",
    warrant_reference: "WR-DEL-HC-2026-8812",
    status: "LOGGED"
  },
  {
    id: "aud-904",
    case_reference: "CASE-2026-DEL-189",
    investigator_id: "INSP-R-SHARMA-742",
    action: "ENTITY_MERGE_APPROVED",
    timestamp: "2026-08-29T11:05:10Z",
    details: "Approved merge of staging node DEV-E5D284C17A records under BNSS §92 verification.",
    warrant_reference: "WR-DEL-HC-2026-8812",
    status: "VERIFIED"
  }
];

export const MOCK_DEVICE_TIMELINE: Record<string, { time: string; tower_id: string; tower_name: string; scene_proximity?: string; lat: number; lng: number }[]> = {
  "9a8f21e0b4": [
    { time: "2026-08-15 18:45", tower_id: "T-101", tower_name: "CP Inner-Radial Tower 4", scene_proximity: "Scene 1: CP Vault Facility", lat: 28.6310, lng: 77.2180 },
    { time: "2026-08-15 19:42", tower_id: "T-101", tower_name: "CP Inner-Radial Tower 4", scene_proximity: "Scene 1: CP Vault Facility (During Incident)", lat: 28.6310, lng: 77.2180 },
    { time: "2026-08-15 20:30", tower_id: "T-104", tower_name: "Pusa Road Junction", scene_proximity: "Transit Corridor", lat: 28.6440, lng: 77.1820 },
    { time: "2026-08-19 17:50", tower_id: "T-103", tower_name: "Karol Bagh Metro High-Gain", scene_proximity: "Scene 2: Karol Bagh District", lat: 28.6515, lng: 77.1915 },
    { time: "2026-08-19 18:14", tower_id: "T-103", tower_name: "Karol Bagh Metro High-Gain", scene_proximity: "Scene 2: Karol Bagh District (During Incident)", lat: 28.6515, lng: 77.1915 },
    { time: "2026-08-23 14:15", tower_id: "T-105", tower_name: "Nehru Place Plaza Tower", scene_proximity: "Scene 3: Nehru Place Complex", lat: 28.5488, lng: 77.2529 },
    { time: "2026-08-27 23:45", tower_id: "T-107", tower_name: "Rohini West Sector 18", scene_proximity: "Scene 4: Rohini Staging Area", lat: 28.7355, lng: 77.1320 },
  ],
  "3b7c91a4f0": [
    { time: "2026-08-15 18:50", tower_id: "T-101", tower_name: "CP Inner-Radial Tower 4", scene_proximity: "Scene 1: CP Vault Facility", lat: 28.6310, lng: 77.2180 },
    { time: "2026-08-15 19:38", tower_id: "T-101", tower_name: "CP Inner-Radial Tower 4", scene_proximity: "Scene 1: CP Vault Facility", lat: 28.6310, lng: 77.2180 },
    { time: "2026-08-19 17:45", tower_id: "T-103", tower_name: "Karol Bagh Metro High-Gain", scene_proximity: "Scene 2: Karol Bagh District", lat: 28.6515, lng: 77.1915 },
    { time: "2026-08-27 22:30", tower_id: "T-107", tower_name: "Rohini West Sector 18", scene_proximity: "Scene 4: Rohini Staging Area", lat: 28.7355, lng: 77.1320 },
  ]
};
