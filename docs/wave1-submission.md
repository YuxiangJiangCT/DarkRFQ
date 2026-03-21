# DarkRFQ — Wave 1 Submission

## Problem

On transparent blockchains, every on-chain quote leaks pricing strategy. OTC desks lose edge when counterparties observe their pricing. DAO treasuries signal sell intent before execution, moving the market against themselves. Liquidation backstops attract front-runners who extract value from distressed positions. The result: worse prices, less participation, and broken price discovery.

## Solution

DarkRFQ is a privacy-native execution primitive for confidential price discovery. Makers submit FHE-encrypted quotes that are compared homomorphically on-chain — the contract determines the best price without ever seeing any plaintext. Only the winning outcome is revealed, and the requester controls exactly what gets decrypted through a configurable reveal policy (price-only, maker-only, or both). All losing quotes remain permanently encrypted.

## Why FHE

Confidential price discovery requires computing on private data from multiple independent parties who may not be online at the same time. FHE is the best fit for this interaction pattern: quotes are encrypted client-side, submitted asynchronously, and compared entirely in the encrypted domain on-chain. No multi-party coordination, no proof generation burden on submitters, no trusted matchmaker.

## What's Built

- Smart contract deployed on Sepolia with full encrypted quote lifecycle
- 24 tests covering creation, quoting, best-price selection, close, reveal, and all 3 reveal policies
- Selective reveal policy: requester configures what gets decrypted per RFQ
- Local E2E verification script: create → 3 encrypted quotes → close → reveal
- Frontend with client-side FHE encryption (cofhejs), MetaMask integration, and complete interaction UI

## Beachhead

Starting with the narrowest high-signal use cases where quote privacy has immediate economic value: DAO treasury rebalancing (sell without signaling), liquidation backstop bidding (sealed bids for distressed collateral), and solver competition (encrypted quotes for sensitive order flow).

## Vision

DarkRFQ is the first wedge into privacy-native execution infrastructure. The RFQ primitive validates that FHE-based price discovery works end-to-end on a public blockchain. From here, the protocol expands into execution modes (treasury workflows, liquidation auctions), solver network integration (intent-based protocols), and settlement rails (token escrow, atomic execution, cross-chain coordination).

The long-term goal: any protocol that needs confidential price discovery can plug into DarkRFQ as infrastructure, rather than building bespoke privacy from scratch.

## Team

<!-- Fill in your team details -->

---

*Built for [Fhenix Privacy-by-Design dApp Buildathon](https://app.akindo.io/hackathons/BZlDa1VNbsXO7ald) — Wave 1*
