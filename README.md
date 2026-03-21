# DarkRFQ

> **Private quotes. Fairer execution.**

A privacy-native RFQ protocol built on [Fhenix CoFHE](https://www.fhenix.io/). Makers submit encrypted price quotes using Fully Homomorphic Encryption. The contract selects the best quote entirely in the encrypted domain — no one sees any price until the requester reveals only the winner. Losing quotes remain permanently private.

## How It Works

```
Requester creates RFQ (label, buy/sell, amount, deadline)
        ↓
Makers submit encrypted quotes (client-side FHE encryption)
        ↓
Contract compares prices homomorphically (FHE.lt / FHE.gt / FHE.select)
        ↓
Deadline passes → Requester closes RFQ → async decryption requested
        ↓
Anyone calls revealResults → winning price + maker revealed
        ↓
Losing quotes remain encrypted forever
```

## Key Privacy Properties

- **Quote privacy**: All prices are encrypted client-side before submission. The contract never sees plaintext prices.
- **Homomorphic comparison**: Best-price selection happens entirely in the encrypted domain using `FHE.select`.
- **Selective reveal**: Only the winning price and winning maker are decrypted. All losing quotes remain permanently encrypted.
- **Configurable reveal policy**: Requesters choose what to reveal — price only, maker only, or both. Unrevealed fields stay encrypted forever.
- **No trusted party**: The FHE coprocessor handles decryption — no centralized oracle or trusted third party.

## Tech Stack

- **Smart Contract**: Solidity 0.8.25 + [Fhenix CoFHE](https://cofhe-docs.fhenix.zone/) (`@fhenixprotocol/cofhe-contracts`)
- **Testing**: Hardhat + `cofhe-hardhat-plugin` (mock FHE for local testing)
- **Frontend**: React + Vite + ethers.js + `cofhejs` (client-side FHE encryption)
- **Encryption**: cofhejs SDK — encrypts values client-side, generates ZK proofs, sends ciphertexts to contract

## Deployed Contract

| Network | Address |
|---------|---------|
| Ethereum Sepolia | `0x0CFddD9fb73648D095A3791115A89DcE4b96faB6` |

## Project Structure

```
├── contracts/
│   └── DarkRFQ.sol              # Core RFQ contract with FHE
├── test/
│   └── DarkRFQ.test.ts          # 24 tests covering full lifecycle + reveal policy
├── scripts/
│   ├── deploy.ts                # Testnet deployment script
│   └── e2e-local.ts             # Local E2E verification script
├── patches/                     # Hardhat P-256 precompile workarounds
├── frontend/
│   └── src/
│       ├── App.tsx              # Wallet connection + routing
│       ├── contracts.ts         # ABI + typed helpers
│       ├── components/
│       │   ├── Header.tsx       # Navigation + wallet
│       │   ├── RFQCard.tsx      # RFQ list card with privacy indicators
│       │   ├── StatusBadge.tsx  # OPEN / CLOSED / REVEALED badge
│       │   ├── SubmitQuoteForm.tsx  # FHE encryption + quote submission
│       │   ├── CloseButton.tsx  # Close RFQ + trigger decryption
│       │   └── RevealPanel.tsx  # Reveal winner / show results
│       └── pages/
│           ├── Home.tsx         # RFQ list
│           ├── CreateRFQ.tsx    # Create RFQ form
│           └── RFQDetail.tsx    # Quote / Close / Reveal UI
└── hardhat.config.ts
```

## Quick Start

### Prerequisites

- Node.js >= 18
- MetaMask browser extension (for frontend)

### Run Tests

```bash
npm install
npm test
```

All 24 tests should pass:

```
DarkRFQ
  RFQ Creation
    ✓ should create a buy RFQ with correct parameters
    ✓ should create a sell RFQ
    ✓ should create multiple RFQs with incrementing IDs
  Quote Submission
    ✓ should accept an encrypted quote
    ✓ should accept multiple quotes from different makers
    ✓ should reject duplicate quote from same maker
    ✓ should reject quote after deadline
    ✓ should reject quote on closed RFQ
  Best Price Tracking
    ✓ buy RFQ: lowest price wins
    ✓ sell RFQ: highest price wins
    ✓ single quote wins by default
  Close RFQ
    ✓ should only allow requester to close
    ✓ should reject closing already closed RFQ
    ✓ should reject closing RFQ with zero quotes
    ✓ should reject closing before deadline
  Full Lifecycle
    ✓ full buy RFQ lifecycle: create → quote → close → reveal
    ✓ full sell RFQ lifecycle: create → quote → close → reveal
    ✓ should reject reveal on non-closed RFQ
  Reveal Policy
    ✓ PRICE_ONLY: reveals price, maker stays hidden
    ✓ MAKER_ONLY: reveals maker, price stays hidden
    ✓ BOTH: reveals both price and maker
    ✓ should store revealPolicy in getRFQInfo
    ✓ RFQCreated event includes revealPolicy
    ✓ WinnerRevealed event includes revealPolicy
```

### Run Local E2E

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy + run E2E
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/e2e-local.ts --network localhost
```

### Run Frontend

```bash
cd frontend
npm install
cp .env.example .env  # Edit contract address if needed
npm run dev
```

Open http://localhost:5173 and connect MetaMask.

### Demo Flow

1. **Create RFQ** — Set label ("100 ETH"), side (BUY), amount, deadline, and reveal policy
2. **Submit Quotes** — Switch MetaMask accounts, enter a price → encrypted via FHE and submitted
3. **Close RFQ** — After deadline, the requester closes → triggers async decryption
4. **Reveal** — Anyone clicks "Reveal Winner" → winning price and maker displayed
5. **Privacy** — Losing quotes remain encrypted on-chain forever

> *"On transparent chains, every quote leaks maker pricing. On DarkRFQ, makers compete without exposing their quotes during bidding. Only the winning quote is revealed."*

### Deploy to Testnet

```bash
cp .env.example .env
# Edit .env with your PRIVATE_KEY and SEPOLIA_RPC_URL
npm run deploy:sepolia
```

## Contract API

| Function | Description |
|----------|-------------|
| `createRFQ(label, isBuy, amount, deadline, revealPolicy)` | Create a new RFQ with reveal policy (0=Both, 1=PriceOnly, 2=MakerOnly) |
| `submitQuote(rfqId, encryptedPrice)` | Submit an FHE-encrypted price quote |
| `closeRFQ(rfqId)` | Close RFQ after deadline (requester only) |
| `revealResults(rfqId)` | Reveal winning price + maker after decryption |
| `getRFQInfo(rfqId)` | Get all plaintext RFQ metadata |
| `getBestPriceHandle(rfqId)` | Get encrypted best price handle |
| `getBestMakerHandle(rfqId)` | Get encrypted best maker handle |

## Known Limitations

- **No token settlement**: This is a quote-only protocol. Actual asset transfer would require DEX or escrow integration.
- **Single winner**: Only one maker wins per RFQ. Tie-breaking favors the earlier submission.
- **Mock async delay**: Local tests use `time.increase(11)` to simulate the CoFHE async decryption delay.
- **P-256 precompile conflict**: Hardhat-EDR treats address `0x100` as a P-256 precompile in cancun mode, conflicting with MockZkVerifier. Workaround via `patch-package`.

## Roadmap

### Wave 2
- Liquidation-specific RFQ flow
- Optional keeper / reveal automation
- More polished dashboard with RFQ history
- Multi-RFQ management

### Wave 3
- Maker whitelists and reputation
- Quote expiry / amendment within deadline
- Aggregated spread statistics
- Result analytics dashboard

### Wave 4+
- Token escrow and settlement integration
- Liquidation engine integration
- Treasury execution workflows
- Cross-chain RFQ coordination

## Built For

[Fhenix Privacy-by-Design dApp Buildathon](https://app.akindo.io/hackathons/BZlDa1VNbsXO7ald) — Wave 1

## License

MIT
