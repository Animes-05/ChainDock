# ChainDock — Architecture

**PS:** SIH26190 — Secure Digital Document Management System for Legal & Investigation Documents
**Stack:** Rust (Axum) · PostgreSQL · JWT auth · Hyperledger Fabric (permissioned ledger + TypeScript chaincode) · Ed25519 digital signatures

> This doc describes shape and reasoning, not full implementations. Each module owner writes their own code against these contracts.

---

## 1. Guiding principle

Everything in this system exists to answer one question convincingly on demo day:
**"If someone tampered with a document or its record, could we prove it — and could another agency independently verify that without trusting us?"**

The second half of that sentence is new. Our internal-round pitch deck commits to Hyperledger Fabric as a **permissioned, multi-agency chain-of-custody ledger** — this is now the load-bearing differentiator, not an optional enhancement. Every architectural choice below serves proving tamper-evidence and independent multi-party verification, and nothing else. Resist scope creep toward AI/ML buzzwords — the spec frames those as optional tools, not requirements.

**Status note (update this as the spike progresses):** the team has no prior Fabric experience. This doc reflects the target architecture as pitched. Treat items marked **PROPOSED — pending spike** as directional, not committed, until the Fabric spike (see PHASES.md) produces a working test network.

---

## 2. High-level components

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐      ┌──────────────────┐      ┌───────────────┐
│  Frontend    │─────▶│   Axum API        │─────▶│  Postgres    │      │  Ledger Service    │─────▶│  Hyperledger    │
│  (React/TS)  │◀─────│   (Rust)          │◀─────│  (app data)  │      │  (Node.js/TS)      │◀─────│  Fabric network │
└─────────────┘      └────────┬─────────┘      └─────────────┘      └────────┬───────────┘      └───────┬───────┘
                               │                                              │                           │
                               │  gRPC / HTTP call on every mutating action   │  Fabric Gateway SDK        │
                               └──────────────────────────────────────────────┘                    ┌──────▼──────┐
                                                                                                     │  Chaincode   │
                                                                                                     │  (TypeScript)│
                                                                                                     └─────────────┘
