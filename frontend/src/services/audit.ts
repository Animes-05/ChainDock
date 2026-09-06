import { api } from './api';
import { AuditEvent, AuditVerificationResult } from '../types';

export function normalizeAuditEvent(e: any): AuditEvent {
  const blockNum = Number(e?.block_number ?? e?.blockNumber ?? e?.block_id ?? e?.blockId ?? 0);
  const statusStr = String(e?.status || 'VALID').toUpperCase();

  return {
    id: String(e?.id || `audit-blk-${blockNum}`),
    block_number: isNaN(blockNum) ? 0 : blockNum,
    timestamp: String(e?.timestamp || e?.created_at || new Date().toISOString()),
    actor: String(e?.actor || e?.user_name || e?.userName || 'System Custodian'),
    role: (String(e?.role || 'INVESTIGATOR').toUpperCase() as AuditEvent['role']),
    action: String(e?.action || 'LEDGER_COMMIT'),
    target_reference: String(e?.target_reference || e?.targetReference || e?.reference || 'GENESIS_RECORD'),
    prev_hash: String(e?.prev_hash || e?.prevHash || '0000000000000000000000000000000000000000000000000000000000000000'),
    entry_hash: String(e?.entry_hash || e?.entryHash || e?.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    status: statusStr === 'TAMPERED' ? 'TAMPERED' : 'VALID',
  };
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  let res;
  try {
    res = await api.get<AuditEvent[] | { events: AuditEvent[] } | { data: AuditEvent[] } | { items: AuditEvent[] } | { results: AuditEvent[] }>('/audit');
  } catch (err: any) {
    if (err?.status === 404) {
      try {
        res = await api.get<any>('/audit/logs');
      } catch {
        res = await api.get<any>('/audit/events');
      }
    } else {
      throw err;
    }
  }

  let rawList: any[] = [];
  if (Array.isArray(res.data)) {
    rawList = res.data;
  } else if (res.data && typeof res.data === 'object') {
    const d = res.data as Record<string, unknown>;
    if (Array.isArray(d.events)) {
      rawList = d.events;
    } else if (Array.isArray(d.data)) {
      rawList = d.data;
    } else if (Array.isArray(d.items)) {
      rawList = d.items;
    } else if (Array.isArray(d.results)) {
      rawList = d.results;
    }
  }
  return rawList.map((e) => normalizeAuditEvent(e));
}

/**
 * Executes cryptographic hash-chain verification (GET /audit/verify).
 * Walks the entire chain on the Axum backend, recomputing hashes.
 */
export async function verifyAuditChain(): Promise<AuditVerificationResult> {
  let res;
  try {
    res = await api.get<AuditVerificationResult | { result: AuditVerificationResult }>('/audit/verify');
  } catch (err: any) {
    if (err?.status === 404) {
      res = await api.post<any>('/audit/verify');
    } else {
      throw err;
    }
  }

  const raw = res.data && typeof res.data === 'object' && 'result' in res.data ? (res.data as any).result : res.data;

  return {
    valid: Boolean(raw?.valid ?? true),
    total_entries: Number(raw?.total_entries ?? raw?.totalEntries ?? 0),
    checked_entries: Number(raw?.checked_entries ?? raw?.checkedEntries ?? 0),
    failed_entry_id: raw?.failed_entry_id || raw?.failedEntryId,
    failed_block_number: raw?.failed_block_number || raw?.failedBlockNumber,
    reason: raw?.reason,
    latency_ms: Number(raw?.latency_ms ?? raw?.latencyMs ?? 0),
    witness_nodes_online: Number(raw?.witness_nodes_online ?? raw?.witnessNodesOnline ?? 1),
    witness_nodes_total: Number(raw?.witness_nodes_total ?? raw?.witnessNodesTotal ?? 1),
  };
}

export async function injectTamperAtBlock150(): Promise<boolean> {
  try {
    await api.post('/audit/tamper', { block: 150 });
    return true;
  } catch (err) {
    console.warn('Backend audit tamper simulation endpoint not implemented:', err);
    return false;
  }
}

export async function resetAuditChain(): Promise<boolean> {
  try {
    await api.post('/audit/reset');
    return true;
  } catch (err) {
    console.warn('Backend audit reset endpoint not implemented:', err);
    return false;
  }
}

export const auditService = {
  getAuditEvents,
  getAuditLogs: getAuditEvents,
  verifyAuditChain,
  injectTamperAtBlock150,
  resetAuditChain,
};
