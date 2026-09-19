/*
 * Fabric Gateway wrapper. Only used when LEDGER_MODE=fabric.
 *
 * Axum never imports this — it talks HTTP to server.ts, which calls into here.
 * Lazy-connects a single Gateway and reuses it across requests.
 */
import * as fs from 'fs';
import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Gateway, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import { LedgerEntry } from './store';

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`LEDGER_MODE=fabric requires ${name} to be set (see .env.example)`);
  return v;
}

let gateway: Gateway | null = null;
let grpcClient: grpc.Client | null = null;
let contract: Contract | null = null;
const knownCaseIds = new Set<string>();

async function getContract(): Promise<Contract> {
  if (contract) return contract;

  const channel = process.env.CHANNEL ?? 'chaindock-channel';
  const chaincode = process.env.CHAINCODE ?? 'chaindock';
  const mspId = process.env.MSP_ID ?? 'Org1MSP';
  const peerEndpoint = process.env.PEER_ENDPOINT ?? 'localhost:7051';

  const certPath = requiredEnv('FABRIC_CERT_PATH');
  const keyPath = requiredEnv('FABRIC_KEY_PATH');
  const tlsCertPath = process.env.FABRIC_TLS_CERT_PATH;

  const credentials = fs.readFileSync(certPath);
  const identity: Identity = { mspId, credentials };

  const privateKeyPem = fs.readFileSync(keyPath, 'utf8');
  const privateKey = (await import('crypto')).createPrivateKey(privateKeyPem);
  const signer: Signer = signers.newPrivateKeySigner(privateKey);

  const tlsCredentials = tlsCertPath
    ? grpc.credentials.createSsl(fs.readFileSync(tlsCertPath))
    : grpc.credentials.createSsl();

  grpcClient = new grpc.Client(peerEndpoint, tlsCredentials);
  gateway = connect({ client: grpcClient, identity, signer });
  contract = (await gateway.getNetwork(channel)).getContract(chaincode);
  console.log(`[ledger-service] fabric connected: ${peerEndpoint} ${channel}/${chaincode}`);
  return contract;
}

export function trackCaseId(caseId: string): void {
  if (caseId) knownCaseIds.add(caseId);
}

export function fabricKnownCaseIds(): string[] {
  return [...knownCaseIds];
}

export async function fabricAppend(
  actorId: string,
  action: string,
  documentId: string,
  caseId: string,
  timestamp: string,
  orgId = '',
): Promise<string> {
  const c = await getContract();
  // Chaincode returns entryId (= txID). submitTransaction returns Uint8Array bytes.
  // orgId is appended last; chaincode treats missing arg as '' for back-compat.
  const result: Uint8Array = await c.submitTransaction(
    'AppendEntry',
    actorId,
    action,
    documentId,
    caseId,
    timestamp,
    orgId,
  );
  trackCaseId(caseId);
  return Buffer.from(result).toString('utf8');
}

export async function fabricTrail(caseId: string): Promise<LedgerEntry[]> {
  const c = await getContract();
  const result: Uint8Array = await c.evaluateTransaction('GetHistory', caseId);
  trackCaseId(caseId);
  return JSON.parse(Buffer.from(result).toString('utf8')) as LedgerEntry[];
}

export async function fabricEntry(entryId: string): Promise<LedgerEntry> {
  const c = await getContract();
  const result: Uint8Array = await c.evaluateTransaction('GetEntry', entryId);
  return JSON.parse(Buffer.from(result).toString('utf8')) as LedgerEntry;
}