```

Module split, unchanged from before except the audit layer:
- `auth.rs` (JWT + roles)
- `cases.rs` (case CRUD, assignments)
- `documents.rs` (upload/retrieve/search)
- `audit.rs` — **now a thin client**: no longer writes to a local hash-chain table; calls the Ledger Service for every mutating action and for chain verification/trail reads
- `signatures.rs` (Ed25519 sign/verify)
- `error.rs`

**New component: Ledger Service** (Node.js + TypeScript, talks to Fabric via the Fabric Gateway SDK). This is the only thing that speaks to Fabric directly — Axum never does. It exposes a small internal HTTP/gRPC contract to Axum:
- `POST /ledger/entries` — append one custody/audit event (actor, action, document_id, case_id, timestamp) → invokes chaincode `AppendEntry`
- `GET /ledger/verify` — ask the ledger for its own integrity state (Fabric already guarantees block-level tamper-evidence; this endpoint surfaces that, it does not reimplement hash-chain verification client-side)
- `GET /ledger/cases/:id/trail` — chronological entries for a case, read via chaincode query

No repository/service layer abstraction inside Axum handlers otherwise — handlers still talk to Postgres directly via `sqlx` for everything that isn't ledger data.

---

## 3. Backend split (unchanged team roles, new track added)

**Dev A — Identity & Access** (no change)
- `auth.rs`: JWT access+refresh, SHA-256 hashed refresh token storage, bcrypt passwords
- `AuthenticatedUser` extractor, `role` enum on `users` (investigator / supervisor / admin — 3 fixed roles, no dynamic RBAC join tables)
- Case-level access scoping

**Dev B — Documents & Integrity** (audit sub-scope changes)
- `documents.rs`: upload (multipart), metadata, versioning, full-text search (Postgres `tsvector`)
- `audit.rs`: now calls the Ledger Service instead of owning hash-chain logic directly
- `signatures.rs`: Ed25519 keypair per authorized signer; sign document hash on finalize; verify endpoint

**New track — Ledger Service & Chaincode** (Dev B leads, second dev joins after initial Fabric spike stabilizes)
- Stand up a single-org Fabric test network (channel topology — single-org vs. multi-org modeling Police/Court/Forensics as separate orgs — **TBD, decide with the team once the spike is running**; default to single-org if undecided by the time build time is tight)
- Write chaincode in TypeScript: `AppendEntry`, `GetHistory`, `GetEntry` at minimum
- Write the Node.js Ledger Service that wraps the Fabric Gateway SDK and exposes the internal API above to Axum
- No Rust Fabric SDK exists in a mature state — this is why the ledger service is a separate Node process, not a Rust module

These two backend surfaces only touch each other at the `AuthenticatedUser` extractor boundary (unchanged) plus the new Axum ↔ Ledger Service HTTP boundary — still parallelizable.

---

## 4. The ledger (the core differentiator, now real Hyperledger Fabric)

Previously: a single-writer, Postgres-backed SHA-256 hash chain (git-commit-chain style), verified by an admin-only endpoint that walked rows and recomputed hashes.

**Now:** the entire `audit_log` — every `CREATE_CASE`, `ASSIGN_USER`, and `UPLOAD` event, plus future `SIGN`/`FINALIZE` events — is appended to a Hyperledger Fabric channel via chaincode, not to a Postgres table. Fabric's own block structure and endorsement policy provide the tamper-evidence guarantee; we are not re-deriving a parallel hash-chain on top of it.

- On any mutating action, Axum still opens its Postgres transaction for the app-data write (e.g. insert into `documents`), but the audit entry itself is committed by calling the Ledger Service **after** the Postgres transaction commits. Document the ordering explicitly in code comments: a Postgres write that lands with no corresponding ledger entry is a defect to catch in testing, not something the architecture silently tolerates.
- Verification: `GET /audit/verify-chain` (frontend-facing) now proxies to `GET /ledger/verify`, which asks Fabric for its integrity state rather than manually recomputing hashes. The demo's "aha moment" (seed a tampered row → verify catches it) needs a **Fabric-native equivalent** — most likely: query chaincode for an entry, independently recompute what the entry's hash *should* be from its fields, and compare — the tamper simulation must happen at the ledger/chaincode layer now, not via a SQL `UPDATE` against a Postgres table (`seed_tamper.sql` as written no longer applies; see PHASES.md for the replacement task).
- Case-scoped trail reads (`GET /cases/:id/audit-trail`) become chaincode queries filtered by `case_id`, proxied the same way.

Do not reach for on-chain smart-contract logic beyond simple record/query functions. Business rules (RBAC, case assignment, who can finalize a document) stay in Axum/Postgres — the chaincode's only job is recording and serving custody/audit events, not enforcing access control.

---

## 5. Digital signatures (unchanged, still after the ledger work)

- On document finalize, the submitting officer's keypair signs `sha256(file_bytes)`.
- Signature + public key stored alongside the document in Postgres.
- Verify endpoint re-hashes the current file and checks the signature.
- Use `ed25519-dalek`. Do not build custom crypto primitives.
- **Open question, not yet decided:** does a `SIGN` action also get appended as a ledger entry (making signature events part of the same chain-of-custody trail)? Default assumption: yes, treat it the same as `UPLOAD`/`ASSIGN_USER` — flag if the team wants otherwise.

---

## 6. Storage

- File blobs: local disk under `/data/documents/{uuid}` for the working build — **unchanged for now.**
- The pitch deck's "Encrypted S3 storage" is a **PROPOSED — pending spike** enhancement, not committed for the internal round. Do not build S3 integration until the Fabric spike is stable and the team has explicitly revisited this (per team decision, 2026-09-10). If picked up later, treat it as an additive milestone the same way the ledger service was — swap the storage backend behind the existing `file_path` field, no schema changes needed to `documents`.
- Metadata, users, app-level relational data: Postgres (unchanged).
- Custody/audit events: Hyperledger Fabric ledger (new, replaces the Postgres `audit_log` table as source of truth).
- **Design question to resolve with the team:** does Postgres keep a read-only mirror/cache of ledger entries for fast list/search queries (since querying Fabric per-request may be slower than a local table), fed asynchronously from the Ledger Service? This is a performance optimization, not a trust boundary — the mirror is never treated as authoritative, Fabric always is. Recommended but not yet decided.

---

## 7. The "Regulator / Audit" actor

The pitch deck's architecture diagram shows a fourth actor (Regulator/Audit) distinct from the three app roles (Investigator, Supervisor, Admin). This is **PROPOSED — pending spike**, status "not sure yet, revisit after Fabric spike" per team decision. Do not build a fourth role, additional auth flow, or UI for this until the team explicitly commits to it. If picked up, the likely shape is a **read-only external verifier** — someone who can independently query the Fabric ledger (or a public verification endpoint) without needing an app account at all, which is a meaningfully different problem from adding a 4th value to the `Role` enum. Flag this distinction to the team before committing engineering time either way.

---

## 8. Non-goals for this build

Explicitly **not** doing, to protect the timeline:
- No AI/ML document classification (mention as "future work" in the pitch only)
- No OCR (unless a document already has extracted text on upload, skip it)
- No mobile app
- No custom hash-chain reimplementation now that Fabric owns tamper-evidence — don't maintain two parallel "prove it wasn't tampered" systems
- No S3/cloud storage integration until explicitly revisited post-spike (see §6)
- No 4th "Regulator" role/persona until explicitly revisited post-spike (see §7)
- No multi-org Fabric channel topology decision made yet — don't build against an assumed topology; confirm with the team first (see §3)
