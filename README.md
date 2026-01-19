# BetChain — On-chain Betting Protocol

**BetChain** is an on-chain betting protocol implemented in Solidity, designed as a **portfolio-grade project** to demonstrate smart contract architecture, lifecycle management, and security-aware design in Ethereum-compatible environments.

The project focuses on:
- Deterministic state transitions
- Explicit lifecycle modeling
- Minimal and auditable on-chain storage
- Clear separation between logical state and stored state

---

## 🎯 Goals

- Showcase professional Solidity architecture
- Demonstrate lazy state management patterns
- Apply idempotent lifecycle actions
- Emphasize security, clarity, and auditability over feature bloat

---

## 🧠 Core Concepts

- **Lazy State Transitions**  
  State is not eagerly updated on every interaction. Instead, state is derived or reconciled when required, reducing storage writes and minimizing inconsistencies.

- **Logical State vs Stored State**  
  The protocol distinguishes between:
  - *Logical state*: the inferred state based on rules and timestamps
  - *Stored state*: the minimal persisted data required to validate transitions

- **Idempotent Lifecycle Actions**  
  Lifecycle functions are designed to be safely callable multiple times without causing invalid or duplicated state changes.

---

## 🏗 High-level Architecture

The protocol is organized around a clear lifecycle:

1. Bet creation
2. Bet participation
3. Bet resolution
4. Reward settlement
5. Finalization

Each phase is enforced through explicit guards rather than implicit assumptions.

For a detailed architectural breakdown, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## 🧪 Testing

The project includes unit and lifecycle tests that validate:
- Valid and invalid state transitions
- Idempotent behavior
- Protection against repeated execution
- Correct handling of edge cases

---

## ⚠️ Disclaimer

This project is intended for **educational and portfolio purposes only**.  
It has not been audited and should not be used in production environments.
