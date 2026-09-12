Base path: /api/v1. All endpoints return JSON. URI-versioned; breaking changes get a new prefix, never in-place field removal.

POST /upload/tower-dump
- Auth: case_reference required form field
- Inputs: multipart/form-data — case_reference: string, file: CSV (phone_hash, tower_id, timestamp, signal_strength)
- Outputs: { status, records_ingested, records_rejected, job_id }
- Validation: all 4 columns required; timestamp ISO 8601; tower_id must exist in tower metadata
- Errors: MISSING_CASE_REFERENCE (422), INVALID_SCHEMA (400), UNKNOWN_TOWER_ID (400)
- Status codes: 202 Accepted, 400, 422

POST /upload/cdr
- Same contract shape; schema caller_hash, callee_hash, timestamp, duration

POST /upload/financial
- Same contract shape; schema sender_hash, receiver_hash, amount, timestamp

POST /upload/fir-text
- Inputs: { case_reference: string, text: string }
- Outputs: { entities_extracted: [...], job_id: uuid }

GET /cases/{case_id}/suspects
- Outputs:
{
  "suspects": [
    {
      "device_hash": "string",
      "risk_score": 0.87,
      "score_breakdown": {
        "centrality": 0.3,
        "colocation_count": 3,
        "comovement_count": 5,
        "call_frequency": 12
      },
      "flagged_scenes": ["scene_1", "scene_3"]
    }
  ]
}
- Status codes: 200 OK, 404 Not Found

GET /cases/{case_id}/graph
- Outputs: { nodes: [{id, risk_score, community}], edges: [{source, target, type, weight, evidence}] }

GET /cases/{case_id}/map-data
- Outputs: { towers: [...], crime_scenes: [...], flagged_devices: [...] }

GET /suspects/{device_hash}/evidence
- Outputs: { device_hash, evidence: [{type, tower_id, timestamp, scene_id}] }

GET /health
- Outputs: { status: "ok", postgres: "ok", neo4j: "ok" }
