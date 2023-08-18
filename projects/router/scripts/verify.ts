import { verifyContract } from '../../../common/verify'
import { sleep } from '../../../common/sleep'
// import { configs } from '@pancakeswap/common/config'
import { configs } from '../../../common/config'

async function main() {
  const networkName = network.name
  const config = configs[networkName as any]

  if (!config) {
    throw new Error(`No config found for network ${networkName}`)
  }

  // config.v2Factory = "0xf7b814A12617B92fb17f17276Cbc02ef3523C0D2";    // Squad factory v2 in bsc testnet

  const deployedContracts_v3_core = await import(`../../v3-core/deployments/${networkName}.json`)
  const deployedContracts_v3_periphery = await import(`../../v3-periphery/deployments/${networkName}.json`)
  const deployedContracts_smart_router = await import(`../../router/deployments/${networkName}.json`)

  // Verify SmartRouterHelper
  console.log('Verify SmartRouterHelper')
  await verifyContract(deployedContracts_smart_router.SmartRouterHelper)
  await sleep(10000)

  // Verify swapRouter
  console.log('Verify swapRouter')
  await verifyContract(deployedContracts_smart_router.SmartRouter, [
    config.v2Factory,
    deployedContracts_v3_core.SquadV3PoolDeployer,
    deployedContracts_v3_core.SquadV3Factory,
    deployedContracts_v3_periphery.NonfungiblePositionManager,
    config.stableFactory,
    config.stableInfo,
    config.WNATIVE,
  ])
  await sleep(10000)

  // Verify mixedRouteQuoterV1
  console.log('Verify mixedRouteQuoterV1')
  await verifyContract(deployedContracts_smart_router.MixedRouteQuoterV1, [
    deployedContracts_v3_core.SquadV3PoolDeployer,
    deployedContracts_v3_core.SquadV3Factory,
    config.v2Factory,
    config.stableFactory,
    config.WNATIVE,
  ])
  await sleep(10000)

  // Verify quoterV2
  console.log('Verify quoterV2')
  await verifyContract(deployedContracts_smart_router.QuoterV2, [
    deployedContracts_v3_core.SquadV3PoolDeployer,
    deployedContracts_v3_core.SquadV3Factory,
    config.WNATIVE,
  ])
  await sleep(10000)

  // Verify tokenValidator
  console.log('-----------Verify tokenValidator------------')
  await verifyContract(deployedContracts_smart_router.TokenValidator, [
    config.v2Factory,
    deployedContracts_v3_periphery.NonfungiblePositionManager,
  ])
  await sleep(10000)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
