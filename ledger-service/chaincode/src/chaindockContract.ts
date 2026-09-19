/*
 * ChainDock custody/audit chaincode.
 *
 * Scope is deliberately narrow per ARCHITECTURE.md §2 and §4: this chaincode
 * records and serves custody/audit events. It does NOT enforce access control
 * or business rules — that stays in Axum. It does NOT re-implement a
 * client-side hash chain — Fabric's own block/endorsement structure is the
 * tamper-evidence guarantee. `entryHash` exists only to support the tamper
 * DEMO (see DESIGN.md §5): GET /ledger/verify recomputes this hash from an
 * entry's own stored fields and compares it, to catch an edit made directly
 * against the state DB (CouchDB) rather than through chaincode.
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { createHash } from 'crypto';

const DOC_TYPE = 'ChainDockEntry';

export interface Entry {
    docType: string;
    entryId: string;
    actorId: string;
    action: string;
    documentId: string; // '' when not applicable — avoid null, keep state values uniformly typed
    caseId: string;      // '' when not applicable
    timestamp: string;   // ISO-8601, supplied by the Ledger Service (see DESIGN.md §2)
    entryHash: string;   // sha256(actorId + action + documentId + caseId + timestamp)
}

/**
 * Deterministic across every endorsing peer: all peers executing this
 * chaincode receive the exact same arguments as part of the same proposal,
 * so hashing them produces an identical result everywhere. That determinism
 * is required for Fabric endorsement to succeed at all.
 */
function computeEntryHash(
    actorId: string,
    action: string,
    documentId: string,
    caseId: string,
    timestamp: string,
): string {
    return createHash('sha256')
        .update(actorId)
        .update(action)
        .update(documentId)
        .update(caseId)
        .update(timestamp)
        .digest('hex');
}

@Info({
    title: 'ChainDockContract',
    description: 'Custody/audit ledger for ChainDock — AppendEntry / GetHistory / GetEntry',
})
export class ChainDockContract extends Contract {

    /**
     * Records one custody/audit event. Called by the Ledger Service's
     * POST /ledger/entries, which Axum's audit.rs calls AFTER the
     * corresponding Postgres transaction has already committed (see
     * DESIGN.md §2 — there is no shared 2-phase commit between Postgres
     * and Fabric).
     *
     * entryId is the transaction ID (ctx.stub.getTxID()), not a
     * client-supplied or randomly-generated value. Unlike Date.now() or a
     * fresh uuid(), the txId is agreed upon as part of the proposal itself,
     * so every endorsing peer arrives at the same entryId deterministically.
     */
    @Transaction()
    @Returns('string')
    public async AppendEntry(
        ctx: Context,
        actorId: string,
        action: string,
        documentId: string,
        caseId: string,
        timestamp: string,
    ): Promise<string> {
        if (!actorId || !action || !timestamp) {
            throw new Error('actorId, action, and timestamp are required');
        }

        const entryId = ctx.stub.getTxID();
        const docId = documentId ?? '';
        const caseIdVal = caseId ?? '';

        const entry: Entry = {
            docType: DOC_TYPE,
            entryId,
            actorId,
            action,
            documentId: docId,
            caseId: caseIdVal,
            timestamp,
            entryHash: computeEntryHash(actorId, action, docId, caseIdVal, timestamp),
        };

        await ctx.stub.putState(entryId, Buffer.from(JSON.stringify(entry)));
        return entryId;
    }

    /**
     * Chronological (by timestamp) list of every entry for one case. Backs
     * GET /ledger/cases/:case_id/trail, which audit.rs proxies to.
     *
     * Uses a CouchDB selector query — requires the network's state database
     * to be CouchDB, not LevelDB, which matches the network you already have
     * running (and which the tamper-demo mechanism also depends on). Sorting
     * happens client-side here rather than via a CouchDB sort index — the
     * simplest correct option at hackathon-demo data volumes; only worth
     * revisiting if trail sizes get large enough to matter.
     */
    @Transaction(false)
    @Returns('string')
    public async GetHistory(ctx: Context, caseId: string): Promise<string> {
        const query = {
            selector: {
                docType: DOC_TYPE,
                caseId,
            },
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const entries: Entry[] = [];

        let result = await iterator.next();
        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                entries.push(JSON.parse(Buffer.from(result.value.value).toString('utf8')) as Entry);
            }
            result = await iterator.next();
        }
        await iterator.close();

        entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        return JSON.stringify(entries);
    }

    /**
     * Single-entry lookup by entryId. Backs the recompute-and-compare step of
     * GET /ledger/verify: the Ledger Service calls this, recomputes
     * entryHash from the returned fields, and checks it against the stored
     * entryHash — catching an edit made directly against CouchDB's state DB
     * rather than through chaincode (the tamper-demo mechanism from
     * DESIGN.md §5).
     */
    @Transaction(false)
    @Returns('string')
    public async GetEntry(ctx: Context, entryId: string): Promise<string> {
        const bytes = await ctx.stub.getState(entryId);
        if (!bytes || bytes.length === 0) {
            throw new Error(`entry ${entryId} does not exist`);
        }
        return Buffer.from(bytes).toString('utf8');
    }
}
