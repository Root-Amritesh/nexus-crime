---
name: jwt-bcrypt-scaffolding
description: Authentication and security scaffolding hooks (core/security.py) using python-jose and bcrypt, intentionally inactive for MVP.
---

# JWT & Bcrypt Scaffolding — NEXUS-CRIME

## When to use
Activate when inspecting or scaffolding `backend/app/core/security.py` or authentication dependencies.

## Important Constraint
`python-jose` and `bcrypt` are present in dependencies/stack, but **INACTIVE for MVP**.
- Scaffold the helper hooks and interfaces in `backend/app/core/security.py` (e.g. SHA-256 hash helper, password verification stub, token generation stub).
- **DO NOT build a working auth flow or full RBAC.**
- **This is intentionally incomplete for MVP.** Do not "finish" it.
- Phone/IMSI identifiers must always be SHA-256 hashed before entering the pipeline.
