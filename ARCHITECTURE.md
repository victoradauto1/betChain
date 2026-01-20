# BetChain — Architecture Notes

This document describes the architectural decisions, state model, and lifecycle design
principles used in the BetChain protocol and its frontend integration.

---

## 🧱 Design Principles

- Explicit lifecycle modeling
- Minimal persistent storage
- Deterministic and auditable behavior
- Separation of concerns between logic, storage, and interface layers
- Security-first assumptions
- Frontend as a command interface, not a state mirror

---

## 🔄 Lifecycle Model

Each bet follows a strictly defined lifecycle:

1. Created  
2. Open  
3. Resolved  
4. Settled  
5. Finalized  

State transitions are validated through **explicit guards** derived from protocol rules,
rather than relying solely on stored enum values.

---

## 🧠 Logical State vs Stored State

### Stored State

Stored state represents the **minimal set of data persisted on-chain**, such as:
- Timestamps
- Participation records
- Resolution and settlement flags

This minimizes gas usage and reduces the attack surface.

### Logical State

Logical state is **derived at runtime** based on:
- Current block timestamp
- Stored flags
- Protocol invariants

The effective state of a bet is therefore inferred, not constantly mutated.

---

## 💤 Lazy State Transitions

The protocol uses **lazy state evaluation**:

- State is reconciled only when required
- Transitions are derived, not eagerly written
- Avoids unnecessary storage writes
- Prevents inconsistent intermediate states

This approach is especially effective for time-based and multi-step lifecycles.

---

## 🔁 Idempotent Lifecycle Actions

Lifecycle-related functions are designed to be **idempotent**:

- Repeated calls do not cause duplicated effects
- State changes are applied only once
- Subsequent calls safely short-circuit

This enables:
- Retry-safe execution
- External automation
- Robust handling of partial failures

---

## 🧩 Frontend Integration Model

The frontend interacts with the protocol exclusively through **semantic actions**.

Key characteristics:
- No frontend-managed lifecycle state
- No duplicated transition logic
- No optimistic assumptions

The `BetContext` acts as:
- A write-only gateway
- A signer-bound execution layer
- A normalization boundary for contract errors

All lifecycle correctness remains enforced on-chain.

---

## 🔐 Security Considerations

- Explicit transition guards
- No reliance on implicit state
- Minimal surface for reentrancy
- Deterministic execution paths
- Frontend does not introduce additional trust assumptions

---

## 🧪 Testing Philosophy

Tests focus on:
- Lifecycle correctness
- Invalid transition rejection
- Idempotent behavior
- Edge-case resilience
- Protection against repeated execution

---

## 📌 Final Notes

The architecture prioritizes **clarity, correctness, and auditability**.

Both the protocol and the frontend are designed to reflect real-world smart contract
engineering practices, avoiding state duplication, hidden assumptions, and UI-driven logic.
