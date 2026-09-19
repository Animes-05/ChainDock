# ChainDock

**ChainDock** — a secure digital document management system for legal & investigation
documents, built for Smart India Hackathon 2026, PS **SIH26190** (Ministry of Home
Affairs, NCRB / Women Safety Division, Team ASPIRE).

Law enforcement and investigative bodies handle FIRs, charge sheets, witness
statements, and forensic reports largely on paper or fragmented digital storage —
with no reliable way to prove a record hasn't been tampered with. ChainDock's core
differentiator is **provable tamper-evidence**: a SHA-256 hash-chained audit log
(not blockchain) plus Ed25519 digital signatures on finalized documents.

> Full specs live in [`PRD.md`](./PRD.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md),
> [`DESIGN.md`](./DESIGN.md), and [`PHASES.md`](./PHASES.md). Read those before
> touching scope — several decisions (3 fixed roles, no dynamic RBAC, no real
> blockchain, no OCR) are deliberate, not oversights.

---

## Stack

| Layer     | Tech |
|-----------|------|
| Backend   | Rust · Axum · PostgreSQL (`sqlx`) |
| Auth      | JWT (access + refresh), bcrypt passwords, SHA-256 hashed/rotated refresh tokens |
| Integrity | SHA-256 hash-chained audit log, Ed25519 digital signatures (`ed25519-dalek`) |
| Frontend  | Plain HTML/CSS/JS, 5 screens max |
| Deploy    | Railway (backend + ledger-service + Postgres), Netlify (frontend) |

## What's built

- **Auth & access** — register/login/refresh (JWT + rotating refresh tokens),
  3 fixed roles (investigator / supervisor / admin), case-level access scoping
  via `case_assignments`
- **Cases & documents** — case CRUD, multipart document upload with synchronous
  SHA-256 hashing, Postgres full-text search over document metadata
- **Ledger-backed audit trail (Option A)** — every mutating action (`CREATE_CASE`,
  `ASSIGN_USER`, `UPLOAD`, `TRANSFER`) commits to Postgres first, then appends to
  the Ledger Service (`POST /ledger/entries`). `GET /audit/verify-chain` proxies
  `GET /ledger/verify` and reports pass/fail plus the exact break point if tampered.
  Ledger runs `LEDGER_MODE=mock` with file persistence (`LEDGER_FILE=/data/ledger.json`
  on a Railway Volume) — survives restarts on a single replica.
- **Simulated multi-org** — entries carry a logical `org_id` (`POLICE`/`COURT`/`FORENSICS`,
  included in the entry hash). `GET /audit/orgs` (via `GET /ledger/orgs`) powers the
  per-org filter on `/ledger`. Real multi-org Fabric is deferred; the chaincode keeps
  the same `orgId` field so a future Fabric switch stays hash-compatible.

## What's next

- Ed25519 sign/verify on document finalize (`signatures.rs`)
- `scripts/seed_tamper.sql` — deliberately-broken audit row for the live demo
- Frontend against the API surface in `DESIGN.md`

## Running locally

```bash
docker compose up --build   # postgres :5432, ledger :3001, backend :3000
```

Or service-by-service:

```bash
cd backend
cp env.example .env   # fill in DATABASE_URL / JWT_SECRET
cargo run              # runs migrations on boot, serves on :3000 (or $PORT)
```

Requires a reachable Postgres instance matching `DATABASE_URL`.

## Deploy (hackathon demo, Option A)

- **Railway project, 3 services:** `postgres` plugin, `ledger-service` (Dockerfile,
  `LEDGER_MODE=mock`, `LEDGER_FILE=/data/ledger.json` + Volume at `/data`,
  `replicas=1`), `backend` (Dockerfile, `DATABASE_URL`, `JWT_SECRET`,
  `LEDGER_SERVICE_URL=http://ledger-service.railway.internal:3001`, optional
  `DEFAULT_ORG=`). Healthchecks: `GET /health` on both.
- **Netlify:** base `frontend/`, build `npm run build`, publish `frontend/dist`
  (see `netlify.toml`, SPA `/* → /index.html`). Build env: `VITE_API_URL`,
  `VITE_LEDGER_URL` (public Railway URLs), `VITE_APP_NAME`, `VITE_NODE_ID`.
  Changing a URL requires a rebuild (Vite build-time env).
- **Demo drill:** upload → `/ledger` verify valid → admin Simulate Tamper →
  verify `INTEGRITY BREACH` with entry id → Restore → verify valid.
- **Limits (accepted for MVP):** ledger + uploaded files are ephemeral without
  their volumes; mock ledger is single-replica (JSON last-writer-wins);
  `POST /audit/demo/*` stays enabled for the demo (admin-gated).

## Repo layout

See the folder structure in [`DESIGN.md`](./DESIGN.md#4-folder-structure) for the
full target layout (backend handlers split by module, frontend screens, migrations,
seed scripts).

## Contributing

See [`RULES.md`](./RULES.md) — no direct pushes to `main`, no sub-branches, every
change goes through a PR (markdown-only changes excepted).
