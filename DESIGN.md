# ChainDock — Design

Contracts only — no implementations. Fill these in yourselves; this is the interface both backend devs, the ledger-service owner, and the frontend dev build against.

---

## 1. Database schema (sketch, not DDL)

```
users
  id, email, password_hash, role (investigator|supervisor|admin), created_at

cases
  id, title, case_number, created_by, created_at

case_assignments
  id, case_id, user_id        -- who can access this case

documents
  id, case_id, uploaded_by, title, doc_type, description,
  file_path, file_hash (sha256 of bytes), version, created_at

document_versions             -- only if you have time; MVP can skip and treat
  id, document_id, file_path,    edits as new documents with a `supersedes` field
  file_hash, created_by, created_at

signatures
  id, document_id, signer_id, public_key, signature_bytes, signed_at

audit_log_mirror               -- OPTIONAL, PROPOSED — pending team decision (see
  id, ledger_entry_id,          ARCHITECTURE.md §6). Read-only cache of Fabric
  actor_id, action,             ledger entries for fast list/search queries.
  document_id, case_id,         NEVER treated as the source of truth — Fabric is.
  created_at, synced_at         If not adopted, list/trail reads always query the
                                 Ledger Service directly instead.
```

Notes:
- `role` as a plain enum column on `users` — no dynamic RBAC join tables.
- `case_assignments` is your entire access-control model. Every query for documents joins through it.
- The old `audit_log` table (with `prev_hash`/`entry_hash`/`seq`) is **retired**. Custody/audit events now live on the Hyperledger Fabric ledger, not in Postgres. Do not resurrect a Postgres-side hash chain alongside Fabric — that would be two competing sources of truth for the same claim.

---

## 2. API surface (sketch)

### Axum (Rust) — public-facing, unchanged except audit routes

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh

POST   /cases                     (supervisor/admin)
GET    /cases                     (only cases user is assigned to)
POST   /cases/:id/assign          (add a user to a case)

POST   /cases/:id/documents       (upload, multipart)
GET    /cases/:id/documents       (list + search query param)
GET    /documents/:id             (metadata + download link)
GET    /documents/:id/download

POST   /documents/:id/finalize    (supervisor — triggers signature)
GET    /documents/:id/verify-signature

GET    /cases/:id/audit-trail     (proxies to Ledger Service; supervisor/admin/assigned investigator)
GET    /audit/verify-chain        (proxies to Ledger Service; admin only, per current role gate)
```

Every mutating endpoint still writes its Postgres row inside a transaction. Once that transaction commits, the handler calls the Ledger Service to append the corresponding custody/audit event — **not** inside the same DB transaction (Fabric isn't Postgres; there's no shared 2-phase commit). Document this ordering clearly in each handler: Postgres commit first, ledger append second, and log/alert loudly if the ledger call fails so a "silent gap" in the trail doesn't go unnoticed.

### Ledger Service (Node.js/TypeScript) — internal only, called by Axum

```
POST   /ledger/entries
         body: { actor_id, action, document_id?, case_id?, timestamp }
         → invokes chaincode AppendEntry, returns the Fabric tx id

GET    /ledger/cases/:case_id/trail
         → chaincode query, returns chronological entries for a case

GET    /ledger/verify
         → asks Fabric for its own integrity/health state; for the demo's
           tamper-detection moment, this needs a defined "what does broken
           look like" contract — TBD once chaincode is written, but it must
           return enough to reconstruct a pass/fail + break-point UI, same
           shape as the old verify-chain response the frontend already expects:
           { valid: boolean, total_entries: number, broken_at_id?: string }
