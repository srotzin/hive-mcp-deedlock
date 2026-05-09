# hive-mcp-deedlock

**Hive DeedLock** — real estate notarization, deed signing, and county recording attestations.

Every transition in the closing state machine — Disclosure → Offer → Acceptance → Escrow_Open → Title_Search → Notary_Session → Deed_Signed → Recording_Submitted → Recorded → Closing → Wire_Disbursed — is bound to a **dual-signed (Ed25519 + ML-DSA-65) post-quantum-ready Swarm-MAPET receipt envelope**. Field semantics aligned to **ALTA UCD**, **MISMO 3.4**, **RON Standards v1.4**, and **PRIA** recording XML — drop-in compatible with existing title, escrow, RON, and recording stacks.

| Property | Value |
|---|---|
| Protocol | MCP 2024-11-05 over Streamable-HTTP |
| Backend | `https://hivemorph.onrender.com` |
| Settlement | USDC on Base (chain id 8453) via x402 |
| Standard tier | $0.0096 / event |
| Cosmic tier (regulated) | $0.0192 / event |
| Annual contracts | $35,988 — $1.2M per dyad |
| Unlimited | $2,999 / mo |

## Tools

| Tool | Description |
|---|---|
| `deedlock_deed_attest` | Attest a deed/notary state transition. |
| `deedlock_deed_get` | Fetch a stored attestation by id. |
| `deedlock_deed_verify` | Verify a stored attestation's dual signatures. |
| `deedlock_notary_session` | Attest a notary session (in-person, RON, IPEN, mail-away) over one or more documents. |
| `deedlock_recording_attest` | Attest a county recording event with chain-of-custody from prior DEED_SIGNED. |
| `deedlock_chain_verify` | Verify the full chain of attestations for a property. |
| `deedlock_by_property` | Full state-transition chain for a property. |
| `deedlock_by_buyer` | Paginated history by buyer DID. |
| `deedlock_by_seller` | Paginated history by seller DID. |
| `deedlock_by_notary` | Paginated history by notary DID. |
| `deedlock_pricing` | Per-event tier pricing and annual contract bands. |
| `deedlock_health` | Service health and supported notarization types. |

## Endpoints

| Method | Path |
|---|---|
| `POST` | `/v1/deedlock/deed_attest` |
| `GET`  | `/v1/deedlock/deed_get/{attestation_id}` |
| `GET`  | `/v1/deedlock/deed_verify/{attestation_id}` |
| `POST` | `/v1/deedlock/notary_session` |
| `POST` | `/v1/deedlock/recording_attest` |
| `POST` | `/v1/deedlock/chain_verify` |
| `GET`  | `/v1/deedlock/by-property/{property_id}` |
| `GET`  | `/v1/deedlock/by-buyer/{buyer_did}` |
| `GET`  | `/v1/deedlock/by-seller/{seller_did}` |
| `GET`  | `/v1/deedlock/by-notary/{notary_did}` |
| `GET`  | `/v1/deedlock/health` |
| `GET`  | `/v1/deedlock/pricing` |
| `POST` | `/v1/deedlock/mcp` |

## State machine

```
disclosure → offer → acceptance → escrow_open → title_search →
notary_session → deed_signed → recording_submitted → recorded →
closing → wire_disbursed
```

`amendment` and `cancellation` are valid from any state. Recording attestations validate chain-of-custody against the prior `DEED_SIGNED` attestation. `chain_verify` reports any state-machine gaps or recording mismatches.

## Notarization modalities

| Type | Description |
|---|---|
| `in_person` | Traditional in-person notarization. |
| `ron` | Remote Online Notarization (RON Standards v1.4). |
| `ipen` | In-Person Electronic Notarization. |
| `mail_away` | Mail-away closing package. |

## Standards alignment

| Standard | Coverage |
|---|---|
| ALTA UCD | Closing Disclosure data fields |
| MISMO 3.4 | Loan + property + party schemas |
| RON Standards v1.4 | Remote online notarization session metadata |
| PRIA recording XML | Recording document submission + status |
| FinCEN GTO | Geographic Targeting Order anchoring (Cosmic tier) |
| 1099-S | Seller proceeds reporting (Cosmic tier) |
| HUD-1 | Settlement statement reconciliation (Cosmic tier) |

The Hive cryptographic envelope is appended as a `hive.deedlock.*` extrinsic — invisible to legacy parsers, verifiable offline.

## Connect

Add to your MCP client:

```json
{
  "mcpServers": {
    "hive-deedlock": {
      "url": "https://hivemorph.onrender.com/v1/deedlock/mcp"
    }
  }
}
```

Or run this shim locally:

```bash
git clone https://github.com/srotzin/hive-mcp-deedlock.git
cd hive-mcp-deedlock
npm install
npm start
# server listens on http://localhost:3000
# - MCP endpoint:  POST http://localhost:3000/mcp
# - manifest:      GET  http://localhost:3000/.well-known/mcp.json
# - health:        GET  http://localhost:3000/health
```

## License

MIT — Hive Civilization, Inc. Brand gold `#C08D23`.

---

## Agent-Callable

**hive-mcp-deedlock** is fully agent-callable with no human-in-the-loop for standard attestation calls.

| Property | Value |
|----------|-------|
| Discovery URL | `https://hivemorph.onrender.com/.well-known/agent-card.json` |
| MCP endpoint | `https://hive-mcp-gateway.onrender.com/mcp` (JSON-RPC 2.0 / MCP 2024-11-05) |
| Pricing | $0.0096 / event (Standard), $0.0192 / event (Cosmic/regulated) |
| Payment | USDC on Base 8453 via x402 |
| Treasury | `0x15184Bf50B3d3F52b60434f8942b7D52F2eB436E` |
| DID | `did:hivemorph:w2loren:0x6b11b1bcaf253c` |
| Hive site | [thehiveryiq.com](https://thehiveryiq.com) |

### Sample request (attest a deed state transition)

```bash
# Step 1: get x402 quote (free)
curl -X POST https://hivemorph.onrender.com/v1/x402/quote \
  -H 'Content-Type: application/json' \
  -d '{"agent_did":"did:example:agent","profile":"standard"}'

# Step 2: settle USDC on Base 8453 (amount from quote)

# Step 3: call with proof in X-Payment header
curl -X POST https://hivemorph.onrender.com/v1/deedlock/deed_attest \
  -H 'Content-Type: application/json' \
  -H 'X-Payment: {"nonce":"<from_quote>","tx_hash":"<your_tx>","payer":"<your_addr>","chain":"base"}' \
  -d '{
    "property_id": "APN-12345-67",
    "buyer_did": "did:example:buyer",
    "seller_did": "did:example:seller",
    "state": "Deed_Signed",
    "notary_type": "RON",
    "state_jurisdiction": "TX"
  }'
```

Response: dual-signed Ed25519+ML-DSA-65 receipt with CBOR envelope, anchored on Base 8453.
