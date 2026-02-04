# BetChain — On-chain Betting Protocol

BetChain is a portfolio-grade on-chain betting protocol designed to demonstrate professional smart contract engineering and lifecycle management.

The project emphasizes:
- Deterministic state transitions
- Time-based authority
- Minimal trust assumptions
- Clear separation between protocol and application layers

---

## Goals

- Demonstrate production-style Solidity architecture
- Apply lazy state management patterns
- Enforce explicit lifecycle transitions
- Prioritize auditability over feature breadth

---

## High-level Architecture

The system is organized into two layers:

1. **Protocol Layer**
   - Defines capabilities
   - Enforces invariants
   - Remains oracle-agnostic

2. **Application Layer**
   - Exposes conservative user actions
   - Avoids arbitrary decisions

---

## Lifecycle Overview

1. Bet creation
2. Bet participation
3. Deadline-based closure
4. Settlement (protocol-level)
5. Withdrawals

---

## Documentation

- Smart contract details: `/blockchain`
- Frontend integration: `/frontend`
- Architectural reasoning: `ARCHITECTURE.md`

---

## Disclaimer

This project is intended for educational and portfolio purposes only.  
It has not been audited and should not be used in production.
