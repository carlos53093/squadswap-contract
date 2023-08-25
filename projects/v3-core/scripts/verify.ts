import { verifyContract } from '../../../common/verify'
import { sleep } from '../../../common/sleep'

async function main() {
  const networkName = network.name
  const deployedContracts = await import(`../../v3-core/deployments/${networkName}.json`)

  // Verify SquadV3PoolDeployer
  console.log('Verify SquadV3PoolDeployer')
  await verifyContract(deployedContracts.SquadV3PoolDeployer)
  await sleep(10000)

  // Verify squadV3Factory
  console.log('Verify squadV3Factory')
  await verifyContract(deployedContracts.SquadV3Factory, [deployedContracts.SquadV3PoolDeployer])
  await sleep(10000)

  console.log('Verify feeManager')
  await verifyContract(deployedContracts.FeeManager)
  await sleep(10000)

  // await verifyContract('0x5Ecb5717120E1A10Ec778322eC82Ba781E5420E0')
  // await sleep(10000)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
