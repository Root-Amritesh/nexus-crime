nexus-crime/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app factory, router registration, startup/shutdown hooks
│   │   ├── config.py                 # Pydantic Settings (env-driven config, Section 16)
│   │   ├── dependencies.py           # DI providers: db session, neo4j driver, current_investigator (stub)
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── router.py         # Aggregates all v1 routers
│   │   │   │   ├── upload.py         # /upload/* endpoints (FR-01)
│   │   │   │   ├── cases.py          # /cases/{id}/* endpoints
│   │   │   │   ├── suspects.py       # /suspects/{hash}/evidence
│   │   │   │   └── health.py         # /health
│   │   ├── schemas/                  # Pydantic request/response models (mirrors Section 18)
│   │   │   ├── tower_dump.py
│   │   │   ├── cdr.py
│   │   │   ├── financial.py
│   │   │   ├── fir.py
│   │   │   ├── suspect.py
│   │   │   └── graph.py
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   │   ├── tower.py
│   │   │   ├── tower_ping.py
│   │   │   ├── crime_scene.py
│   │   │   ├── cdr_record.py
│   │   │   ├── financial_record.py
│   │   │   ├── case.py
│   │   │   └── audit_log.py
│   │   ├── services/                 # Business logic layer (called by routers, testable in isolation)
│   │   │   ├── ingestion_service.py
│   │   │   ├── correlation_service.py
│   │   │   ├── graph_service.py
│   │   │   ├── scoring_service.py
│   │   │   └── evidence_service.py
│   │   ├── ai/                       # AI/ML engine (importable independently of FastAPI)
│   │   │   ├── ner/
│   │   │   │   ├── extractor.py      # spaCy pipeline wrapper
│   │   │   │   └── gazetteer.py      # Indian-name/entity gazetteer + regex
│   │   │   ├── correlation/
│   │   │   │   ├── colocation.py     # PostGIS ST_DWithin query logic
│   │   │   │   └── comovement.py     # Time-window overlap logic
│   │   │   ├── entity_resolution/
│   │   │   │   └── resolver.py       # RapidFuzz matching + confidence banding
│   │   │   ├── graph/
│   │   │   │   ├── builder.py        # Node/edge construction, evidence attachment
│   │   │   │   └── analytics.py      # PageRank/Betweenness/Louvain (GDS) + NetworkX fallback
│   │   │   ├── scoring/
│   │   │   │   └── risk_score.py     # Section 20 formula, pure function
│   │   │   └── anomaly/
│   │   │       └── isolation_forest.py
│   │   ├── db/
│   │   │   ├── postgres.py           # Engine/session factory
│   │   │   ├── neo4j_driver.py       # Bolt driver factory
│   │   │   └── migrations/           # Alembic migration scripts
│   │   ├── core/
│   │   │   ├── logging.py            # Structured logging setup
│   │   │   ├── security.py           # SHA-256 hashing helpers, future JWT/bcrypt hooks
│   │   │   └── exceptions.py         # Custom exception classes + FastAPI exception handlers
│   │   └── background/
│   │       └── tasks.py              # Background task orchestration (post-upload pipeline trigger)
│   ├── tests/
│   │   ├── unit/                     # Section 33: correlation, scoring formula tests
│   │   ├── integration/              # Full pipeline against synthetic ground-truth dataset
│   │   └── api/                      # Postman/Thunder Client-equivalent pytest API tests
│   ├── pyproject.toml / requirements.txt
│   └── Dockerfile
│
├── frontend/                          # ALREADY BUILT — do not modify unless explicitly asked
│
├── database/
│   ├── postgres/
│   │   ├── schema.sql                # Reference DDL matching Section 17
│   │   └── seed/                     # Synthetic seed data drop-in location
│   └── neo4j/
│       └── constraints.cypher        # Uniqueness constraints, index creation Cypher
│
├── ai/
│   └── notebooks/                    # Exploratory notebooks for tuning thresholds (dev-only, not shipped)
│
├── scripts/
│   ├── generator.py                  # Synthetic data generator (tower dumps, CDRs, FIRs, financial + planted network)
│   ├── seed_db.py                    # Loads generator output into Postgres/Neo4j
│   ├── validate_recall.py            # Asserts 100% recall on planted network (Section 33)
│   └── rehearse_demo.sh              # Scripted walkthrough of the 5-minute demo script
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.override.yml   # Local dev overrides (hot reload, volume mounts)
│   └── .env.example
│
├── infra/
│   ├── github-actions/
│   │   └── ci.yml                    # Stretch goal: pytest on push
│   └── render.yaml / vercel.json     # Optional cloud deploy configs
│
├── docs/
│   ├── blueprint.md
│   ├── prd.md
│   ├── architecture-report.md
│   ├── demo-script.md
│   └── api/                          # OpenAPI export, Postman collection
│
├── tests/
│   └── e2e/                          # Full manual/scripted walkthrough checklist
│
├── configs/
│   ├── logging.yaml
│   └── risk_weights.yaml             # Externalized, tunable risk-score weights (Section 13)
│
├── .env.example
├── .gitignore
└── README.md
