import { abi as POOL_ABI } from '@pancakeswap/v3-core/artifacts/contracts/PancakeV3Pool.sol/PancakeV3Pool.json'
import { Contract, Wallet } from 'ethers'
import { ISquadV3Pool } from '../../typechain-types'

export default function poolAtAddress(address: string, wallet: Wallet): ISquadV3Pool {
  return new Contract(address, POOL_ABI, wallet) as ISquadV3Pool
}
