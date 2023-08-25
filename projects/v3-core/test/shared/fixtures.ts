import { FeeManager } from './../../typechain-types/contracts/FeeManger.sol/FeeManager';
import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { MockTimeSquadV3Pool } from '../../typechain-types/contracts/test/MockTimeSquadV3Pool'
import { TestERC20 } from '../../typechain-types/contracts/test/TestERC20'
import { SquadV3Factory } from '../../typechain-types/contracts/SquadV3Factory'
import { SquadV3PoolDeployer } from '../../typechain-types/contracts/SquadV3PoolDeployer'
import { TestSquadV3Callee } from '../../typechain-types/contracts/test/TestSquadV3Callee'
import { TestSquadV3Router } from '../../typechain-types/contracts/test/TestSquadV3Router'
import { MockTimeSquadV3PoolDeployer } from '../../typechain-types/contracts/test/MockTimeSquadV3PoolDeployer'
import SquadV3LmPoolArtifact from '@squadswap/v3-lm-pool/artifacts/contracts/SquadV3LmPool.sol/SquadV3LmPool.json'

import { Fixture } from 'ethereum-waffle'

interface FactoryFixture {
  factory: SquadV3Factory,
}

interface FeeManagerFixture {
  feeManager: FeeManager,
}

interface DeployerFixture {
  deployer: SquadV3PoolDeployer
}

async function factoryFixture(): Promise<FactoryFixture> {
  const { deployer } = await deployerFixture()
  const factoryFactory = await ethers.getContractFactory('SquadV3Factory')
  const factory = (await factoryFactory.deploy(deployer.address)) as SquadV3Factory
  return { factory }
}

async function feeManagerFixture(factory: string): Promise<FeeManagerFixture> {
  const feeManagerFactory = await ethers.getContractFactory('FeeManager')
  const feeManager = (await feeManagerFactory.deploy()) as FeeManager
  feeManager.setFactory(factory)
  return { feeManager }
}

async function deployerFixture(): Promise<DeployerFixture> {
  const deployerFactory = await ethers.getContractFactory('SquadV3PoolDeployer')
  const deployer = (await deployerFactory.deploy()) as SquadV3PoolDeployer
  return { deployer }
}

interface TokensFixture {
  token0: TestERC20
  token1: TestERC20
  token2: TestERC20
}

async function tokensFixture(): Promise<TokensFixture> {
  const tokenFactory = await ethers.getContractFactory('TestERC20')
  const tokenA = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
  const tokenB = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20
  const tokenC = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20

  const [token0, token1, token2] = [tokenA, tokenB, tokenC].sort((tokenA, tokenB) =>
    tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? -1 : 1
  )

  return { token0, token1, token2 }
}

type TokensAndFactoryFixture = FactoryFixture & TokensFixture & FeeManagerFixture

interface PoolFixture extends TokensAndFactoryFixture {
  swapTargetCallee: TestSquadV3Callee
  swapTargetRouter: TestSquadV3Router
  createPool(
    fee: number,
    tickSpacing: number,
    firstToken?: TestERC20,
    secondToken?: TestERC20
  ): Promise<MockTimeSquadV3Pool>
}

// Monday, October 5, 2020 9:00:00 AM GMT-05:00
export const TEST_POOL_START_TIME = 1601906400

export const poolFixture: Fixture<PoolFixture> = async function (): Promise<PoolFixture> {
  const { factory } = await factoryFixture()
  const { token0, token1, token2 } = await tokensFixture()
  const { feeManager } = await feeManagerFixture(factory.address)
  await factory.changeFeeManager(feeManager.address)

  const MockTimeSquadV3PoolDeployerFactory = await ethers.getContractFactory('MockTimeSquadV3PoolDeployer')
  const MockTimeSquadV3PoolFactory = await ethers.getContractFactory('MockTimeSquadV3Pool')

  const calleeContractFactory = await ethers.getContractFactory('TestSquadV3Callee')
  const routerContractFactory = await ethers.getContractFactory('TestSquadV3Router')

  const swapTargetCallee = (await calleeContractFactory.deploy()) as TestSquadV3Callee
  const swapTargetRouter = (await routerContractFactory.deploy()) as TestSquadV3Router

  const SquadV3LmPoolFactory = await ethers.getContractFactoryFromArtifact(SquadV3LmPoolArtifact)
  return {
    token0,
    token1,
    token2,
    factory,
    feeManager,
    swapTargetCallee,
    swapTargetRouter,
    createPool: async (fee, tickSpacing, firstToken = token0, secondToken = token1) => {
      const mockTimePoolDeployer =
        (await MockTimeSquadV3PoolDeployerFactory.deploy()) as MockTimeSquadV3PoolDeployer
      const tx = await mockTimePoolDeployer.deploy(
        factory.address,
        firstToken.address,
        secondToken.address,
        fee,
        tickSpacing
      )

      const receipt = await tx.wait()
      const poolAddress = receipt.events?.[0].args?.pool as string

      const mockTimeSquadV3Pool = MockTimeSquadV3PoolFactory.attach(poolAddress) as MockTimeSquadV3Pool

      await (
        await factory.setLmPool(
          poolAddress,
          (
            await SquadV3LmPoolFactory.deploy(
              poolAddress,
              ethers.constants.AddressZero,
              Math.floor(Date.now() / 1000)
            )
          ).address
        )
      ).wait()

      return mockTimeSquadV3Pool
    },
  }
}
