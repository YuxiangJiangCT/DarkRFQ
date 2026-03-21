/**
 * Local E2E verification script — simulates the full frontend flow
 * against a running Hardhat node with deployed contract.
 *
 * Usage: npx hardhat run scripts/e2e-local.ts --network localhost
 */
import hre from 'hardhat'
import { cofhejs, Encryptable } from 'cofhejs/node'

const CONTRACT_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'

const ABI = [
  'function createRFQ(string label, bool isBuy, uint256 amount, uint256 deadline, uint8 revealPolicy) external returns (uint256)',
  'function submitQuote(uint256 rfqId, tuple(uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) encryptedPrice) external',
  'function closeRFQ(uint256 rfqId) external',
  'function revealResults(uint256 rfqId) external',
  'function getRFQInfo(uint256 rfqId) external view returns (address, string, bool, uint256, uint256, uint8, uint256, uint8, bool, bool, uint64, address)',
  'function nextRfqId() external view returns (uint256)',
  'event RFQCreated(uint256 indexed rfqId, address indexed requester, string label, bool isBuy, uint256 amount, uint256 deadline, uint8 revealPolicy)',
  'event QuoteSubmitted(uint256 indexed rfqId, address indexed maker)',
  'event RFQClosed(uint256 indexed rfqId)',
  'event WinnerRevealed(uint256 indexed rfqId, address winner, uint64 price, uint8 revealPolicy)',
]

async function main() {
  const [requester, maker1, maker2, maker3] = await hre.ethers.getSigners()
  const contract = new hre.ethers.Contract(CONTRACT_ADDRESS, ABI, requester)

  console.log('\n=== DarkRFQ Local E2E Flow ===\n')

  // 1. Create RFQ
  const now = Math.floor(Date.now() / 1000)
  const deadline = now + 120 // 2 minutes from now
  console.log('1. Creating buy RFQ for "100 ETH"...')
  const tx1 = await contract.createRFQ('100 ETH', true, 100, deadline, 0)
  const receipt1 = await tx1.wait()
  const rfqId = 0
  console.log(`   RFQ #${rfqId} created. TX: ${receipt1.hash}`)

  // Check info
  const info1 = await contract.getRFQInfo(rfqId)
  console.log(`   Status: ${['OPEN', 'CLOSED', 'REVEALED'][info1[5]]}`)
  console.log(`   Quotes: ${info1[6]}`)

  // 2. Submit encrypted quotes
  console.log('\n2. Submitting encrypted quotes from 3 makers...')

  // Initialize cofhejs for maker1
  await hre.cofhe.expectResultSuccess(
    hre.cofhe.initializeWithHardhatSigner(maker1)
  )
  const [enc1] = await hre.cofhe.expectResultSuccess(
    cofhejs.encrypt([Encryptable.uint64(1500n)] as const)
  )
  const tx2 = await contract.connect(maker1).submitQuote(rfqId, enc1)
  await tx2.wait()
  console.log(`   Maker1 submitted quote (encrypted price: 1500)`)

  // Initialize cofhejs for maker2
  await hre.cofhe.expectResultSuccess(
    hre.cofhe.initializeWithHardhatSigner(maker2)
  )
  const [enc2] = await hre.cofhe.expectResultSuccess(
    cofhejs.encrypt([Encryptable.uint64(1000n)] as const)
  )
  const tx3 = await contract.connect(maker2).submitQuote(rfqId, enc2)
  await tx3.wait()
  console.log(`   Maker2 submitted quote (encrypted price: 1000)`)

  // Initialize cofhejs for maker3
  await hre.cofhe.expectResultSuccess(
    hre.cofhe.initializeWithHardhatSigner(maker3)
  )
  const [enc3] = await hre.cofhe.expectResultSuccess(
    cofhejs.encrypt([Encryptable.uint64(1200n)] as const)
  )
  const tx4 = await contract.connect(maker3).submitQuote(rfqId, enc3)
  await tx4.wait()
  console.log(`   Maker3 submitted quote (encrypted price: 1200)`)

  const info2 = await contract.getRFQInfo(rfqId)
  console.log(`   Total quotes: ${info2[6]}`)

  // 3. Advance time past deadline
  console.log('\n3. Advancing time past deadline...')
  await hre.network.provider.send('evm_increaseTime', [130])
  await hre.network.provider.send('evm_mine')
  console.log('   Time advanced.')

  // 4. Close RFQ
  console.log('\n4. Closing RFQ (triggers async decryption)...')
  const tx5 = await contract.connect(requester).closeRFQ(rfqId)
  await tx5.wait()
  const info3 = await contract.getRFQInfo(rfqId)
  console.log(`   Status: ${['OPEN', 'CLOSED', 'REVEALED'][info3[5]]}`)

  // 5. Wait for mock decrypt delay
  console.log('\n5. Waiting for decryption delay...')
  await hre.network.provider.send('evm_increaseTime', [15])
  await hre.network.provider.send('evm_mine')

  // 6. Reveal
  console.log('\n6. Revealing results...')
  const tx6 = await contract.revealResults(rfqId)
  const receipt6 = await tx6.wait()
  console.log(`   TX: ${receipt6.hash}`)

  const info4 = await contract.getRFQInfo(rfqId)
  console.log(`   Status: ${['OPEN', 'CLOSED', 'REVEALED'][info4[5]]}`)
  console.log(`   Reveal Policy: ${['BOTH', 'PRICE_ONLY', 'MAKER_ONLY'][info4[7]]}`)
  console.log(`   Winning Price: ${info4[10]}`)
  console.log(`   Winning Maker: ${info4[11]}`)
  console.log(`   Expected Winner: Maker2 (${maker2.address}) at price 1000`)

  // Verify
  if (Number(info4[5]) === 2 && Number(info4[10]) === 1000 && info4[11] === maker2.address) {
    console.log('\n=== E2E PASSED — Full lifecycle verified ===\n')
  } else {
    console.error('\n=== E2E FAILED ===\n')
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
