import { Router, Request, Response } from 'express';
import { fabricKnownCaseIds, fabricTrail } from '../fabricClient';
import { mockAll, mockCaseIdSet, mockTrail, verifyEntries } from '../store';

/*
 * GET /ledger/verify -> {valid, total_entries, broken_at_id?}
 *
 * Semantics: recompute each entry's entryHash from its own stored fields and
 * compare (catches a direct CouchDB state-DB edit, the tamper-demo mechanism
 * from DESIGN.md §5). Fabric's block layer is the real guarantee; this endpoint
 * just surfaces a pass/fail + break-point in the shape the frontend expects.
 *
 * Chaincode only exposes GetHistory(caseId), so global verification aggregates
 * per-case histories over known case IDs:
 * - mock mode: all in-memory entries (or ?case_id= filters when given).
 * - fabric mode: ?case_id= may repeat to scope; otherwise iterates known case
 *   IDs tracked from prior appends/trails in this process.
 */
export function verifyRouter(mode: () => string): Router {
  const r = Router();

  r.get('/verify', async (req: Request, res: Response) => {
    try {
      const scoped = toStringArray(req.query.case_id);

      if (mode() === 'fabric') {
        try {
          const caseIds =
            scoped.length > 0 ? scoped : fabricKnownCaseIds();
          if (caseIds.length === 0) {
            res.json({ valid: true, total_entries: 0 });
            return;
          }
          const all = (
            await Promise.all(caseIds.map((id) => fabricTrail(id)))
          ).flat();
          // De-dupe by entryId (same entry could appear under one case only,
          // but be defensive if callers pass overlapping scopes).
          const seen = new Map(all.map((e) => [e.entryId, e]));
          res.json(verifyEntries([...seen.values()]));
          return;
        } catch (err) {
          console.error('[ledger-service] fabric verify failed:', err);
          res.status(502).json({ error: 'fabric verify failed', detail: String(err) });
          return;
        }
      }

      // mock mode
      if (scoped.length > 0) {
        const all = scoped.map((id) => mockTrail(id)).flat();
        res.json(verifyEntries(all));
        return;
      }
      // No scope: verify everything in the mock store.
      void mockCaseIdSet; // (kept: known-case tracking lives in store.ts)
      res.json(verifyEntries(mockAll()));
    } catch (err) {
      console.error('[ledger-service] verify failed:', err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return r;
}

function toStringArray(v: unknown): string[] {
  if (v === undefined) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string' && v.length > 0) return [v];
  return [];
}
