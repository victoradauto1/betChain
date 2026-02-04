# BetChain — Architecture Notes

This document explains the architectural decisions and design rationale behind the BetChain protocol and its frontend integration.

---

## Design Principles

- Time as authority
- Explicit lifecycle modeling
- Minimal persistent storage
- Conservative UI exposure
- Security-first assumptions

---

## Layered Architecture

### Protocol Layer

Responsibilities:
- Define valid state transitions
- Enforce lifecycle correctness
- Guarantee fund safety
- Remain oracle-agnostic

Non-responsibilities:
- Defining real-world truth
- Result verification
- Governance or dispute handling

---

### Application Layer

Responsibilities:
- Execute user-authorized actions
- Respect protocol constraints
- Avoid arbitrary decisions

Non-responsibilities:
- Resolving bets
- Selecting winners
- Overriding protocol logic

---

## Deadline Sovereignty

The deadline is the primary authority for bet progression.

State transitions are derived from time rather than user intent.

---

## Logical vs Stored State

Stored state is intentionally minimal.

Logical state is inferred from:
- Block timestamps
- Protocol invariants

This prevents stale reads and inconsistent behavior.

---

## Settlement as a Protocol Capability

Settlement exists at the protocol layer but is not surfaced by default.

This allows future integrations such as:
- Oracles
- DAO-based resolution
- External attestation mechanisms

without modifying core lifecycle logic.

---

## Final Notes

The architecture prioritizes clarity, correctness, and extensibility.

This mirrors real-world DeFi protocol engineering practices.
