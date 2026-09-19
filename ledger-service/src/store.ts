import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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
  /** Logical org (POLICE/COURT/FORENSICS). '' = unspecified (back-compat). */
  orgId: string;
}

export const DOC_TYPE = 'ChainDockEntry';

/** Canonical org ids for the simulated multi-org demo (Option A). */
export const KNOWN_ORGS = ['POLICE', 'COURT', 'FORENSICS'] as const;

export function normalizeOrgId(raw: unknown): string {
  const v = String(raw ?? '').trim().toUpperCase();
  return (KNOWN_ORGS as readonly string[]).includes(v) ? v : '';
}

export function computeEntryHash(
  actorId: string,
  action: string,
  documentId: string,
  caseId: string,
  timestamp: string,
  orgId = '',
): string {
  // MUST match chaincode computeEntryHash exactly: sha256(actor+action+doc+case+ts+org).
  // orgId is appended last so legacy entries with orgId='' hash exactly as before.
  return createHash('sha256')
    .update(actorId)
    .update(action)
    .update(documentId)
    .update(caseId)
    .update(timestamp)
    .update(orgId)
    .digest('hex');
}

export function verifyEntries(entries: LedgerEntry[]): {
  valid: boolean;
  total_entries: number;
  broken_at_id?: string;
} {
  const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const e of sorted) {
    const recomputed = computeEntryHash(
      e.actorId,
      e.action,
      e.documentId ?? '',
      e.caseId ?? '',
      e.timestamp,
      (e as Partial<LedgerEntry>).orgId ?? '',
    );
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
//
// Persistence (Option A, Railway): the store is file-backed via LEDGER_FILE
// (default /data/ledger.json on a Railway Volume). Every mutator saves
// atomically (tmp + rename). Single replica only — last-writer-wins otherwise.
// ---------------------------------------------------------------------------
const DATA_FILE =
  process.env.LEDGER_FILE ?? process.env.LEDGER_DATA_FILE ?? '/data/ledger.json';

interface PersistedState {
  entries: LedgerEntry[];
  caseIds: string[];
  tamperBackup?: Array<[string, LedgerEntry]>;
}

const mockEntries: LedgerEntry[] = [];
const mockCaseIds = new Set<string>();

// Test/demo hook: corrupt one entry's stored hash input WITHOUT updating
// entryHash, simulating a direct CouchDB state-DB edit (see DESIGN.md §5).
// Exposed over HTTP only via the DEMO router (routes/demo.ts) — never part of
// the Axum-facing contract in DESIGN.md §2.
const tamperBackup = new Map<string, LedgerEntry>();

function saveToDisk(): void {
  // Skip persistence when explicitly disabled (tests) or unwritable (dev w/o /data).
  if (process.env.LEDGER_NO_PERSIST === '1') return;
  try {
    const dir = path.dirname(DATA_FILE);
    fs.mkdirSync(dir, { recursive: true });
    const state: PersistedState = {
      entries: mockEntries,
      caseIds: [...mockCaseIds],
      tamperBackup: [...tamperBackup],
    };
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    console.warn(`[ledger-service] persist failed (${DATA_FILE}):`, String(err));
  }
}

function loadFromDisk(): void {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const state = JSON.parse(raw) as PersistedState;
    if (Array.isArray(state.entries)) {
      mockEntries.length = 0;
      for (const e of state.entries) {
        // Back-compat: entries written before orgId existed get ''.
        mockEntries.push({ ...e, orgId: (e as Partial<LedgerEntry>).orgId ?? '' });
      }
    }
    if (Array.isArray(state.caseIds)) {
      mockCaseIds.clear();
      for (const id of state.caseIds) if (id) mockCaseIds.add(String(id));
    }
    if (Array.isArray(state.tamperBackup)) {
      tamperBackup.clear();
      for (const [id, entry] of state.tamperBackup) {
        tamperBackup.set(String(id), { ...entry, orgId: entry.orgId ?? '' });
      }
    }
    if (mockEntries.length > 0) {
      console.log(`[ledger-service] restored ${mockEntries.length} entries from ${DATA_FILE}`);
    }
  } catch (err) {
    console.warn(`[ledger-service] restore failed (${DATA_FILE}):`, String(err));
  }
}

export function mockAppend(input: {
  actor_id: string;
  action: string;
  document_id?: string;
  case_id?: string;
  timestamp: string;
  org_id?: string;
}): LedgerEntry {
  const documentId = input.document_id ?? '';
  const caseId = input.case_id ?? '';
  const orgId = normalizeOrgId(
    input.org_id ?? process.env.ORG_ID ?? process.env.DEFAULT_ORG ?? '',
  );
  const entry: LedgerEntry = {
    docType: DOC_TYPE,
    entryId: `mock-${randomUUID()}`,
    actorId: input.actor_id,
    action: input.action,
    documentId,
    caseId,
    timestamp: input.timestamp,
    entryHash: computeEntryHash(input.actor_id, input.action, documentId, caseId, input.timestamp, orgId),
    orgId,
  };
  mockEntries.push(entry);
  if (caseId) mockCaseIds.add(caseId);
  saveToDisk();
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

/** Per-org entry counts for the multi-org demo dashboard. */
export function mockOrgCounts(): Array<{ org_id: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of mockEntries) {
    const org = e.orgId || 'UNSPECIFIED';
    counts.set(org, (counts.get(org) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([org_id, count]) => ({ org_id, count }))
    .sort((a, b) => a.org_id.localeCompare(b.org_id));
}

// Load persisted state once at module init (server boot). Must run after all
// declarations above.
loadFromDisk();

export function mockTamper(entryId: string, patch: Partial<LedgerEntry>): boolean {
  const e = mockEntries.find((x) => x.entryId === entryId);
  if (!e) return false;
  // Keep the pristine copy so the demo's "Restore Chain" button can undo.
  if (!tamperBackup.has(entryId)) tamperBackup.set(entryId, { ...e });
  Object.assign(e, patch);
  saveToDisk();
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
  if (restored.length > 0) saveToDisk();
  return restored;
}

/** Absolute path of the persistence file (for boot logging). */
export function persistenceFile(): string {
  return DATA_FILE;
}
