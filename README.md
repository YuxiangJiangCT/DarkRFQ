![Solidity](https://img.shields.io/badge/Solidity-0.8.25-363636?logo=solidity)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![FHE](https://img.shields.io/badge/FHE-Fhenix%20CoFHE-FF6B35)
![Tests](https://img.shields.io/badge/Tests-24%20passing-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)

> Built for **Fhenix Privacy-by-Design dApp Buildathon \u2014 Wave 1**

# DarkRFQ

> Privacy-native execution infrastructure for confidential price discovery on public blockchains.

On transparent blockchains, every on-chain quote leaks pricing strategy — enabling front-running, discouraging participation, and distorting price discovery. DarkRFQ is a new primitive for confidential price discovery: quotes are encrypted client-side with Fully Homomorphic Encryption, compared homomorphically on-chain, and only the minimum necessary outcome is revealed. Losing quotes remain permanently encrypted.

Starting with sealed-bid RFQs as the first wedge, DarkRFQ aims to become the execution layer for any high-stakes coordination that requires price privacy — treasury rebalancing, liquidation auctions, solver competition, and beyond.

## What We've Validated

This is not a concept. The core primitive has been built and verified end-to-end:

- **Deployed on Sepolia** with full encrypted quote lifecycle ([`0x0CFddD9fb73648D095A3791115A89DcE4b96faB6`](https://sepolia.etherscan.io/address/0x0CFddD9fb73648D095A3791115A89DcE4b96faB6))
- **24 tests passing** — creation, quoting, best-price selection, close, reveal, and all 3 reveal policies
- **Selective reveal** — requester configures what gets decrypted: price-only, maker-only, or both
- **Local E2E verification** script validating the complete lifecycle: create → quote → close → reveal
- **Frontend prototype** with client-side FHE encryption via cofhejs and MetaMask integration

## Why This Matters

Quote leakage is a real and measurable problem. OTC desks lose edge when counterparties see their pricing. DAO treasuries signal sell intent before execution, moving the market against themselves. Liquidation backstops attract front-runners who extract value from distressed collateral.

Current solutions — off-chain RFQ platforms, centralized dark pools — trade away verifiability for privacy. They require trust in a centralized matchmaker and offer no on-chain auditability.

DarkRFQ eliminates this tradeoff: confidential execution with on-chain verifiability. Quotes are private, comparison is trustless, and reveal is configurable.

## Why FHE

For asynchronous, multi-party confidential price discovery on public blockchains, FHE is the best fit. Quotes can be encrypted client-side, compared on encrypted data, and revealed selectively — without requiring all participants to be online at the same time.

|  | FHE-based | ZK-based | MPC-based |
|---|---|---|---|
| Interaction | Non-interactive: encrypt and submit | Prover must generate proof | Parties must be online together |
| Computation | On-chain (coprocessor) | Off-chain (prover) | Off-chain (MPC nodes) |
| Flexibility | New logic = new contract | New logic = new circuit | New logic = new protocol |
| Best for | Async multi-party bidding | Private transfers | Bilateral matching |

## How It Works

```
Requester creates RFQ (label, buy/sell, amount, deadline, reveal policy)
        ↓
Makers submit encrypted quotes (client-side FHE encryption via cofhejs)
        ↓
Contract compares prices homomorphically (FHE.lt / FHE.gt / FHE.select)
        ↓
Deadline passes → Requester closes RFQ → async decryption triggered
        ↓
revealResults() called → winner revealed per reveal policy
        ↓
Losing quotes remain encrypted forever on-chain
```

## Selective Reveal Policy

Not all price discovery needs full transparency. DarkRFQ lets the requester configure exactly what gets decrypted:

| Policy | Reveals | Keeps Private | Use Case |
|--------|---------|---------------|----------|
| **Both** | Price + Maker | Nothing | Transparent auctions |
| **Price Only** | Winning price | Maker identity | Protect maker privacy |
| **Maker Only** | Winning maker | Price | Prevent competitive intelligence leakage |

Selective reveal turns privacy from a binary switch into a configurable policy — protocols and DAOs can tune exactly how much information enters the public domain.

## Initial Beachhead

DarkRFQ starts with the narrowest high-signal use cases where quote privacy has immediate economic value:

- **DAO treasury rebalancing** — sell tokens without signaling to the market, avoiding adverse price movement
- **Liquidation backstop bidding** — lenders collect sealed bids for distressed collateral without attracting front-runners
- **Solver competition** — solvers compete on encrypted quotes for sensitive order flow, preventing quote sniping

These are settings where transparent on-chain coordination leads to measurable economic leakage, and where confidentiality has direct ROI.

## Roadmap

- **Phase 1 — Private RFQ Primitive** *(current)*: Sealed-bid mechanism with configurable reveal policy. Validates that FHE-based price discovery works end-to-end on a public blockchain.
- **Phase 2 — Execution Modes**: Treasury rebalancing workflows and liquidation backstop auctions. Mode-specific parameters, access controls, and time-lock mechanics.
- **Phase 3 — Solver Network**: Open participation framework for solver competition. Integration with intent-based execution protocols.
- **Phase 4 — Settlement Rails**: Token escrow, atomic settlement, and cross-chain execution coordination.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity 0.8.25 + [Fhenix CoFHE](https://cofhe-docs.fhenix.zone/) |
| Testing | Hardhat + cofhe-hardhat-plugin (mock FHE) |
| Frontend | React 19 + Vite + ethers.js v6 |
| Encryption | cofhejs SDK (client-side FHE) |
| Network | Ethereum Sepolia |

## Quick Start

```bash
# Run tests (24 passing)
npm install
npm test

# Run frontend
cd frontend && npm install && npm run dev

# Deploy to Sepolia
cp .env.example .env  # Add PRIVATE_KEY and SEPOLIA_RPC_URL
npm run deploy:sepolia
```

## Demo Flow

1. **Create RFQ** — Set label, side (BUY/SELL), amount, deadline, and reveal policy
2. **Submit Quotes** — Multiple makers encrypt prices client-side and submit sealed bids
3. **Close RFQ** — After deadline, requester closes → triggers FHE decryption via CoFHE coprocessor
4. **Reveal** — Call revealResults → winning outcome displayed per reveal policy
5. **Privacy preserved** — All losing quotes remain encrypted on-chain forever

## Current Scope & Next Steps

Wave 1 intentionally scopes around validating the core privacy primitive independently of settlement mechanics. The contract demonstrates that confidential price discovery via FHE works end-to-end — encrypted submission, homomorphic comparison, selective reveal.

Token escrow and atomic execution are the natural next integration targets for Phase 2+.

## Built For

[Fhenix Privacy-by-Design dApp Buildathon](https://app.akindo.io/hackathons/BZlDa1VNbsXO7ald) — Wave 1

See [docs/wave1-submission.md](docs/wave1-submission.md) for the full submission narrative.
See [docs/architecture.md](docs/architecture.md) for technical details, contract API, and system architecture.

## License

MIT
