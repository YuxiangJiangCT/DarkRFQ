import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/node'

describe('DarkRFQ', function () {
  // Fixture: deploy contract + prepare signers
  async function deployFixture() {
    const [requester, maker1, maker2, maker3] = await hre.ethers.getSigners()

    const Factory = await hre.ethers.getContractFactory('DarkRFQ')
    const darkRFQ = await Factory.deploy()

    // Future deadline: 1 hour from now
    const now = await time.latest()
    const deadline = now + 3600

    return { darkRFQ, requester, maker1, maker2, maker3, deadline }
  }

  // Helper: initialize cofhejs for a signer
  async function initSigner(signer: any) {
    await hre.cofhe.expectResultSuccess(
      hre.cofhe.initializeWithHardhatSigner(signer)
    )
  }

  // Helper: encrypt a uint64 price
  async function encryptPrice(value: bigint) {
    const [encrypted] = await hre.cofhe.expectResultSuccess(
      cofhejs.encrypt([Encryptable.uint64(value)] as const)
    )
    return encrypted
  }

  describe('RFQ Creation', function () {
    beforeEach(function () {
      if (!hre.cofhe.isPermittedEnvironment('MOCK')) this.skip()
    })

    it('should create a buy RFQ with correct parameters', async function () {
      const { darkRFQ, requester, deadline } = await loadFixture(deployFixture)

      await expect(
        darkRFQ.createRFQ('100 ETH', true, 100, deadline)
      )
        .to.emit(darkRFQ, 'RFQCreated')
        .withArgs(0, requester.address, '100 ETH', true, 100, deadline)

      const info = await darkRFQ.getRFQInfo(0)
      expect(info.requester).to.equal(requester.address)
      expect(info.label).to.equal('100 ETH')
      expect(info.isBuy).to.equal(true)
      expect(info.amount).to.equal(100)
      expect(info.deadline).to.equal(deadline)
      expect(info.status).to.equal(0) // OPEN
      expect(info.quoteCount).to.equal(0)
    })

    it('should create a sell RFQ', async function () {
      const { darkRFQ, deadline } = await loadFixture(deployFixture)

      await darkRFQ.createRFQ('500 USDC', false, 500, deadline)
      const info = await darkRFQ.getRFQInfo(0)
      expect(info.isBuy).to.equal(false)
    })

    it('should create multiple RFQs with incrementing IDs', async function () {
      const { darkRFQ, deadline } = await loadFixture(deployFixture)

      await darkRFQ.createRFQ('RFQ 0', true, 10, deadline)
      await darkRFQ.createRFQ('RFQ 1', false, 20, deadline)
      await darkRFQ.createRFQ('RFQ 2', true, 30, deadline)

      expect(await darkRFQ.nextRfqId()).to.equal(3)

      const info0 = await darkRFQ.getRFQInfo(0)
      const info1 = await darkRFQ.getRFQInfo(1)
      const info2 = await darkRFQ.getRFQInfo(2)
      expect(info0.label).to.equal('RFQ 0')
      expect(info1.label).to.equal('RFQ 1')
      expect(info2.label).to.equal('RFQ 2')
    })
  })

  describe('Quote Submission', function () {
    beforeEach(function () {
      if (!hre.cofhe.isPermittedEnvironment('MOCK')) this.skip()
    })

    it('should accept an encrypted quote', async function () {
      const { darkRFQ, maker1, deadline } = await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      await initSigner(maker1)
      const enc = await encryptPrice(1000n)

      await expect(darkRFQ.connect(maker1).submitQuote(0, enc))
        .to.emit(darkRFQ, 'QuoteSubmitted')
        .withArgs(0, maker1.address)

      const info = await darkRFQ.getRFQInfo(0)
      expect(info.quoteCount).to.equal(1)
    })

    it('should accept multiple quotes from different makers', async function () {
      const { darkRFQ, maker1, maker2, maker3, deadline } =
        await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(1500n))

      await initSigner(maker2)
      await darkRFQ.connect(maker2).submitQuote(0, await encryptPrice(1000n))

      await initSigner(maker3)
      await darkRFQ.connect(maker3).submitQuote(0, await encryptPrice(1200n))

      const info = await darkRFQ.getRFQInfo(0)
      expect(info.quoteCount).to.equal(3)
    })

    it('should reject duplicate quote from same maker', async function () {
      const { darkRFQ, maker1, deadline } = await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      await initSigner(maker1)
      const enc = await encryptPrice(1000n)
      await darkRFQ.connect(maker1).submitQuote(0, enc)

      const enc2 = await encryptPrice(900n)
      await expect(
        darkRFQ.connect(maker1).submitQuote(0, enc2)
      ).to.be.revertedWith('Already quoted')
    })

    it('should reject quote after deadline', async function () {
      const { darkRFQ, maker1, deadline } = await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      // Advance past deadline
      await time.increaseTo(deadline + 1)

      await initSigner(maker1)
      const enc = await encryptPrice(1000n)
      await expect(
        darkRFQ.connect(maker1).submitQuote(0, enc)
      ).to.be.revertedWith('RFQ expired')
    })

    it('should reject quote on closed RFQ', async function () {
      const { darkRFQ, requester, maker1, maker2, deadline } =
        await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      // Submit one quote then close
      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(1000n))
      await time.increaseTo(deadline)
      await darkRFQ.connect(requester).closeRFQ(0)

      // Try to quote on closed RFQ
      await initSigner(maker2)
      await expect(
        darkRFQ.connect(maker2).submitQuote(0, await encryptPrice(900n))
      ).to.be.revertedWith('RFQ not open')
    })
  })

  describe('Best Price Tracking', function () {
    beforeEach(function () {
      if (!hre.cofhe.isPermittedEnvironment('MOCK')) this.skip()
    })

    it('buy RFQ: lowest price wins', async function () {
      const { darkRFQ, requester, maker1, maker2, maker3, deadline } =
        await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      // Submit prices: 1500, 1000, 1200 — 1000 should win
      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(1500n))

      await initSigner(maker2)
      await darkRFQ.connect(maker2).submitQuote(0, await encryptPrice(1000n))

      await initSigner(maker3)
      await darkRFQ.connect(maker3).submitQuote(0, await encryptPrice(1200n))

      // Verify encrypted best price via mock
      const priceHandle = await darkRFQ.getBestPriceHandle(0)
      await hre.cofhe.mocks.expectPlaintext(priceHandle, 1000n)
    })

    it('sell RFQ: highest price wins', async function () {
      const { darkRFQ, requester, maker1, maker2, maker3, deadline } =
        await loadFixture(deployFixture)
      await darkRFQ.createRFQ('500 USDC', false, 500, deadline)

      // Submit prices: 800, 1200, 1000 — 1200 should win
      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(800n))

      await initSigner(maker2)
      await darkRFQ.connect(maker2).submitQuote(0, await encryptPrice(1200n))

      await initSigner(maker3)
      await darkRFQ.connect(maker3).submitQuote(0, await encryptPrice(1000n))

      const priceHandle = await darkRFQ.getBestPriceHandle(0)
      await hre.cofhe.mocks.expectPlaintext(priceHandle, 1200n)
    })

    it('single quote wins by default', async function () {
      const { darkRFQ, maker1, deadline } = await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(2000n))

      const priceHandle = await darkRFQ.getBestPriceHandle(0)
      await hre.cofhe.mocks.expectPlaintext(priceHandle, 2000n)
    })
  })

  describe('Close RFQ', function () {
    beforeEach(function () {
      if (!hre.cofhe.isPermittedEnvironment('MOCK')) this.skip()
    })

    it('should only allow requester to close', async function () {
      const { darkRFQ, maker1, deadline } = await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(1000n))
      await time.increaseTo(deadline)

      await expect(
        darkRFQ.connect(maker1).closeRFQ(0)
      ).to.be.revertedWith('Only requester')
    })

    it('should reject closing already closed RFQ', async function () {
      const { darkRFQ, requester, maker1, deadline } =
        await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(1000n))
      await time.increaseTo(deadline)
      await darkRFQ.connect(requester).closeRFQ(0)

      await expect(
        darkRFQ.connect(requester).closeRFQ(0)
      ).to.be.revertedWith('Not open')
    })

    it('should reject closing RFQ with zero quotes', async function () {
      const { darkRFQ, requester, deadline } = await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)
      await time.increaseTo(deadline)

      await expect(
        darkRFQ.connect(requester).closeRFQ(0)
      ).to.be.revertedWith('No quotes')
    })

    it('should reject closing before deadline', async function () {
      const { darkRFQ, requester, maker1, deadline } =
        await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(1000n))

      // Don't advance time
      await expect(
        darkRFQ.connect(requester).closeRFQ(0)
      ).to.be.revertedWith('Deadline not passed')
    })
  })

  describe('Full Lifecycle', function () {
    beforeEach(function () {
      if (!hre.cofhe.isPermittedEnvironment('MOCK')) this.skip()
    })

    it('full buy RFQ lifecycle: create → quote → close → reveal', async function () {
      const { darkRFQ, requester, maker1, maker2, maker3, deadline } =
        await loadFixture(deployFixture)

      // 1. Create buy RFQ
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      // 2. Submit 3 quotes: 1500, 1000, 1200
      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(1500n))

      await initSigner(maker2)
      await darkRFQ.connect(maker2).submitQuote(0, await encryptPrice(1000n))

      await initSigner(maker3)
      await darkRFQ.connect(maker3).submitQuote(0, await encryptPrice(1200n))

      // 3. Close RFQ (triggers FHE.decrypt)
      await time.increaseTo(deadline)
      await expect(darkRFQ.connect(requester).closeRFQ(0))
        .to.emit(darkRFQ, 'RFQClosed')
        .withArgs(0)

      let info = await darkRFQ.getRFQInfo(0)
      expect(info.status).to.equal(1) // CLOSED

      // 4. Wait for mock async decryption delay (1-10 seconds)
      await time.increase(11)

      // 5. Reveal results
      await expect(darkRFQ.revealResults(0))
        .to.emit(darkRFQ, 'WinnerRevealed')
        .withArgs(0, maker2.address, 1000)

      info = await darkRFQ.getRFQInfo(0)
      expect(info.status).to.equal(2) // REVEALED
      expect(info.revealedWinningPrice).to.equal(1000)
      expect(info.revealedWinningMaker).to.equal(maker2.address)
      expect(info.winningPriceRevealed).to.equal(true)
      expect(info.winningMakerRevealed).to.equal(true)
    })

    it('full sell RFQ lifecycle: create → quote → close → reveal', async function () {
      const { darkRFQ, requester, maker1, maker2, maker3, deadline } =
        await loadFixture(deployFixture)

      // 1. Create sell RFQ
      await darkRFQ.createRFQ('500 USDC', false, 500, deadline)

      // 2. Submit 3 quotes: 800, 1200, 1000
      await initSigner(maker1)
      await darkRFQ.connect(maker1).submitQuote(0, await encryptPrice(800n))

      await initSigner(maker2)
      await darkRFQ.connect(maker2).submitQuote(0, await encryptPrice(1200n))

      await initSigner(maker3)
      await darkRFQ.connect(maker3).submitQuote(0, await encryptPrice(1000n))

      // 3. Close
      await time.increaseTo(deadline)
      await darkRFQ.connect(requester).closeRFQ(0)

      // 4. Wait for mock async decryption delay
      await time.increase(11)

      // 5. Reveal
      await darkRFQ.revealResults(0)

      const info = await darkRFQ.getRFQInfo(0)
      expect(info.status).to.equal(2) // REVEALED
      expect(info.revealedWinningPrice).to.equal(1200)
      expect(info.revealedWinningMaker).to.equal(maker2.address)
    })

    it('should reject reveal on non-closed RFQ', async function () {
      const { darkRFQ, deadline } = await loadFixture(deployFixture)
      await darkRFQ.createRFQ('100 ETH', true, 100, deadline)

      await expect(darkRFQ.revealResults(0)).to.be.revertedWith('Not closed')
    })
  })
})
