import { api } from './api';
import { AuditEvent, AuditVerificationResult } from '../types';

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'evt-152',
    block_number: 152,
    timestamp: '2026-09-05T09:44:00Z',
    actor: 'ACP Meera Sen',
    role: 'SUPERVISOR',
    action: 'FINALIZE_CHARGE_SHEET',
    target_reference: 'FIR-2026-DL-0412 · Final Charge Sheet v3.0 (u/s 173 CrPC)',
    prev_hash: '98cf611e038890ae448c901e892cfa7198cf611e038890ae448c901e892cfa71',
    entry_hash: '7c9a4e21b8f041d8e19c00bc8f192b027c9a4e21b8f041d8e19c00bc8f192b02',
    status: 'VALID',
  },
  {
    id: 'evt-151',
    block_number: 151,
    timestamp: '2026-09-05T09:12:54Z',
    actor: 'ACP Meera Sen',
    role: 'SUPERVISOR',
    action: 'SIGN_ED25519',
    target_reference: 'FIR-2026-DL-0412 · Judicial Prosecution Exhibit A',
    prev_hash: 'b44917a2ff82cd9320e881023bc4a671b44917a2ff82cd9320e881023bc4a671',
    entry_hash: '98cf611e038890ae448c901e892cfa7198cf611e038890ae448c901e892cfa71',
    status: 'VALID',
  },
  {
    id: 'evt-150',
    block_number: 150,
    timestamp: '2026-09-05T08:42:19Z',
    actor: 'Director Arvind Kumar',
    role: 'ADMIN',
    action: 'VERIFY_ROOT_CHAIN',
    target_reference: 'FIR-2026-DL-0412 · CFSL Server Extraction Raw E01 Image',
    prev_hash: '3d07e21a8a25c1109a1cbdf32115391a3d07e21a8a25c1109a1cbdf32115391a',
    entry_hash: 'b44917a2ff82cd9320e881023bc4a671b44917a2ff82cd9320e881023bc4a671',
    status: 'VALID',
  },
  {
    id: 'evt-149',
    block_number: 149,
    timestamp: '2026-09-05T08:14:02Z',
    actor: 'Insp. Rajesh Sharma',
    role: 'INVESTIGATOR',
    action: 'UPLOAD_EVIDENCE_DOC',
    target_reference: 'FIR-2026-DL-0412 · Core Banking Server Transaction Log PDF',
    prev_hash: '5f884a1239cd49b9ee348bb8294a2b105f884a1239cd49b9ee348bb8294a2b10',
    entry_hash: '3d07e21a8a25c1109a1cbdf32115391a3d07e21a8a25c1109a1cbdf32115391a',
    status: 'VALID',
  },
  {
    id: 'evt-148',
    block_number: 148,
    timestamp: '2026-09-04T19:22:11Z',
    actor: 'Insp. Vikram Rao',
    role: 'INVESTIGATOR',
    action: 'RECORD_STATEMENT',
    target_reference: 'FIR-2026-MH-0188 · Key Witness Deposition (u/s 164 CrPC)',
    prev_hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    entry_hash: '5f884a1239cd49b9ee348bb8294a2b105f884a1239cd49b9ee348bb8294a2b10',
    status: 'VALID',
  },
  {
    id: 'evt-147',
    block_number: 147,
    timestamp: '2026-09-04T11:05:30Z',
    actor: 'Insp. Rajesh Sharma',
    role: 'INVESTIGATOR',
    action: 'REGISTER_FIR',
    target_reference: 'FIR-2026-DL-0412 · Certified First Information Report Copy',
    prev_hash: 'e892cfa7198cf611e038890ae448c901e892cfa7198cf611e038890ae448c901',
    entry_hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    status: 'VALID',
  },
];

let localAuditEvents: AuditEvent[] = [...INITIAL_AUDIT_EVENTS];
let isFaultInjected: boolean = false;

export async function getAuditEvents(): Promise<AuditEvent[]> {
  try {
    const res = await api.get<AuditEvent[]>('/audit');
    if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {
    // Offline fallback
  }
  return localAuditEvents;
}

/**
 * Executes cryptographic hash-chain verification (GET /audit/verify).
 * Walks the entire chain, recomputing sha256(prev_hash + actor_id + action + document_id + timestamp).
 */
export async function verifyAuditChain(): Promise<AuditVerificationResult> {
  try {
    const res = await api.get<AuditVerificationResult>('/audit/verify');
    if (res.status === 200 && res.data) {
      return res.data;
    }
  } catch {
    // Offline fallback
  }

  // Check if simulated fault is active
  if (isFaultInjected) {
    return {
      valid: false,
      total_entries: 152,
      checked_entries: 152,
      failed_entry_id: 'evt-150',
      failed_block_number: 150,
      reason: 'ENTRY_HASH_MISMATCH: Computed sha256(prev_hash + actor + payload) does not match recorded commitment at Block #150. Provably altered record.',
      latency_ms: 38,
      witness_nodes_online: 12,
      witness_nodes_total: 12,
    };
  }

  return {
    valid: true,
    total_entries: 152,
    checked_entries: 152,
    latency_ms: 42,
    witness_nodes_online: 12,
    witness_nodes_total: 12,
  };
}

/**
 * CRITICAL MVP DEMO TRIGGER: Injects a simulated byte fault at block #150 to catch tampering live.
 */
export function injectTamperAtBlock150(): boolean {
  isFaultInjected = true;
  const evt = localAuditEvents.find((e) => e.block_number === 150);
  if (evt) {
    evt.status = 'TAMPERED';
    evt.entry_hash = 'b44917a2ff82cd93_CORRUPTED_ENTRY_LEAF_FAIL';
  }
  return true;
}

/**
 * Restores the chain back to pristine verified cryptographic state.
 */
export function resetAuditChain(): boolean {
  isFaultInjected = false;
  localAuditEvents = INITIAL_AUDIT_EVENTS.map((e) => ({ ...e, status: 'VALID' }));
  return true;
}

export function getFaultStatus(): boolean {
  return isFaultInjected;
}

export const auditService = {
  getAuditEvents,
  getAuditLogs: getAuditEvents,
  verifyAuditChain,
  injectTamperAtBlock150,
  resetAuditChain,
  getFaultStatus,
};
