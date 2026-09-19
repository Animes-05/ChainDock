import { Router, Request, Response } from 'express';
import { fabricAppend, fabricKnownCaseIds, trackCaseId } from '../fabricClient';
import { LedgerEntry, mockAppend, mockCaseIdSet, mockOrgCounts, normalizeOrgId } from '../store';

export function entriesRouter(mode: () => string): Router {
  const r = Router();

  // POST /ledger/entries {actor_id,action,document_id?,case_id?,timestamp,org_id?} -> {entryId}
  r.post('/entries', async (req: Request, res: Response) => {
    try {
      const { actor_id, action, document_id, case_id, timestamp, org_id } = req.body ?? {};
      if (!actor_id || !action || !timestamp) {
        res.status(400).json({ error: 'actor_id, action, timestamp are required' });
        return;
      }
      const docId = String(document_id ?? '');
      const caseId = String(case_id ?? '');
      const orgId = normalizeOrgId(org_id ?? req.header('x-org-id') ?? '');

      if (mode() === 'fabric') {
        try {
          const entryId = await fabricAppend(String(actor_id), String(action), docId, caseId, String(timestamp), orgId);
          res.json({ entryId });
          return;
        } catch (err) {
          console.error('[ledger-service] fabric append failed:', err);
          res.status(502).json({ error: 'fabric append failed', detail: String(err) });
          return;
        }
      }

      // mock mode
      const entry: LedgerEntry = mockAppend({
        actor_id: String(actor_id),
        action: String(action),
        document_id: docId,
        case_id: caseId,
        timestamp: String(timestamp),
        org_id: orgId,
      });
      res.json({ entryId: entry.entryId });
    } catch (err) {
      console.error('[ledger-service] POST /ledger/entries failed:', err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // Expose known case IDs so operators can scope verification (fabric mode
  // cannot list all keys without a chaincode range query).
  r.get('/known-cases', (_req: Request, res: Response) => {
    const ids = mode() === 'fabric' ? fabricKnownCaseIds() : [...mockCaseIdSet()];
    // Also surface tracked ids from the other mode for convenience.
    for (const id of fabricKnownCaseIds()) trackCaseId(id);
    res.json({ case_ids: ids });
  });

  // Multi-org demo dashboard: per-org entry counts (mock mode only for now;
  // fabric mode reports known case ids instead).
  r.get('/orgs', (_req: Request, res: Response) => {
    if (mode() !== 'mock') {
      res.json({ orgs: [], note: 'per-org counts only available in mock mode' });
      return;
    }
    res.json({ orgs: mockOrgCounts() });
  });

  return r;
}
