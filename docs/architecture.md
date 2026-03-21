# DarkRFQ — Architecture

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
│       │   ├── Header.tsx
│       │   ├── RFQCard.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── SubmitQuoteForm.tsx   # FHE encryption + quote submission
│       │   ├── CloseButton.tsx
│       │   ├── RevealPanel.tsx
│       │   ├── TxProgressModal.tsx
│       │   ├── Toast.tsx
│       │   ├── ConfirmDialog.tsx
│       │   ├── Spinner.tsx
│       │   ├── Skeleton.tsx
│       │   ├── CopyButton.tsx
│       │   └── ErrorBoundary.tsx
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── CreateRFQ.tsx
│       │   └── RFQDetail.tsx
│       ├── hooks/
│       │   ├── useCountdown.ts
│       │   ├── useNetwork.ts
│       │   └── useTxProgress.ts
│       └── contexts/
│           └── ToastContext.tsx
└── hardhat.config.ts
```

## RFQ State Machine

```
   OPEN                    CLOSED                  REVEALED
┌──────────┐          ┌──────────────┐          ┌──────────────┐
│ Accepting │  close   │  Decrypting  │  reveal  │   Winner     │
│  quotes   │────────→ │  via CoFHE   │────────→ │  displayed   │
│           │          │  coprocessor │          │  per policy  │
└──────────┘          └──────────────┘          └──────────────┘
     ↑
  submitQuote()
  (encrypted)
```

- **OPEN → CLOSED**: Only the requester can close, only after deadline, only if ≥1 quote exists
- **CLOSED → REVEALED**: Anyone can call `revealResults()` once CoFHE decryption completes
- Transitions are irreversible

## Reveal Policy

The requester selects a `RevealPolicy` at RFQ creation time. This controls which encrypted fields get sent to the CoFHE coprocessor for decryption:

```solidity
enum RevealPolicy {
    BOTH,        // 0 — decrypt winning price AND maker address
    PRICE_ONLY,  // 1 — decrypt winning price only, maker stays encrypted
    MAKER_ONLY   // 2 — decrypt winning maker only, price stays encrypted
}
```

**In `closeRFQ()`:**
```solidity
if (r.revealPolicy != RevealPolicy.MAKER_ONLY) {
    FHE.decrypt(r.bestPrice);   // Request price decryption
}
if (r.revealPolicy != RevealPolicy.PRICE_ONLY) {
    FHE.decrypt(r.bestMaker);   // Request maker decryption
}
```

**In `revealResults()`:**
```solidity
// Poll CoFHE for decryption results
(uint64 price, bool decrypted) = FHE.getDecryptResultSafe(r.bestPrice);
(address maker, bool decrypted) = FHE.getDecryptResultSafe(r.bestMaker);
```

Fields that are never decrypted remain encrypted on-chain permanently — there is no mechanism to retroactively decrypt them.

## FHE Operations Used

| Operation | Purpose |
|-----------|---------|
| `FHE.asEuint64(input)` | Convert encrypted input to FHE-operable type |
| `FHE.asEaddress(msg.sender)` | Encrypt maker address |
| `FHE.lt(a, b)` | Encrypted less-than comparison (buy RFQs: lowest wins) |
| `FHE.gt(a, b)` | Encrypted greater-than comparison (sell RFQs: highest wins) |
| `FHE.select(cond, a, b)` | Conditional select on encrypted boolean |
| `FHE.decrypt(handle)` | Request async decryption via CoFHE |
| `FHE.getDecryptResultSafe(handle)` | Poll for decryption result |
| `FHE.allowThis(handle)` | Grant contract permission to operate on encrypted value |

## Contract API

| Function | Description |
|----------|-------------|
| `createRFQ(label, isBuy, amount, deadline, revealPolicy)` | Create RFQ with reveal policy (0=Both, 1=PriceOnly, 2=MakerOnly) |
| `submitQuote(rfqId, encryptedPrice)` | Submit FHE-encrypted price quote |
| `closeRFQ(rfqId)` | Close RFQ after deadline, trigger decryption (requester only) |
| `revealResults(rfqId)` | Reveal winning outcome after decryption completes |
| `getRFQInfo(rfqId)` | Get all plaintext RFQ metadata |
| `getBestPriceHandle(rfqId)` | Get encrypted best price handle |
| `getBestMakerHandle(rfqId)` | Get encrypted best maker handle |
| `hasQuoted(rfqId, maker)` | Check if maker already submitted a quote |
| `nextRfqId()` | Get next RFQ ID (total count) |

## Events

```solidity
event RFQCreated(uint256 indexed rfqId, address indexed requester,
    string label, bool isBuy, uint256 amount, uint256 deadline, uint8 revealPolicy);
event QuoteSubmitted(uint256 indexed rfqId, address indexed maker);
event RFQClosed(uint256 indexed rfqId);
event WinnerRevealed(uint256 indexed rfqId, address winner, uint64 price, uint8 revealPolicy);
```

## Test Coverage

24 tests covering:
- RFQ creation (single, multiple, incrementing IDs)
- Quote submission (encrypted quotes, duplicate prevention, deadline/status enforcement)
- Best price tracking (buy=lowest wins, sell=highest wins, single quote default)
- Close RFQ (requester-only, already-closed rejection, zero-quotes rejection, pre-deadline rejection)
- Full lifecycle (buy and sell E2E: create → quote → close → reveal)
- Reveal policy (PRICE_ONLY, MAKER_ONLY, BOTH, event emissions)

## Known Technical Notes

- **P-256 precompile conflict**: Hardhat-EDR treats address `0x100` as a P-256 precompile in cancun mode, conflicting with MockZkVerifier. Workaround applied via `patch-package`.
- **Async decryption**: CoFHE decryption is asynchronous. Local tests simulate this with `time.increase(11)`. On testnet, decryption typically takes 5-15 seconds.
- **EVM version**: Contract requires `cancun` for `TSTORE`/`TLOAD` used in the CoFHE ACL library.
