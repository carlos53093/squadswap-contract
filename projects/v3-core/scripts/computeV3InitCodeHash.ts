import { ethers } from 'hardhat'
import SquadV3PoolArtifact from '../artifacts/contracts/SquadV3Pool.sol/SquadV3Pool.json'

const hash = ethers.utils.keccak256(SquadV3PoolArtifact.bytecode)
console.log(hash)
