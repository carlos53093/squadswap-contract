import { ethers, waffle } from 'hardhat'
import { expect } from './shared/expect'
import { SquadInterfaceMulticallTest } from '../typechain-types'
import { Wallet } from 'ethers'

describe('SquadInterfaceMulticall Test', () => {

  let wallet: Wallet
  let trader: Wallet

  let squadInterfaceMulticall: SquadInterfaceMulticallTest
  let loadFixture: ReturnType<typeof waffle.createFixtureLoader>

  before('deploy test contract', async () => {
    squadInterfaceMulticall = (await (await ethers.getContractFactory('SquadInterfaceMulticallTest')).deploy()) as SquadInterfaceMulticallTest
    ;[wallet, trader] = await (ethers as any).getSigners()
    loadFixture = waffle.createFixtureLoader([wallet, trader])
  })

  describe('test functions', () => {
    it('getCurrentBlockTimestamp', async () => {
        console.log(await squadInterfaceMulticall.getCurrentBlockTimestampTest())
    //   expect(await squadInterfaceMulticall.encode(stringToHex(''))).to.eq('')
    })
    it('getEthBalance', async () => {
      expect(await squadInterfaceMulticall.getEthBalanceTest(wallet.address)).to.gt(ethers.utils.parseEther('9.9'))
    })
    it('multicall', async () => {
      let tx = await squadInterfaceMulticall.multicallTest(wallet.address, '10000000000000000', '')
      let res = await tx.wait()
      expect(res.events[0].args.success).to.eq(true)
    })
  })
})
