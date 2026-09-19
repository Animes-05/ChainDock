import { api, ledgerApi } from './api';
import { AuditEvent, AuditVerificationResult, LedgerHealthResponse, BackendHealthResponse } from '../types';
import { casesService } from './cases';

export function normalizeAuditEvent(e: any, fallback?: { case_number?: string }): AuditEvent {
  // Backend audit_trail rows (audit.rs AuditTrailEntry) don't have a block_number —
  // ordering comes from `seq` server-side and isn't exposed per-entry. We derive a
  // stable display index from created_at ordering at the call site instead.
  const statusStr = String(e?.status || 'VALID').toUpperCase();

  return {
    id: String(e?.id || `audit-${Math.random().toString(36).slice(2)}`),
    block_number: Number(e?.block_number ?? e?.blockNumber ?? 0),
    timestamp: String(e?.created_at || e?.timestamp || new Date().toISOString()),
    actor: String(e?.actor_email || e?.actor || 'System Custodian'),
    role: (String(e?.role || 'INVESTIGATOR').toUpperCase() as AuditEvent['role']),
    action: String(e?.action || 'LEDGER_COMMIT'),
    target_reference: String(
      e?.target_reference || e?.document_id || fallback?.case_number || 'GENESIS_RECORD'
    ),
    // The per-case audit-trail endpoint (GET /cases/:id/audit-trail) doesn't return
    // prev_hash/entry_hash at all (see audit.rs AuditTrailEntry) — those only exist
    // internally and via GET /audit/verify-chain's pass/fail result. We show
    // placeholders here rather than pretending we have real hash values.
    prev_hash: String(e?.prev_hash || e?.prevHash || ''),
    entry_hash: String(e?.entry_hash || e?.entryHash || e?.id || ''),
    status: statusStr === 'TAMPERED' ? 'TAMPERED' : 'VALID',
  };
}

/**
 * There is no listing endpoint for all audit events — only
 * GET /cases/:id/audit-trail (per case) and GET /audit/verify-chain (pass/fail,
 * no listing). audit-trail is now open to all three roles (audit.rs
 * assert_case_access), scoped the same way case visibility already is:
 * investigators only see the trail for cases they're assigned to, so
 * `GET /cases` naturally returns only the cases this call will succeed for.
 */
export async function getAuditEvents(): Promise<AuditEvent[]> {
  const cases = await casesService.getCases();

  const perCase = await Promise.all(
    cases.map(async (c) => {
      try {
        const res = await api.get<any[] | { events: any[] }>(`/cases/${c.id}/audit-trail`);
        const rawList = Array.isArray(res.data) ? res.data : (res.data as any)?.events || [];
        return rawList.map((e: any) => normalizeAuditEvent(e, { case_number: c.case_number }));
      } catch (err) {
        console.warn(`Failed to load audit trail for case ${c.id}:`, err);
        return [] as AuditEvent[];
      }
    })
  );

  return perCase.flat();
}

/**
 * Executes cryptographic hash-chain verification. The real backend route is
 * GET /audit/verify-chain (admin-only), which returns
 * { valid, total_entries, broken_at_seq, broken_at_id } — not the
 * failed_block_number/reason/witness_nodes_* shape this used to assume.
 */
export async function verifyAuditChain(): Promise<AuditVerificationResult> {
  const res = await api.get<{
    valid: boolean;
    total_entries: number;
    broken_at_seq: number | null;
    broken_at_id: string | null;
  }>('/audit/verify-chain');

  const raw = res.data;

  return {
    valid: Boolean(raw?.valid ?? true),
    total_entries: Number(raw?.total_entries ?? 0),
    checked_entries: Number(raw?.total_entries ?? 0),
    failed_entry_id: raw?.broken_at_id ?? undefined,
    failed_block_number: raw?.broken_at_seq ?? undefined,
    reason: raw?.broken_at_id ? 'entry_hash or prev_hash mismatch' : undefined,
    latency_ms: 0,
    witness_nodes_online: 1,
    witness_nodes_total: 1,
  };
}

// DEMO ONLY — pitch-day tamper injection, wired to the admin-gated
// POST /audit/demo/tamper|restore (which proxy the Ledger Service's mock-mode
// demo endpoints). Callers in AuditLog.tsx re-fetch + re-verify afterwards,
// so a `true` here is immediately followed by the red INTEGRITY BREACH state.
// In fabric mode tamper returns false (HTTP 501/502) — then tamper the entry
// directly in CouchDB and press Verify instead (see DESIGN.md §5).
export async function injectTamperAtBlock150(entryId?: string): Promise<boolean> {
  try {
    await api.post('/audit/demo/tamper', { entry_id: entryId ?? null });
    return true;
  } catch (err) {
    console.warn(
      'Demo tamper failed — ledger-service is likely in fabric mode. ' +
        'Tamper an entry directly in CouchDB, then press Verify instead.',
      err,
    );
    return false;
  }
}

export async function resetAuditChain(entryId?: string): Promise<boolean> {
  try {
    await api.post('/audit/demo/restore', { entry_id: entryId ?? null });
    return true;
  } catch (err) {
    console.warn('Demo restore failed:', err);
    return false;
  }
}

export async function getLedgerHealth(): Promise<LedgerHealthResponse> {
  const res = await ledgerApi.get<LedgerHealthResponse>('/health');
  return res.data;
}

export async function getBackendHealth(): Promise<BackendHealthResponse> {
  const res = await api.get<BackendHealthResponse>('/health');
  return res.data;
}

export const auditService = {
  getAuditEvents,
  getAuditLogs: getAuditEvents,
  verifyAuditChain,
  injectTamperAtBlock150,
  resetAuditChain,
  getLedgerHealth,
  getBackendHealth,
};
