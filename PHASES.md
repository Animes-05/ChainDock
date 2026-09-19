# ChainDock — Phases

Two tracks: **Pitch track** (4 days, all 6 members) and **MVP track** (10 days, only needed if you clear internal round). Both assume lecture hours eat into each day — plan around 2-3 focused hours/day per person on weekdays, more on any free days.

> **2026-09-10 update:** Team has committed to Hyperledger Fabric as the ledger for the internal-round pitch (see ARCHITECTURE.md). This is new territory for the whole team — no member has prior Fabric experience. A new spike milestone (**Milestone 3.5**) is inserted below to de-risk this before it becomes a pitch-day surprise. No fallback path was requested — the team is going all-in on Fabric being demo-ready by the internal round.

---

## Phase 0 — Day 0 (today/tomorrow)

- [x] Confirm final 6-person roster + roles for SIH portal registration
- [ ] Backend devs: read ARCHITECTURE.md + DESIGN.md, agree on split (Dev A = auth/access, Dev B = documents/audit + ledger-service lead)
- [ ] Frontend dev: sketch the 5 screens on paper/Figma, agree on component boundaries with backend API surface
- [ ] Research/presentation: start building the "why this problem matters" narrative — find 1-2 real news stories about evidence tampering or lost case files in India to open the pitch with

---

## Pitch track (Days 1-5 → internal round PPT)

**Day 1-2: Concept + architecture slides**
- Research trio drafts problem framing, market/precedent research
- Backend devs produce a clean architecture diagram reflecting the Fabric-based design (can be hand-drawn/Excalidraw, doesn't need to be built yet)
- Frontend dev mocks 2-3 key screens (case list, document view with verify button) as static mockups

**Day 3: The hash-chain / ledger explainer**
- This is still your differentiator — now framed as "permissioned multi-agency ledger," not just a hash chain. The pitch needs a simple, visual explanation of "how we prove tampering, and how another agency can check it without trusting us" — a before/after diagram: normal ledger state vs. broken/tampered entry with a red X at the break point.
- Ledger-service owner can build a minimal CLI/script proof-of-concept against a local Fabric test network, just to validate the append/query/verify flow works and to screenshot for the deck — this does not need to be wired to Axum yet.

**Day 4: Full deck assembly + rehearsal**
- Problem → existing gaps → our approach → architecture (now Fabric-based) → live/demo mockup → what makes this different → future scope (S3 storage, Regulator persona — see ARCHITECTURE.md §6-7)
- Time the pitch, cut ruthlessly — internal rounds are usually 5-10 min

---

## Milestone 3.5 (NEW — insert before Milestone 4): Fabric Spike

**Goal:** prove the whole ledger path works end-to-end, in isolation, before wiring it into Axum or trying to make it demo-polished. This is the highest-risk item in the rebuild — treat it as a blocking dependency for everything downstream in Milestone 4.

- [ ] Stand up a single-org Hyperledger Fabric test network locally (use the official `fabric-samples` test-network as a starting point — don't build a network from scratch)
- [ ] Decide channel topology with the team: single-org (faster, still legitimately "real Fabric") vs. multi-org modeling Police/Court/Forensics as separate orgs (stronger pitch narrative, meaningfully more setup). Default to single-org if this isn't decided within the first 1-2 days of the spike — a working single-org demo beats an unfinished multi-org one.
- [ ] Write a minimal TypeScript chaincode: `AppendEntry`, `GetHistory`, `GetEntry`
- [ ] Deploy chaincode to the test network, invoke it manually via the Fabric CLI or a throwaway script — confirm you can append and read back an entry
- [ ] Build the Node.js Ledger Service skeleton (Fabric Gateway SDK wrapper + the 3 internal endpoints from DESIGN.md §2)
- [ ] **Solve the tamper-demo problem explicitly**: figure out and prove a concrete mechanism for seeding a "broken" entry that `GET /ledger/verify` will catch, given Fabric's append-only design. This does not have an existing playbook (unlike the old `seed_tamper.sql` approach) — budget real time for this, and if it turns out to be genuinely hard within Fabric's model, surface that to the team immediately rather than late.
- [ ] Only once the above works standalone: wire Axum's `audit.rs` to call the Ledger Service instead of writing to Postgres directly

**Timebox:** this should not eat more than 2-3 days. If the network/chaincode basics aren't working by day 2 of the spike, escalate to the team — better to know early whether single-org scope needs to shrink further (e.g. skip custom chaincode initially and prove the concept with Fabric's sample chaincode) than to discover it the week before the pitch.

---

## MVP track (Days 6-15, only if selected — 10 build days within this window)

**Milestone 1 (Days 1-2 of build): Foundations**
- [x] Postgres schema live, migrations committed
- [x] Auth working end-to-end (login, JWT, role extractor)
- [ ] Empty Axum project deployed to Railway (so deployment isn't a last-day surprise)

**Milestone 2 (Days 3-5): Core CRUD**
- [x] Case creation + assignment
- [x] Document upload + metadata + listing
- [ ] Frontend: login screen + case list + case detail wired to real API

**Milestone 3 (Days 6-7): The differentiator (original Postgres hash-chain — superseded)**
- [x] Audit log hash-chain implemented (`audit_log` table, `seq`-ordered, advisory-lock-guarded append) — **retired in favor of Fabric, see Milestone 3.5**
- [x] `create_case`, `assign_user`, `upload_document` retrofitted to write audit rows in the same transaction as the write they log — **now retrofitted again to call the Ledger Service post-commit instead (Milestone 3.5 dependency)**
- [x] `GET /audit/verify-chain` — original Postgres-based version, **now replaced by a proxy to `GET /ledger/verify`**
- [x] `GET /cases/:id/audit-trail` — **now proxies to the Ledger Service**
- [ ] ~~Seed tamper script (`scripts/seed_tamper.sql`) ready~~ — replaced by `scripts/seed_tamper.ts`, mechanism TBD in Milestone 3.5
- [ ] Ed25519 sign/verify on finalize

**Milestone 3.5 (NEW, see above): Fabric Spike** — blocking dependency, do before continuing Milestone 4's ledger-dependent items

**Milestone 4 (Days 8-9): Signatures + search + ledger integration**

- [ ] Ed25519 keypair per signer; sign `sha256(file_bytes)` on document finalize (`signatures.rs`)
- [ ] `GET /documents/:id/verify-signature`
- [x] Postgres full-text search on document metadata (landed early, in Milestone 2)
- [ ] Wire `audit.rs` to the Ledger Service (depends on Milestone 3.5 completing)
- [ ] Frontend: document view with finalize/verify actions
- [ ] Frontend: `audit.ts` normalizer updated for whatever `GetEntry` actually returns (see DESIGN.md §3)
- [ ] README with screenshots/GIF
- [ ] Final deploy check on Railway (backend + frontend) — **and a decision on where the Ledger Service + Fabric network deploy for the live demo** (this wasn't a concern with the old Postgres-only design; a local/self-hosted Fabric network for demo day is likely simplest, don't assume cloud deployment of a Fabric network is in scope for the timeline)
- [ ] Rehearse the live demo end-to-end at least twice, **including the tamper-detection moment specifically** — this is the single highest-risk part of the whole rebuild

**Deferred, pending team decision (see ARCHITECTURE.md §6-7):**
- [ ] Encrypted S3 storage (currently local disk; revisit after Fabric spike)
- [ ] "Regulator/Audit" persona (revisit after Fabric spike)
- [ ] Multi-org channel topology (decide within Milestone 3.5)

Small, descriptive commits per milestone step, public repo from day one.
