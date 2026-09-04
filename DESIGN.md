# CaseVault — Design

Contracts only — no implementations. Fill these in yourselves; this is the interface both backend devs and the frontend dev build against.

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

audit_log
  id, prev_hash, entry_hash, actor_id, action, document_id, case_id, timestamp
```

Notes:
- `role` as a plain enum column on `users` — no dynamic RBAC join tables (per your Capacity Connect learning).
- `case_assignments` is your entire access-control model. Every query for documents joins through it.

---

## 2. API surface (sketch)

```
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

GET    /cases/:id/audit-trail     (supervisor/admin)
GET    /audit/verify-chain        (walks whole chain, returns pass/fail + break point if any)
```

Every mutating endpoint writes an `audit_log` row as part of the same transaction — not as an afterthought.

---

## 3. Frontend screens (target: 5, don't exceed this for MVP)

1. **Auth layer**
2. **Case list** (role-aware: investigators see assigned cases, supervisors/admin see more)
3. **Case detail** — document list, upload button, search bar
4. **Document view** — metadata, download, "Finalize & Sign" button (supervisor only), "Verify Signature" result
5. **Audit trail view** — chronological log for a case, "Verify Chain Integrity" button with pass/fail result

Keep styling plain and functional — CSS custom properties for theme like your portfolio, nothing elaborate. Judges are evaluating the idea and the live tamper-detection moment, not visual polish.

---

## 4. The demo moment (design this deliberately)

For the live demo to land, you need a way to *show* tampering being caught without actually building an attacker tool. Simplest approach:
- Seed one audit-log row with a hand-edited `entry_hash` (via a `seed_tamper.sql` script, not a UI feature) before the demo
- Run "Verify Chain Integrity" live → it flags exactly that row
- This gets you the "aha" moment without needing real attack tooling
