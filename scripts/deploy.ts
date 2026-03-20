import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying DarkRFQ with account:', deployer.address)

  const DarkRFQ = await ethers.getContractFactory('DarkRFQ')
  const darkRFQ = await DarkRFQ.deploy()
  await darkRFQ.waitForDeployment()

  const address = await darkRFQ.getAddress()
  console.log('DarkRFQ deployed to:', address)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
