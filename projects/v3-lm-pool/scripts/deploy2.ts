import { ethers, network } from 'hardhat'
// import { configs } from '@squadswap/common/config'
// import { tryVerify } from '@squadswap/common/verify'
import fs from 'fs'
import { abi } from '@squadswap/v3-core/artifacts/contracts/SquadV3Factory.sol/SquadV3Factory.json'
import { configs } from '../../../common/config';

import { parseEther } from 'ethers/lib/utils'
const currentNetwork = network.name

async function main() {
  const [owner] = await ethers.getSigners()
  // Remember to update the init code hash in SC for different chains before deploying
  const networkName = network.name
  const config = configs[networkName as keyof typeof configs]
  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  const v3DeployedContracts = await import(`../../v3-core/deployments/${networkName}.json`)
  const mcV3DeployedContracts = await import(`../../masterchef-v3/deployments/${networkName}.json`)

  const squadV3Factory_address = v3DeployedContracts.SquadV3Factory

  const SquadV3LmPoolDeployer = await ethers.getContractFactory('SquadV3LmPoolDeployer')
  const squadV3LmPoolDeployer = await SquadV3LmPoolDeployer.deploy(mcV3DeployedContracts.MasterChefV3)

  console.log('squadV3LmPoolDeployer deployed to:', squadV3LmPoolDeployer.address)

  const squadV3Factory = new ethers.Contract(squadV3Factory_address, abi, owner)

  await squadV3Factory.setLmPoolDeployer(squadV3LmPoolDeployer.address)

  const contracts = {
    SquadV3LmPoolDeployer: squadV3LmPoolDeployer.address,
  }
  fs.writeFileSync(`./deployments/${networkName}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
