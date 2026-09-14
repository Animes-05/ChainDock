markdown
# ChainDock — Chaincode

TypeScript chaincode implementing the ChainDock custody/audit ledger contract, per
`DESIGN.md` §2. This is invoked by the Ledger Service (Fabric Gateway SDK) — Axum
never talks to Fabric directly.

Implements three functions:

AppendEntry(actorId, action, documentId, caseId, timestamp) → entryId
GetHistory(caseId) → Entry[]
GetEntry(entryId) → Entry


No access-control or business-rule logic lives here — that stays in Axum. This
chaincode's only job is recording and serving custody/audit events.

---

## 0. Fabric dev environment setup (do this once per machine)

`fabric-samples` is **external Hyperledger tooling — it is never committed to this
repo.** It provides the test network scripts, Docker Compose configs, and crypto
material generators needed to run a local Fabric network. Every developer working
on the Fabric track clones it independently, on their own machine, outside the
ChainDock repo.

**Prerequisites:**
- Docker Desktop, running
- Node.js (v18+) and npm
- **Windows users: do all of this inside WSL2's native filesystem** (e.g.
  `~/chaindock/...`), **not** `/mnt/d/...` or Git Bash. Running Fabric from Git Bash
  causes MSYS2 to mangle paths passed into Docker volume mounts, which breaks peer
  startup in ways that are confusing to debug. This cost real time in an earlier
  session — don't repeat it.

**Steps:**

1. Clone `fabric-samples` somewhere convenient, outside this repo:
```bash
   git clone https://github.com/hyperledger/fabric-samples.git
   cd fabric-samples
```

2. Install the Fabric binaries and Docker images (official installer script):
```bash
   curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
   chmod +x install-fabric.sh
   ./install-fabric.sh docker samples binary
```

3. Bring up the test network with a channel:
```bash
   cd fabric-samples/test-network
   ./network.sh up createChannel -c chaindock-channel -ca
```

4. Clone **this** ChainDock repo separately, also inside WSL2's native filesystem,
   so both live on the same filesystem type relative to each other:
```bash
   git clone <this-repo-url>
   cd ChainDock/backend/ledger-service/chaincode
   npm install
   npm run build
```

You now have a running single-org Fabric network and a built chaincode package,
ready for the deploy steps below. The exact path to your ChainDock clone relative
to `fabric-samples` is machine-specific — adjust `-ccp` in the deploy command
accordingly, it isn't meant to match anyone else's path.

---

## 1. Build

```bash
npm install
npm run build
```

If you hit `TS18003: No inputs were found`, your `.ts` files likely aren't inside
`src/` — confirm `src/chaindockContract.ts` and `src/index.ts` exist at that path,
not directly under `chaincode/`.

---

## 2. Deploy (same flow as the `asset-transfer-basic` sample)

From `fabric-samples/test-network`, with the network already up (see §0 step 3):

```bash
./network.sh deployCC \
  -c chaindock-channel \
  -ccn chaindock \
  -ccp <path-to-your-ChainDock-clone>/backend/ledger-service/chaincode \
  -ccl typescript
```

Replace `<path-to-your-ChainDock-clone>` with wherever your repo actually sits
relative to `fabric-samples` on your machine — this will differ per developer, that's expected.

---

## 3. Invoke / query via peer CLI

Set your Org1 peer environment variables the same way you did for the sample
chaincode (from `fabric-samples/test-network`):

```bash
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051
```

**Append an entry:**

```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  -C chaindock-channel -n chaindock \
  --peerAddresses localhost:7051 --tlsRootCertFiles ${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  -c '{"function":"AppendEntry","Args":["user-123","UPLOAD","doc-456","case-789","2026-09-14T10:00:00Z"]}'
```

**Query an entry:**

```bash
peer chaincode query \
  -C chaindock-channel -n chaindock \
  -c '{"function":"GetEntry","Args":["<entryId-from-invoke-response>"]}'
```

**Query a case's history:**

```bash
peer chaincode query \
  -C chaindock-channel -n chaindock \
  -c '{"function":"GetHistory","Args":["case-789"]}'
```

A successful round-trip: invoke returns a tx ID / entryId, and the two queries
return the entry you just wrote (and it shows up in the case's history list).

**Note:** `GetHistory` requires CouchDB (not the default LevelDB) as the Fabric
state database, since it uses a selector query under the hood. Confirm your
`test-network` was brought up with CouchDB (the `-ca` flag above does not control
this — check `network.sh` usage if `GetHistory` queries fail with a "not
supported" error).

---

## 4. Design notes

- `entryId` is `ctx.stub.getTxID()` — deterministic across endorsing peers, so we
  don't need to generate our own IDs in chaincode.
- No `prevHash`/chain-linking logic lives in this chaincode. Fabric's own
  block/endorsement structure is the tamper-evidence guarantee — we are not
  re-deriving a parallel hash chain on top of it (see `ARCHITECTURE.md` §4).
- Each entry does store its own `entryHash` (`sha256(actorId + action + documentId
  + caseId + timestamp)`) — this exists solely to back the tamper-demo mechanism
  (a direct CouchDB state-DB edit, caught by hash recomputation on
  `GET /ledger/verify`), not to chain entries together.

---

## 5. Folder placement

Per `DESIGN.md` §4, `ledger-service/` (and this `chaincode/` folder within it) is
documented as a **top-level sibling of `backend/`**.