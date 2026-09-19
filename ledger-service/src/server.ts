/*
 * ChainDock Ledger Service — small HTTP server over the Fabric Gateway SDK.
 * Per ARCHITECTURE.md §2 / DESIGN.md §2: the ONLY thing that speaks to Fabric
 * directly. Axum calls these 3 endpoints; the frontend never calls them.
 *
 *   POST /ledger/entries
 *   GET  /ledger/cases/:case_id/trail
 *   GET  /ledger/verify
 */
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { entriesRouter } from './routes/entries';
import { trailRouter } from './routes/trail';
import { verifyRouter } from './routes/verify';
import { demoRouter } from './routes/demo';
import { persistenceFile } from './store';

const PORT = Number(process.env.PORT ?? 3001);
const mode = (): string =>
  (process.env.LEDGER_MODE ?? 'mock').toLowerCase() === 'fabric' ? 'fabric' : 'mock';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', mode: mode() });
});

// Mounted under /ledger to match the DESIGN.md §2 contract exactly.
app.use('/ledger', entriesRouter(mode));
app.use('/ledger', trailRouter(mode));
app.use('/ledger', verifyRouter(mode));

// DEMO ONLY — pitch-day tamper injection. Disable with ALLOW_DEMO_ENDPOINTS=false.
if ((process.env.ALLOW_DEMO_ENDPOINTS ?? 'true').toLowerCase() !== 'false') {
  app.use('/ledger', demoRouter(mode));
  console.log('[ledger-service] DEMO endpoints enabled (POST /ledger/demo/tamper|restore).');
}

app.listen(PORT, () => {
  console.log(`[ledger-service] listening on :${PORT} (mode=${mode()})`);
  if (mode() === 'fabric') {
    console.log('[ledger-service] fabric target:',
      `channel=${process.env.CHANNEL ?? 'chaindock-channel'}`,
      `chaincode=${process.env.CHAINCODE ?? 'chaindock'}`,
      `peer=${process.env.PEER_ENDPOINT ?? 'localhost:7051'}`);
  } else {
    console.log(`[ledger-service] mock store active — no Fabric network required. persistence=${persistenceFile()}`);
  }
});
