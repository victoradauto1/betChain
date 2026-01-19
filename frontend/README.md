## Frontend Overview

The frontend provides a minimal interface for interacting with the BetChain protocol.
Its primary responsibility is to handle user-driven **write operations** via a connected wallet.

Public read access to blockchain data is intentionally decoupled from wallet connection
to allow unrestricted protocol exploration.

---

## BetChainProvider

The `BetChainProvider` context is responsible for:
- Wallet connection and network validation
- Providing authenticated write access to the BetChain contract
- Exposing a semantic action-based API (`actions.*`)
- Normalizing custom smart contract errors

This context is intentionally focused on **state-changing operations**.
Read-only blockchain access should not depend on it.

---

## Notes

- All write operations require a connected wallet on the target network
- Contract errors are surfaced using their custom error names when available
