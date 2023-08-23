import { abi as POOL_ABI } from '@squadswap/v3-core/artifacts/contracts/SquadV3Pool.sol/SquadV3Pool.json'
import { Contract, Wallet } from 'ethers'
import { ISquadV3Pool } from '../../typechain-types'

export default function poolAtAddress(address: string, wallet: Wallet): ISquadV3Pool {
  return new Contract(address, POOL_ABI, wallet) as ISquadV3Pool
}
