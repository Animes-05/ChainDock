import { createHash, randomUUID } from 'crypto';

// Mirror of chaincode Entry (ledger-service/chaincode/src/chaindockContract.ts).
export interface LedgerEntry {
  docType: string;
  entryId: string;
  actorId: string;
  action: string;
  documentId: string;
  caseId: string;
  timestamp: string;
  entryHash: string;
}

export const DOC_TYPE = 'ChainDockEntry';

export function computeEntryHash(
  actorId: string,
  action: string,
  documentId: string,
  caseId: string,
  timestamp: string,
): string {
  // MUST match chaincode computeEntryHash exactly: sha256(actor+action+doc+case+ts).
  return createHash('sha256')
    .update(actorId)
    .update(action)
    .update(documentId)
    .update(caseId)
    .update(timestamp)
    .digest('hex');
}

export function verifyEntries(entries: LedgerEntry[]): {
  valid: boolean;
  total_entries: number;
  broken_at_id?: string;
} {
  const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const e of sorted) {
    const recomputed = computeEntryHash(e.actorId, e.action, e.documentId ?? '', e.caseId ?? '', e.timestamp);
    if (recomputed !== e.entryHash) {
      return { valid: false, total_entries: sorted.length, broken_at_id: e.entryId };
    }
  }
  return { valid: true, total_entries: sorted.length };
}

// ---------------------------------------------------------------------------
// Mock store: demo-safe fallback when no Fabric network is reachable.
// Same hash + verify semantics as the real path, so the backend proxy and the
// frontend pass/fail UI behave identically in both modes.
// ---------------------------------------------------------------------------
const mockEntries: LedgerEntry[] = [];
const mockCaseIds = new Set<string>();

export function mockAppend(input: {
  actor_id: string;
  action: string;
  document_id?: string;
  case_id?: string;
  timestamp: string;
}): LedgerEntry {
  const documentId = input.document_id ?? '';
  const caseId = input.case_id ?? '';
  const entry: LedgerEntry = {
    docType: DOC_TYPE,
    entryId: `mock-${randomUUID()}`,
    actorId: input.actor_id,
    action: input.action,
    documentId,
    caseId,
    timestamp: input.timestamp,
    entryHash: computeEntryHash(input.actor_id, input.action, documentId, caseId, input.timestamp),
  };
  mockEntries.push(entry);
  if (caseId) mockCaseIds.add(caseId);
  return entry;
}

export function mockTrail(caseId: string): LedgerEntry[] {
  return mockEntries
    .filter((e) => e.caseId === caseId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function mockAll(): LedgerEntry[] {
  return [...mockEntries];
}

export function mockCaseIdSet(): Set<string> {
  return mockCaseIds;
}

// Test/demo hook: corrupt one entry's stored hash input WITHOUT updating
// entryHash, simulating a direct CouchDB state-DB edit (see DESIGN.md §5).
// Exposed over HTTP only via the DEMO router (routes/demo.ts) — never part of
// the Axum-facing contract in DESIGN.md §2.
const tamperBackup = new Map<string, LedgerEntry>();

export function mockTamper(entryId: string, patch: Partial<LedgerEntry>): boolean {
  const e = mockEntries.find((x) => x.entryId === entryId);
  if (!e) return false;
  // Keep the pristine copy so the demo's "Restore Chain" button can undo.
  if (!tamperBackup.has(entryId)) tamperBackup.set(entryId, { ...e });
  Object.assign(e, patch);
  return true;
}

/** One-click demo: corrupt the most recent entry's action field. */
export function mockTamperLatest(): LedgerEntry | null {
  if (mockEntries.length === 0) return null;
  const latest = [...mockEntries].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  ).pop() as LedgerEntry;
  mockTamper(latest.entryId, { action: `${latest.action}-TAMPERED` });
  return latest;
}

/** Undo demo tampering. No id = restore everything previously tampered. */
export function mockRestore(entryId?: string): string[] {
  const ids = entryId ? [entryId] : [...tamperBackup.keys()];
  const restored: string[] = [];
  for (const id of ids) {
    const backup = tamperBackup.get(id);
    const live = mockEntries.find((x) => x.entryId === id);
    if (backup && live) {
      Object.assign(live, backup);
      tamperBackup.delete(id);
      restored.push(id);
    }
  }
  return restored;
}
