# Frontend Overview

The frontend provides a minimal and intentionally constrained interface for interacting with the BetChain protocol.

Its responsibility is not to mirror on-chain state, but to:
- Orchestrate user-driven write operations
- Enforce conservative usage at the UI boundary
- Avoid introducing arbitrary sources of truth

---

## Scope and Responsibility

The frontend supports:
- Bet creation
- Bet participation
- Wallet connection and network validation

The frontend intentionally does **not expose**:
- Bet settlement
- Winner selection
- Withdrawals

This is a deliberate architectural decision.

---

## Rationale for Excluding Settlement

Defining a winning option is a business rule that depends on an external source of truth.

Without:
- Oracles
- Governance mechanisms
- Verifiable off-chain attestations

Exposing settlement at the UI layer would introduce arbitrary decision-making.

Settlement remains a protocol-level capability.

---

## BetContext

The `BetContext` acts as the single write-capable integration layer.

Responsibilities:
- Wallet connection
- Signer-bound contract instantiation
- Semantic action exposure
- Error normalization

The context does not:
- Manage lifecycle state
- Mirror on-chain data
- Enforce business rules

---

## Design Rationale

- No duplicated lifecycle logic
- No optimistic assumptions
- Frontend acts as a command interface

This keeps the UI predictable and audit-friendly.
