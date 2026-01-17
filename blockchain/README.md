# BetChain — On-chain Betting Protocol (Portfolio Project)

This repository contains **BetChain**, an on-chain betting protocol implemented in Solidity, designed as a **professional portfolio project** to demonstrate smart contract architecture, state management, and security-conscious design in Ethereum-based systems.

The goal of this project is **not commercial deployment**, but to showcase the ability to design **production-style smart contracts** with clear state transitions, minimal trust assumptions, and robust edge-case handling.

---

## Core Concepts

### 1. Deadline Sovereignty
Bets are governed by time, not by users.

- The `deadline` is the single source of truth for bet closure.
- Bets automatically transition from `OPEN` → `CLOSED` once the deadline is reached.
- Any function interaction triggers a **lazy state synchronization**, ensuring correctness without relying on a privileged operator.

---

### 2. Lazy State Synchronization
The contract avoids continuous state updates.

- Stored state is synchronized **only when needed**.
- Logical state (derived from `block.timestamp`) is computed on demand.
- This prevents state drift and reduces unnecessary storage writes.

---

### 3. Logical vs Stored State
The contract explicitly separates:

- **Stored state** (persisted in storage)
- **Logical state** (derived at runtime)

View functions always return the **logical truth**, even if storage has not yet been synchronized.

---

### 4. Permissionless Lifecycle
All lifecycle actions are permissionless:

- Anyone can close a bet after its deadline.
- Anyone can settle a closed bet by providing the winning option.
- Users can independently withdraw their winnings.

The protocol does **not depend on a centralized operator** to remain functional.

---

### 5. Defensive Design
The contract follows a defensive programming model:

- Explicit state validation on every external call
- Custom errors for invalid transitions
- Idempotent behavior for lifecycle actions
- Reentrancy protection on withdrawals
- Effects-before-interactions pattern

---

## Protocol Lifecycle

1. **Bet Creation**
   - A bet is created with a title and a future deadline.

2. **Option Registration**
   - Options can be added while the bet is open.
   - Options are permanently locked after the first bet is placed.

3. **Betting Phase**
   - Users place ETH on a chosen option.
   - A minimum of two options is required.

4. **Automatic Closure**
   - Once the deadline passes, the bet is logically closed.

5. **Settlement**
   - A winning option is selected.
   - The bet transitions to `SETTLED`.

6. **Withdrawals**
   - Winners withdraw their proportional share of the total pool.

---

## Trust Model

This project intentionally **does not implement result verification mechanisms** such as:

- Oracles
- Commit–reveal schemes
- Multisig settlement
- External consensus proofs

The winning option is assumed to be provided by an external trusted process.

This decision is **deliberate** and aligned with the project’s scope:

> The focus is on **on-chain mechanics, lifecycle correctness, and architectural maturity**, not oracle engineering.

---

## Design Decisions (Explicit)

### Why lazy state synchronization?
To avoid:
- Continuous storage writes
- Reliance on cron-like automation
- Centralized keepers

State correctness is guaranteed **at the moment of interaction**.

---

### Why logical vs stored state separation?
To ensure:
- Accurate read-only views
- No false "open" states after deadlines
- Safer front-end and integration behavior

This pattern mirrors production DeFi protocols.

---

### Why permissionless settlement?
To eliminate:
- Single points of failure
- Operator dependence
- Frozen funds scenarios

Any user can move the protocol forward.

---

### Why lock options on first bet?
To prevent:
- Post-bet manipulation
- Information asymmetry
- Late option injection

This ensures fairness once economic activity begins.

---

## Production Extensions (Out of Scope by Design)

If this were a production system, the following could be added:

- Oracle-based result validation (e.g. Chainlink)
- Commit–reveal settlement for subjective outcomes
- Multisig or DAO-controlled settlement authority
- Dispute and challenge windows
- Protocol fees and treasury management

These features were intentionally excluded to keep the project **focused, readable, and audit-friendly**.

---

## Tech Stack

- Solidity `^0.8.28`
- Hardhat
- OpenZeppelin (`ReentrancyGuard`)
- Ethers.js
- Mocha / Solidity tests (optional)

---

## Why This Project Matters

This contract demonstrates:

- Time-based authority
- Clear lifecycle enforcement
- Minimal trust assumptions
- Gas-conscious design
- Production-level defensive coding

It is intentionally scoped to highlight **engineering maturity**, not feature quantity.

---

## Disclaimer

This project is provided **for educational and portfolio purposes only**.  
It has **not been audited** and should not be used in production environments.
