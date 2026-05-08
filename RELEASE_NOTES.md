# v1.0.0 — Hive DeedLock MCP Server

Real estate notarization, deed signing, and county recording attestations. Every transition in the closing state machine (Disclosure → Offer → Acceptance → Escrow_Open → Title_Search → Notary_Session → Deed_Signed → Recording_Submitted → Recorded → Closing → Wire_Disbursed) is bound to a dual-signed (Ed25519 + ML-DSA-65) post-quantum-ready Swarm-MAPET receipt envelope.

## Tools (12)

- `deedlock_deed_attest` — attest a deed/notary state transition
- `deedlock_deed_get` — fetch a stored attestation
- `deedlock_deed_verify` — verify dual signatures
- `deedlock_notary_session` — multi-document notary session (in-person, RON, IPEN, mail-away)
- `deedlock_recording_attest` — county recording with chain-of-custody from DEED_SIGNED
- `deedlock_chain_verify` — verify the full chain for a property
- `deedlock_by_property` / `deedlock_by_buyer` / `deedlock_by_seller` / `deedlock_by_notary`
- `deedlock_pricing` / `deedlock_health`

## Backend

`https://hivemorph.onrender.com/v1/deedlock/*`

## Standards alignment

ALTA UCD, MISMO 3.4, RON Standards v1.4, PRIA recording XML. FinCEN GTO / 1099-S / HUD-1 anchoring on Cosmic tier.

## Council provenance

Ad-hoc Wave-1 launch (Build #32 on hivemorph). Real rails only.

## Pricing

| Tier | Per event | Use case |
|---|---|---|
| Standard | $0.0096 | Standard closings |
| Cosmic | $0.0192 | FinCEN GTO / 1099-S / HUD-1 / inspected |

Annual contract band $35,988 — $1.2M per dyad. Unlimited tier $2,999/mo.

Settlement: USDC on Base 8453 via x402.

Brand gold `#C08D23`.
