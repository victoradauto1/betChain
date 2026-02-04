# BetChain — On-chain Betting Protocol (Portfolio Project)

This repository contains **BetChain**, an on-chain betting protocol implemented in Solidity, designed as a **portfolio-grade protocol project**.

The objective of this contract is **not commercial deployment**, but to demonstrate professional smart contract architecture, lifecycle modeling, and security-conscious design.

---

## Core Concepts

### 1. Deadline Sovereignty
Bets are governed by time, not by users.

- The `deadline` is the single source of truth for bet closure.
- Bets transition from `OPEN` to `CLOSED` once the deadline is reached.
- No privileged operator is required to advance the lifecycle.

---

### 2. Lazy State Synchronization
State transitions are evaluated only when required.

- Stored state is synchronized on interaction.
- Logical state is derived from `block.timestamp`.
- View functions always reflect the effective lifecycle state.

---

### 3. Logical vs Stored State
The contract explicitly separates:

- **Stored state**: minimal persisted data
- **Logical state**: inferred runtime truth

This prevents stale reads and incorrect UI assumptions.

---

### 4. Permissionless Lifecycle
All lifecycle actions are permissionless at the protocol level:

- Anyone may close a bet after its deadline.
- Anyone may submit settlement data.
- Any participant may withdraw winnings.

This guarantees liveness and prevents frozen funds.

---

### 5. Defensive Design
The protocol follows a defensive programming model:

- Explicit state validation
- Custom errors for invalid transitions
- Idempotent lifecycle actions
- Reentrancy protection
- Effects-before-interactions discipline

---

## Protocol Lifecycle

1. Bet creation
2. Option registration
3. Betting phase
4. Deadline-based closure
5. Settlement
6. Withdrawals

---

## Settlement & Trust Model

This protocol intentionally does **not implement result verification mechanisms**, such as:

- Oracles
- DAO voting
- Commit–reveal schemes
- Multisig settlement

Settlement is treated as a **protocol capability**, not a business rule.

The contract accepts settlement input but does not attempt to define truth.

---

## Explicit Non-Goals

The following concerns are intentionally out of scope:

- Oracle engineering
- Dispute resolution
- Governance mechanisms
- Protocol fees
- Treasury management

---

## Why This Contract Exists

This project demonstrates:

- Time-based authority
- Deterministic lifecycle enforcement
- Minimal trust assumptions
- Robust state modeling
- Production-oriented Solidity patterns

---

## Disclaimer

This project is provided for educational and portfolio purposes only.  
It has not been audited and must not be used in production environments.
