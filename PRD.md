# ChainDock — Product Requirements Document

**PS:** SIH26190 · **Sponsor:** Ministry of Home Affairs (NCRB, Women Safety Division) Team ASPIRE
**Theme:** Block-chain and Cyber-security (per official PS)

---

## 1. Problem (as given by the PS)

Law enforcement, courts, and investigative bodies handle FIRs, investigation records, witness statements, charge sheets, court filings, evidence records, and forensic reports — largely on paper or fragmented digital storage. This causes:
- Slow document retrieval
- Unauthorized access to confidential case material
- Tampering risk with no way to prove it
- No version control
- Poor cross-department collaboration
- Weak auditability for legal/compliance purposes

*(Note: the official spec's "Expected Solution" field is a copy-paste artifact referencing an unrelated police-asset-tracking PS. We build to the "Description" section, which is internally consistent — flag this to your SPOC/mentor.)*

## 2. Goal for internal round

Convince judges we understand the real problem (evidentiary integrity, not just file storage) and can build it. MVP must **demo a tamper attempt and prove it was caught** — that single moment remains the pitch's centerpiece, now delivered via a real permissioned blockchain ledger rather than a from-scratch hash chain.

## 3. Why Hyperledger Fabric, and why scoped this way

The theme tag for this PS is explicitly "Block-chain and Cyber-security." Our original design used a hand-rolled SHA-256 hash-chain, which is a legitimate tamper-evidence mechanism on its own merits — but our mentor has asked us not to deviate from the stated theme, and a literal reading of "blockchain" means using an actual distributed ledger, not a single-writer Postgres table that resembles one conceptually.

We are adopting **Hyperledger Fabric** — a permissioned blockchain framework — specifically because:
- It matches the "multi-agency" framing already in our pitch (Police / Court / Forensics as potential separate participants), which a single-writer hash-chain could never credibly claim.
- It's purpose-built for exactly this kind of permissioned, consortium use case — unlike public chains (Ethereum, etc.), which would be the wrong tool for a system where participants must be known, vetted government/legal entities.
- It lets us make an honest, technically defensible claim: **another agency can independently verify custody history without trusting our servers** — that's a genuinely different and stronger claim than "we promise our Postgres table wasn't edited."

We are **not** doing this to chase the buzzword for its own sake — see ARCHITECTURE.md §1 for the guiding principle, which is unchanged: prove tampering happened, and prove it convincingly. Fabric is now the mechanism; the goal hasn't moved.

**Scope discipline:** this is new territory for the entire team, with no prior Fabric experience. The build deliberately keeps Fabric's footprint narrow — it owns the custody/audit ledger only. Everything else (auth, case management, document storage, search, RBAC) stays exactly as designed before this pivot. See ARCHITECTURE.md and PHASES.md's Milestone 3.5 for how this is being de-risked.

## 4. Users / roles (keep to 3, no more — unchanged)

| Role | Can do |
|---|---|
| **Investigator** | Upload documents to their assigned case, view/search within their case |
| **Supervisor** | Everything an investigator can, plus view audit trail, approve/finalize documents (triggers signature) |
| **Admin** | User management, view all cases, run chain-verification |

A fourth "Regulator/Audit" persona appears in the pitch deck's architecture diagram as an external verifier concept. This is **not committed** for the internal round — status is "revisit after the Fabric spike" per team decision (2026-09-10). Do not treat it as an MVP requirement yet.

## 5. Core features (MVP scope)

1. **Auth** — login, JWT session, role-based routing
2. **Case & document upload** — create a case, upload documents against it with metadata (type, date, description)
3. **Access control** — a user only sees documents in cases they're assigned to
4. **Search** — full-text search across document metadata/description within accessible cases
5. **Audit trail** — every action recorded on a Hyperledger Fabric ledger; supervisor/admin (and assigned investigators) can view a case's full trail
6. **Tamper detection demo** — a "Verify Integrity" button that checks the Fabric ledger's integrity state and reports pass/fail, plus a deliberately-broken seed entry to demonstrate detection live (mechanism for seeding this on an append-only ledger is an open engineering problem — see PHASES.md Milestone 3.5, this is the single highest-risk item in the rebuild)
7. **Digital signature on finalize** — supervisor "finalizes" a document, which signs it; a "Verify Signature" check confirms authenticity

## 6. Explicitly out of scope for MVP

- AI-based document classification or OCR
- Mobile app
- Multi-agency federation with external systems outside our own Fabric network
- Notification system (email/SMS)
- **Encrypted S3 storage** — appears in the pitch deck as target architecture; not committed for MVP build. Local disk storage continues until the team explicitly revisits this post-spike.
- **"Regulator/Audit" external-verifier persona** — same status, not committed for MVP build.
- **Multi-org Fabric channel topology** — not yet decided; default to single-org if undecided when build time gets tight (see PHASES.md).

(These go in the "Future Scope" slide of the pitch — mentioning them shows awareness without inflating build risk.)

## 7. Success criteria for internal round

- Live demo: upload a document → view audit trail → attempt a simulated tamper on the Fabric ledger → verification catches it
- Clear articulation of *why* Fabric specifically (permissioned, multi-agency-capable, matches the stated theme) rather than a generic "we used blockchain" claim
- Working RBAC demoed with at least 2 different role logins

## 8. Success criteria for MVP (10-day, if selected)

- All 7 core features functional end-to-end, including the Fabric-backed audit trail and tamper-detection demo
- Deployed (Railway backend + Ledger Service, Netlify or Railway static frontend); Fabric network deployment target TBD — likely self-hosted/local for demo purposes rather than a cloud Fabric deployment, given the timeline (see PHASES.md Milestone 4)
- Public repo, README with screenshots, small descriptive commits per milestone (per your usual workflow)
