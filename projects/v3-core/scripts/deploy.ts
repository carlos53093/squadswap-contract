// import { tryVerify } from '@pancakeswap/common/verify'
import { ContractFactory } from 'ethers'
import { ethers, network } from 'hardhat'
import fs from 'fs'

type ContractJson = { abi: any; bytecode: string }
const artifacts: { [name: string]: ContractJson } = {
  // eslint-disable-next-line global-require
  SquadV3PoolDeployer: require('../artifacts/contracts/SquadV3PoolDeployer.sol/SquadV3PoolDeployer.json'),
  // eslint-disable-next-line global-require
  SquadV3Factory: require('../artifacts/contracts/SquadV3Factory.sol/SquadV3Factory.json'),
  FeeManager: require('../artifacts/contracts/FeeManager.sol/FeeManager.json'),
}

async function main() {
  const [owner] = await ethers.getSigners()
  const networkName = network.name
  console.log('owner', owner.address)

  let squadV3PoolDeployer_address = ''
  let squadV3PoolDeployer
  const SquadV3PoolDeployer = new ContractFactory(
    artifacts.SquadV3PoolDeployer.abi,
    artifacts.SquadV3PoolDeployer.bytecode,
    owner
  )
  if (!squadV3PoolDeployer_address) {
    squadV3PoolDeployer = await SquadV3PoolDeployer.deploy()
    await squadV3PoolDeployer.deployed();

    squadV3PoolDeployer_address = squadV3PoolDeployer.address
    console.log('squadV3PoolDeployer', squadV3PoolDeployer_address)
  } else {
    squadV3PoolDeployer = new ethers.Contract(
      squadV3PoolDeployer_address,
      artifacts.SquadV3PoolDeployer.abi,
      owner
    )
  }

  let squadV3Factory_address = ''
  let squadV3Factory
  if (!squadV3Factory_address) {
    const SquadV3Factory = new ContractFactory(
      artifacts.SquadV3Factory.abi,
      artifacts.SquadV3Factory.bytecode,
      owner
    )
    squadV3Factory = await SquadV3Factory.deploy(squadV3PoolDeployer_address)
    await squadV3Factory.deployed()

    squadV3Factory_address = squadV3Factory.address
    console.log('squadV3Factory', squadV3Factory_address)
  } else {
    squadV3Factory = new ethers.Contract(squadV3Factory_address, artifacts.squadV3Factory.abi, owner)
  }

  // Set FactoryAddress for squadV3PoolDeployer.
  await squadV3PoolDeployer.setFactoryAddress(squadV3Factory_address);

  const FeeManager = new ContractFactory(
    artifacts.FeeManager.abi,
    artifacts.FeeManager.bytecode,
    owner
  )
  const feeManager = await FeeManager.deploy()
  await feeManager.deployed()
  console.log('feeManger', feeManager.address)
  await feeManager.setFactory(squadV3Factory_address)

  await squadV3Factory.changeFeeManager(feeManager.address)

  const contracts = {
    SquadV3Factory: squadV3Factory_address,
    SquadV3PoolDeployer: squadV3PoolDeployer_address,
    FeeManager: feeManager.address
  }

  fs.writeFileSync(`./deployments/${networkName}.json`, JSON.stringify(contracts, null, 2))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
