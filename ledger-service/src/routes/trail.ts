import { Router, Request, Response } from 'express';
import { fabricTrail } from '../fabricClient';
import { mockTrail } from '../store';

export function trailRouter(mode: () => string): Router {
  const r = Router();

  // GET /ledger/cases/:case_id/trail -> Entry[] (chronological by timestamp)
  r.get('/cases/:case_id/trail', async (req: Request, res: Response) => {
    try {
      const caseId = String(req.params.case_id);
      if (mode() === 'fabric') {
        try {
          const entries = await fabricTrail(caseId);
          res.json(entries);
          return;
        } catch (err) {
          console.error('[ledger-service] fabric trail failed:', err);
          res.status(502).json({ error: 'fabric query failed', detail: String(err) });
          return;
        }
      }
      res.json(mockTrail(caseId));
    } catch (err) {
      console.error('[ledger-service] trail failed:', err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return r;
}
