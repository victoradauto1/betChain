# BetChain — Architecture Notes

This document describes the architectural decisions, state model, and lifecycle design principles used in the BetChain protocol.

---

## 🧱 Design Principles

- Explicit lifecycle modeling
- Minimal persistent storage
- Deterministic and auditable behavior
- Separation of concerns between logic and storage
- Security-first assumptions

---

## 🔄 Lifecycle Model

Each bet follows a strictly defined lifecycle:

1. **Created**
2. **Open**
3. **Resolved**
4. **Settled**
5. **Finalized**

State transitions are validated through guards instead of relying solely on stored enum values.

---

## 🧠 Logical State vs Stored State

### Stored State
The stored state represents the minimal information persisted on-chain, such as:
- Timestamps
- Participation data
- Resolution flags

Stored state is intentionally kept small to reduce gas costs and attack surface.

### Logical State
The logical state is inferred at runtime based on:
- Current block timestamp
- Stored flags
- Protocol rules

This allows the contract to reason about the *effective* state without constantly mutating storage.

---

## 💤 Lazy State Transitions

Instead of updating state eagerly on every interaction, the protocol applies **lazy evaluation**:

- State is reconciled only when required
- Transitions are derived from rules rather than stored aggressively
- Prevents unnecessary writes and reduces inconsistency risk

This pattern is especially useful in time-based systems.

---

## 🔁 Idempotent Lifecycle Actions

Lifecycle functions are designed to be **idempotent**, meaning:

- Repeated calls do not cause duplicated effects
- State transitions are applied only once
- Subsequent calls safely short-circuit

This is critical for:
- External automation
- Retry-safe execution
- Defense against partial failures

---

## 🔐 Security Considerations

- Explicit transition guards
- No reliance on implicit state assumptions
- Minimal surface for reentrancy
- Clear execution order for lifecycle steps

---

## 🧪 Testing Philosophy

Tests focus on:
- Lifecycle correctness
- Invalid transition rejection
- Idempotent behavior
- Edge-case resilience

---

## 📌 Final Notes

The architecture favors **clarity and correctness over complexity**, aiming to reflect real-world smart contract engineering practices rather than simplified examples.