```

This internal API is not exposed to the frontend directly — Axum is still the only thing the frontend talks to. Keep the Ledger Service's contract boring and stable; all the "what does this mean to the user" logic stays in Axum/frontend.

### Chaincode (TypeScript) — invoked by the Ledger Service via Fabric Gateway SDK

```
AppendEntry(actorId, action, documentId, caseId, timestamp) → entryId
GetHistory(caseId) → Entry[]
GetEntry(entryId) → Entry
```

Keep chaincode minimal: record and serve data. No access-control logic on-chain — that stays in Axum. No business rules on-chain beyond "does this entry's shape look valid."

---

## 3. Frontend screens (target: 5, don't exceed this for MVP)

1. **Auth layer**
2. **Case list** (role-aware: investigators see assigned cases, supervisors/admin see more)
3. **Case detail** — document list, upload button, search bar
4. **Document view** — metadata, download, "Finalize & Sign" button (supervisor only), "Verify Signature" result
5. **Audit trail view** — chronological log for a case, "Verify Chain Integrity" button with pass/fail result. Data now comes from the Ledger Service via Axum's proxy routes — no frontend change needed to the *contract* (`entry_hash`/`prev_hash` display fields may end up empty or replaced with a Fabric tx id, depending on what `GetEntry` returns; confirm once chaincode is written and update `audit.ts`'s normalizer accordingly, same pattern as the existing `normalizeAuditEvent`).

No new screen for a "Regulator/Audit" persona yet — that's PROPOSED, pending the team's post-spike decision (see ARCHITECTURE.md §7). If adopted later, it's likely a separate, unauthenticated verification view, not a 6th screen behind the existing role system.

Keep styling plain and functional. Judges are evaluating the idea and the live tamper-detection moment, not visual polish.

---

## 4. Folder structure

```
chaindock/
├── backend/
│   ├── Cargo.toml
│   ├── .env.example              # DATABASE_URL, JWT_SECRET, PORT, LEDGER_SERVICE_URL
│   ├── migrations/                # sqlx migrations, one file per schema change
│   │   ├── 0001_users.sql
│   │   ├── 0002_cases.sql
│   │   ├── 0003_case_assignments.sql
│   │   ├── 0004_documents.sql
│   │   ├── 0005_signatures.sql
│   │   └── 0006_audit_log.sql     # RETIRED — no longer written to; kept only if
│   │                               #  the read-mirror (see §1) is adopted, else drop
│   ├── data/
│   │   └── documents/             # uploaded file blobs (gitignored)
│   └── src/
│       ├── main.rs                # router setup, layers, state
│       ├── config.rs              # env loading (+ LEDGER_SERVICE_URL)
│       ├── db.rs                  # pool setup
│       ├── error.rs               # AppError + IntoResponse impl
│       ├── extractors.rs          # AuthenticatedUser extractor
│       ├── ledger_client.rs       # NEW — thin HTTP client to the Ledger Service
│       │
│       handlers/
|         ├── mod.rs
|         ├── auth.rs                # Dev A: login, JWT issue/refresh, bcrypt
│         ├── cases.rs               # Dev A: case CRUD, assignments
│         ├── documents.rs           # Dev B: upload, metadata, search
│         ├── audit.rs               # Dev B: now a thin proxy to ledger_client.rs
│         └── signatures.rs          # Dev B: ed25519 sign/verify
│
├── ledger-service/                 # NEW — Node.js + TypeScript
│   ├── package.json
│   ├── .env.example                # Fabric connection profile, channel name, wallet path
│   ├── src/
│   │   ├── server.ts                # small HTTP server exposing §2's Ledger Service API
│   │   ├── fabricClient.ts          # Fabric Gateway SDK wrapper
│   │   └── routes/
│   │       ├── entries.ts
│   │       ├── trail.ts
│   │       └── verify.ts
│   └── chaincode/                   # TypeScript chaincode
│       ├── package.json
│       └── src/
│           └── chaindockContract.ts # AppendEntry / GetHistory / GetEntry
│
├── frontend/
│   ├── index.html                 # login
│   ├── cases.html                 # case list
│   ├── case-detail.html           # documents in a case
│   ├── document.html              # document view + finalize/verify
│   ├── audit.html                 # audit trail view
│   ├── css/
│   │   └── style.css              # theme vars, shared layout
│   └── js/
│       ├── api.js                 # fetch wrapper, JWT header handling
│       ├── auth.js
│       ├── cases.js
│       ├── documents.js
│       └── audit.js
│
├── scripts/
│   └── seed_tamper.ts             # REPLACES seed_tamper.sql — deliberately breaks
│                                    one ledger entry via chaincode for the demo,
│                                    since there's no longer a Postgres row to
│                                    hand-edit. Exact mechanism TBD once chaincode
│                                    exists (see ARCHITECTURE.md §4).
│
├── PRD.md
├── ARCHITECTURE.md
├── DESIGN.md
├── PHASES.md
├── ChainDock_Claude_Instructions.md
├── README.md
└── .gitignore
```

---

## 5. The demo moment (design this deliberately — now Fabric-native)

The core idea is unchanged: show tampering being caught, live, without needing real attacker tooling. What changes is *where* the tamper is seeded and *how* it's detected:

- Old approach: hand-edit a `entry_hash` column via `seed_tamper.sql`, then walk rows in Postgres and recompute.
- New approach: seed a tampered entry through a chaincode call or direct ledger manipulation path (mechanism TBD — Fabric's append-only design may make this harder to simulate cleanly than a SQL `UPDATE` was; this needs to be solved early in the spike, not discovered the week before the pitch, since **the whole demo depends on this working**).
- Run "Verify Chain Integrity" live → it flags the tampered entry via `GET /ledger/verify`.
- This is now the single highest-risk item in the whole rebuild — flag it to the team explicitly and prioritize proving it end-to-end before investing further polish elsewhere. See PHASES.md's new spike milestone.
