# CaseVault — Phases

Two tracks: **Pitch track** (4 days, all 6 members) and **MVP track** (10 days, only needed if you clear internal round). Both assume lecture hours eat into each day — plan around 2-3 focused hours/day per person on weekdays, more on any free days.

---

## Phase 0 — Day 0 (today/tomorrow)

- [ ] Confirm final 6-person roster + roles for SIH portal registration
- [ ] Backend devs: read ARCHITECTURE.md + DESIGN.md, agree on split (Dev A = auth/access, Dev B = documents/audit)
- [ ] Frontend dev: sketch the 5 screens on paper/Figma, agree on component boundaries with backend API surface
- [ ] Research/presentation trio: start building the "why this problem matters" narrative — find 1-2 real news stories about evidence tampering or lost case files in India to open the pitch with

---

## Pitch track (Days 1-5 → internal round PPT)

**Day 1-2: Concept + architecture slides**
- Research trio drafts problem framing, market/precedent research (how do other DMS/evidence systems handle integrity — don't copy, but know the landscape)
- Backend devs produce a clean architecture diagram (can be hand-drawn/Excalidraw, doesn't need to be built yet)
- Frontend dev mocks 2-3 key screens (case list, document view with verify button) as static mockups — this becomes your pitch's "product" visual

**Day 3: The hash-chain explainer**
- This is your differentiator — the pitch needs a simple, visual explanation of "how we prove tampering," not jargon. A before/after diagram: normal chain vs. broken chain with a red X at the break point.
- Backend devs can build a minimal CLI/script proof-of-concept of the hash chain (not the full API) just to validate the idea works and to screenshot for the deck

**Day 4: Full deck assembly + rehearsal**
- Problem → existing gaps → our approach → architecture → live/demo mockup → what makes this different → future scope
- Time the pitch, cut ruthlessly — internal rounds are usually 5-10 min
---

## MVP track (Days 6-15, only if selected — 10 build days within this window)

**Milestone 1 (Days 1-2 of build): Foundations**
- Postgres schema live, migrations committed
- Auth working end-to-end (login, JWT, role extractor)
- Empty Axum project deployed to Railway (so deployment isn't a last-day surprise)

**Milestone 2 (Days 3-5): Core CRUD**
- Case creation + assignment
- Document upload + metadata + listing
- Frontend: login screen + case list + case detail wired to real API

**Milestone 3 (Days 6-7): The differentiator**
- Audit log hash-chain implemented and verified with unit tests
- Verify-chain endpoint + frontend view
- Seed tamper script ready
- Ed25519 sign/verify on finalize

**Milestone 4 (Days 8-9): Signatures + search**

- Postgres full-text search on document metadata
- Frontend: document view with finalize/verify actions
- README with screenshots/GIF
- Final deploy check on Railway
- Rehearse the live demo end-to-end at least twice

Small, descriptive commits per milestone step, public repo from day one — same workflow as your other projects.
