/*
 * Chaincode entry point — the exported `contracts` array is what `peer
 * lifecycle` picks up on instantiation. Mirrors the shape of fabric-samples'
 * asset-transfer-typescript chaincode you already deployed successfully.
 */

import { ChainDockContract } from './chaindockContract';

export { ChainDockContract } from './chaindockContract';

export const contracts: any[] = [ChainDockContract];
