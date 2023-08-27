import { ethers } from 'hardhat'
import { expect } from './shared/expect'
import { BlockTimestampTest } from '../typechain-types'

function stringToHex(str: string): string {
  return `0x${Buffer.from(str, 'utf8').toString('hex')}`
}

describe('BlockTimestamp Test', () => {
  let blockTimestame: BlockTimestampTest
  before('deploy test contract', async () => {
    blockTimestame = (await (await ethers.getContractFactory('BlockTimestampTest')).deploy()) as BlockTimestampTest
  })

  describe('#encode', () => {
    it('is correct for empty bytes', async () => {
        console.log(await blockTimestame.blockTimestamp())
    //   expect(await blockTimestame.encode(stringToHex(''))).to.eq('')
    })
  })
})
