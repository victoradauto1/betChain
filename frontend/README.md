## Frontend Overview

The frontend provides a minimal and intentionally constrained interface for interacting
with the BetChain protocol.

Its responsibility is **not to mirror on-chain state**, but to:
- Orchestrate user-driven write operations
- Enforce correct lifecycle usage at the UI boundary
- Act as a semantic adapter between the user and the protocol

Public read access to blockchain data is intentionally **decoupled** from wallet connection
to allow unrestricted protocol exploration and inspection.

---

## BetContext

The `BetContext` is the central integration layer between the frontend and the protocol.

It is responsible for:
- Wallet connection and network validation
- Instantiating the BetChain contract with a signer
- Exposing a **semantic, action-oriented API** (`actions.*`)
- Normalizing and surfacing custom smart contract errors
- Acting as the single source of truth for write-capable access

The context is deliberately focused on **state-changing interactions only**.

Read-only access (queries, views, analytics) must not depend on the context and should
use direct provider or public RPC access instead.

---

## Design Rationale

- The frontend does **not manage protocol state**
- No duplication of on-chain logic or lifecycle assumptions
- All lifecycle enforcement remains on-chain
- The UI acts as a thin, explicit command layer

This keeps the frontend:
- Predictable
- Easy to audit
- Resistant to desynchronization with contract logic

---

## Notes

- All write operations require a connected wallet on the correct network
- Contract reverts are surfaced using their custom error names when available
- The frontend is intentionally minimal and non-opinionated
