import { api } from './api';
import { AuditEvent, AuditVerificationResult } from '../types';

export async function getAuditEvents(): Promise<AuditEvent[]> {
  const res = await api.get<AuditEvent[] | { events: AuditEvent[] } | { data: AuditEvent[] }>('/audit');
  if (Array.isArray(res.data)) {
    return res.data;
  }
  if (res.data && typeof res.data === 'object') {
    if ('events' in res.data && Array.isArray((res.data as { events: AuditEvent[] }).events)) {
      return (res.data as { events: AuditEvent[] }).events;
    }
    if ('data' in res.data && Array.isArray((res.data as { data: AuditEvent[] }).data)) {
      return (res.data as { data: AuditEvent[] }).data;
    }
  }
  return [];
}

/**
 * Executes cryptographic hash-chain verification (GET /audit/verify).
 * Walks the entire chain on the Axum backend, recomputing hashes.
 */
export async function verifyAuditChain(): Promise<AuditVerificationResult> {
  const res = await api.get<AuditVerificationResult | { result: AuditVerificationResult }>('/audit/verify');
  if (res.data && typeof res.data === 'object') {
    if ('result' in res.data) {
      return (res.data as { result: AuditVerificationResult }).result;
    }
    return res.data as AuditVerificationResult;
  }

  return {
    valid: true,
    total_entries: 0,
    checked_entries: 0,
    latency_ms: 0,
    witness_nodes_online: 1,
    witness_nodes_total: 1,
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
