// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract DarkRFQ {
    // ── Types ─────────────────────────────────────────────────────────

    enum RFQStatus {
        OPEN,
        CLOSED,
        REVEALED
    }

    enum RevealPolicy {
        BOTH,        // 0 — reveal winning price + maker (default)
        PRICE_ONLY,  // 1 — reveal only winning price
        MAKER_ONLY   // 2 — reveal only winning maker
    }

    struct RFQ {
        address requester;
        string label;
        bool isBuy; // true = buy (lowest price wins), false = sell (highest wins)
        uint256 amount;
        uint256 deadline;
        RFQStatus status;
        uint256 quoteCount;
        euint64 bestPrice;
        eaddress bestMaker;
        bool hasBestQuote;
        RevealPolicy revealPolicy;
        bool winningPriceRevealed;
        bool winningMakerRevealed;
        uint64 revealedWinningPrice;
        address revealedWinningMaker;
    }

    // ── State ─────────────────────────────────────────────────────────

    uint256 public nextRfqId;
    mapping(uint256 => RFQ) internal rfqs;
    mapping(uint256 => mapping(address => bool)) public hasQuoted;

    // ── Events ────────────────────────────────────────────────────────

    event RFQCreated(
        uint256 indexed rfqId,
        address indexed requester,
        string label,
        bool isBuy,
        uint256 amount,
        uint256 deadline,
        uint8 revealPolicy
    );
    event QuoteSubmitted(uint256 indexed rfqId, address indexed maker);
    event RFQClosed(uint256 indexed rfqId);
    event WinnerRevealed(
        uint256 indexed rfqId,
        address winner,
        uint64 price,
        uint8 revealPolicy
    );

    // ── Core Functions ────────────────────────────────────────────────

    function createRFQ(
        string calldata label,
        bool isBuy,
        uint256 amount,
        uint256 deadline,
        RevealPolicy revealPolicy
    ) external returns (uint256 rfqId) {
        require(deadline > block.timestamp, "Deadline must be in future");
        require(amount > 0, "Amount must be positive");

        rfqId = nextRfqId++;
        RFQ storage r = rfqs[rfqId];
        r.requester = msg.sender;
        r.label = label;
        r.isBuy = isBuy;
        r.amount = amount;
        r.deadline = deadline;
        r.status = RFQStatus.OPEN;
        r.revealPolicy = revealPolicy;

        emit RFQCreated(rfqId, msg.sender, label, isBuy, amount, deadline, uint8(revealPolicy));
    }

    function submitQuote(
        uint256 rfqId,
        InEuint64 memory encryptedPrice
    ) external {
        RFQ storage r = rfqs[rfqId];
        require(r.status == RFQStatus.OPEN, "RFQ not open");
        require(block.timestamp < r.deadline, "RFQ expired");
        require(!hasQuoted[rfqId][msg.sender], "Already quoted");

        hasQuoted[rfqId][msg.sender] = true;

        euint64 price = FHE.asEuint64(encryptedPrice);
        FHE.allowThis(price);

        if (!r.hasBestQuote) {
            // First quote — set directly
            r.bestPrice = price;
            r.bestMaker = FHE.asEaddress(msg.sender);
            r.hasBestQuote = true;

            FHE.allowThis(r.bestPrice);
            FHE.allowThis(r.bestMaker);
        } else {
            // Subsequent quotes — encrypted comparison + select
            eaddress encSender = FHE.asEaddress(msg.sender);
            FHE.allowThis(encSender);

            ebool isBetter;
            if (r.isBuy) {
                // Buy side: requester wants lowest price
                isBetter = FHE.lt(price, r.bestPrice);
            } else {
                // Sell side: requester wants highest price
                isBetter = FHE.gt(price, r.bestPrice);
            }

            r.bestPrice = FHE.select(isBetter, price, r.bestPrice);
            r.bestMaker = FHE.select(isBetter, encSender, r.bestMaker);

            FHE.allowThis(r.bestPrice);
            FHE.allowThis(r.bestMaker);
        }

        r.quoteCount++;
        emit QuoteSubmitted(rfqId, msg.sender);
    }

    function closeRFQ(uint256 rfqId) external {
        RFQ storage r = rfqs[rfqId];
        require(r.status == RFQStatus.OPEN, "Not open");
        require(msg.sender == r.requester, "Only requester");
        require(r.quoteCount > 0, "No quotes");
        require(block.timestamp >= r.deadline, "Deadline not passed");

        r.status = RFQStatus.CLOSED;

        // Only decrypt what the reveal policy allows
        if (r.revealPolicy != RevealPolicy.MAKER_ONLY) {
            FHE.decrypt(r.bestPrice);
        }
        if (r.revealPolicy != RevealPolicy.PRICE_ONLY) {
            FHE.decrypt(r.bestMaker);
        }

        emit RFQClosed(rfqId);
    }

    function revealResults(uint256 rfqId) external {
        RFQ storage r = rfqs[rfqId];
        require(r.status == RFQStatus.CLOSED, "Not closed");

        bool priceReady;
        bool makerReady;

        // Price: skip if policy is MAKER_ONLY
        if (r.revealPolicy == RevealPolicy.MAKER_ONLY) {
            priceReady = true;
        } else if (!r.winningPriceRevealed) {
            (uint64 price, bool decrypted) = FHE.getDecryptResultSafe(
                r.bestPrice
            );
            if (decrypted) {
                r.revealedWinningPrice = price;
                r.winningPriceRevealed = true;
                priceReady = true;
            }
        } else {
            priceReady = true;
        }

        // Maker: skip if policy is PRICE_ONLY
        if (r.revealPolicy == RevealPolicy.PRICE_ONLY) {
            makerReady = true;
        } else if (!r.winningMakerRevealed) {
            (address maker, bool decrypted) = FHE.getDecryptResultSafe(
                r.bestMaker
            );
            if (decrypted) {
                r.revealedWinningMaker = maker;
                r.winningMakerRevealed = true;
                makerReady = true;
            }
        } else {
            makerReady = true;
        }

        if (priceReady && makerReady) {
            r.status = RFQStatus.REVEALED;
            emit WinnerRevealed(
                rfqId,
                r.revealedWinningMaker,
                r.revealedWinningPrice,
                uint8(r.revealPolicy)
            );
        }
    }

    // ── View Functions ────────────────────────────────────────────────

    function getRFQInfo(
        uint256 rfqId
    )
        external
        view
        returns (
            address requester,
            string memory label,
            bool isBuy,
            uint256 amount,
            uint256 deadline,
            RFQStatus status,
            uint256 quoteCount,
            RevealPolicy revealPolicy,
            bool winningPriceRevealed,
            bool winningMakerRevealed,
            uint64 revealedWinningPrice,
            address revealedWinningMaker
        )
    {
        RFQ storage r = rfqs[rfqId];
        return (
            r.requester,
            r.label,
            r.isBuy,
            r.amount,
            r.deadline,
            r.status,
            r.quoteCount,
            r.revealPolicy,
            r.winningPriceRevealed,
            r.winningMakerRevealed,
            r.revealedWinningPrice,
            r.revealedWinningMaker
        );
    }

    function getBestPriceHandle(
        uint256 rfqId
    ) external view returns (euint64) {
        return rfqs[rfqId].bestPrice;
    }

    function getBestMakerHandle(
        uint256 rfqId
    ) external view returns (eaddress) {
        return rfqs[rfqId].bestMaker;
    }
}
