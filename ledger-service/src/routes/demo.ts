import { Router, Request, Response } from 'express';
import { mockAll, mockRestore, mockTamper, mockTamperLatest } from '../store';

/*
 * DEMO-ONLY endpoints for the internal-round pitch (NOT part of DESIGN.md §2).
 *
 *   POST /ledger/demo/tamper  {entry_id?} -> {tampered_entry_id}
 *   POST /ledger/demo/restore {entry_id?} -> {restored_entry_ids}
 *
 * Mock mode: corrupts an in-memory entry's stored fields without updating its
 * entryHash — the exact analog of a direct CouchDB state-DB edit in fabric
 * mode — so GET /ledger/verify fails with broken_at_id pointing at it.
 * No entry_id = tamper the most recent entry (one-click demo).
 *
 * Fabric mode: these return 501. There, tamper the entry directly in CouchDB
 * (Fauxton at the peer's CouchDB port) per DESIGN.md §5, then call verify.
 *
 * Disable entirely with ALLOW_DEMO_ENDPOINTS=false (see server.ts).
 */
const FABRIC_TAMPER_HINT =
  'demo tamper is only supported in LEDGER_MODE=mock; ' +
  'in fabric mode edit the entry directly in CouchDB (peer Fauxton UI), ' +
  'then call GET /ledger/verify (see DESIGN.md §5)';

export function demoRouter(mode: () => string): Router {
  const r = Router();

  r.post('/demo/tamper', (req: Request, res: Response) => {
    if (mode() !== 'mock') {
      res.status(501).json({ error: FABRIC_TAMPER_HINT });
      return;
    }
    const { entry_id } = req.body ?? {};
    if (entry_id) {
      const id = String(entry_id);
      const known = mockAll().some((e) => e.entryId === id);
      if (!known) {
        res.status(404).json({ error: `entry ${id} does not exist` });
        return;
      }
      mockTamper(id, { action: 'TAMPERED-BY-DEMO' });
      console.log(`[ledger-service] DEMO tamper injected on ${id}`);
      res.json({ tampered_entry_id: id });
      return;
    }
    const latest = mockTamperLatest();
    if (!latest) {
      res.status(409).json({ error: 'no entries to tamper yet — append one first' });
      return;
    }
    console.log(`[ledger-service] DEMO tamper injected on latest entry ${latest.entryId}`);
    res.json({ tampered_entry_id: latest.entryId });
  });

  r.post('/demo/restore', (req: Request, res: Response) => {
    if (mode() !== 'mock') {
      res.status(501).json({ error: FABRIC_TAMPER_HINT });
      return;
    }
    const { entry_id } = req.body ?? {};
    const restored = mockRestore(entry_id ? String(entry_id) : undefined);
    console.log(`[ledger-service] DEMO restore: ${restored.length} entries (${restored.join(', ')})`);
    res.json({ restored_entry_ids: restored });
  });

  return r;
}
