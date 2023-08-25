import { assert, expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time, mineUpTo, reset } from "@nomicfoundation/hardhat-network-helpers";
import { TickMath } from "@uniswap/v3-sdk";

import SquadV3PoolDeployerArtifact from "@squadswap/v3-core/artifacts/contracts/SquadV3PoolDeployer.sol/SquadV3PoolDeployer.json";
import SquadV3FactoryArtifact from "@squadswap/v3-core/artifacts/contracts/SquadV3Factory.sol/SquadV3Factory.json";
// import SquadV3FactoryOwnerArtifact from "@squadswap/v3-core/artifacts/contracts/SquadV3FactoryOwner.sol/SquadV3FactoryOwner.json";
import SquadV3SwapRouterArtifact from "@squadswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import NftDescriptorOffchainArtifact from "@squadswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptorOffChain.sol/NonfungibleTokenPositionDescriptorOffChain.json";
import NonfungiblePositionManagerArtifact from "@squadswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import SquadV3LmPoolDeployerArtifact from "@squadswap/v3-lm-pool/artifacts/contracts/SquadV3LmPoolDeployer.sol/SquadV3LmPoolDeployer.json";
import TestLiquidityAmountsArtifact from "@squadswap/v3-periphery/artifacts/contracts/test/LiquidityAmountsTest.sol/LiquidityAmountsTest.json";
import TestPoolArtifact from "@squadswap/v3-core/artifacts/contracts/SquadV3Pool.sol/SquadV3Pool.json"

import ERC20MockArtifact from "./ERC20Mock.json";
import CakeTokenArtifact from "./CakeToken.json";
import SyrupBarArtifact from "./SyrupBar.json";
import MasterChefArtifact from "./MasterChef.json";
import MasterChefV2Artifact from "./MasterChefV2.json";
import MockBoostArtifact from "./MockBoost.json";
import WETHArtiface from "../artifacts/contracts/test/WETH.sol/WETH9.json"

// const WETH9Address = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
// const nativeCurrencyLabel = "tBNB";

describe("MasterChefV3", function () {
  let admin;
  let user1;
  let user2;
  let masterChefV3;
  let WETHContract;

  before(async function () {
    [admin, user1, user2] = await ethers.getSigners();
  });

  beforeEach(async function () {
    reset();

    // Deploy factory
    const SquadV3PoolDeployer = await ethers.getContractFactoryFromArtifact(SquadV3PoolDeployerArtifact);
    const squadV3PoolDeployer = await SquadV3PoolDeployer.deploy();
    const WETHFactory = await ethers.getContractFactoryFromArtifact(WETHArtiface)
    WETHContract =  await WETHFactory.deploy()
    console.log("------------WETH address------", WETHContract.address)
    const SquadV3Factory = await ethers.getContractFactoryFromArtifact(SquadV3FactoryArtifact);
    const squadV3Factory = await SquadV3Factory.deploy(squadV3PoolDeployer.address);

    await squadV3PoolDeployer.setFactoryAddress(squadV3Factory.address);

    const SquadV3SwapRouter = await ethers.getContractFactoryFromArtifact(SquadV3SwapRouterArtifact);
    const squadV3SwapRouter = await SquadV3SwapRouter.deploy(
      squadV3PoolDeployer.address,
      squadV3Factory.address,
      WETHContract.address
    );

    // Deploy NFT position descriptor
    // const NonfungibleTokenPositionDescriptor = await ethers.getContractFactoryFromArtifact(
    //   NftDescriptorOffchainArtifact
    // );
    // const baseTokenUri = "https://nft.squadswap.com/v3/";
    // const nonfungibleTokenPositionDescriptor = await upgrades.deployProxy(NonfungibleTokenPositionDescriptor, [
    //   baseTokenUri,
    // ]);
    // await nonfungibleTokenPositionDescriptor.deployed();
    // TODO:
    await SquadV3SwapRouter.deploy(squadV3PoolDeployer.address, squadV3Factory.address, WETHContract.address);

    // Deploy NFT position manager
    const NonfungiblePositionManager = await ethers.getContractFactoryFromArtifact(NonfungiblePositionManagerArtifact);
    const nonfungiblePositionManager = await NonfungiblePositionManager.deploy(
      squadV3PoolDeployer.address,
      squadV3Factory.address,
      WETHContract.address,
      // nonfungibleTokenPositionDescriptor.address
      ethers.constants.AddressZero
    );

    const ERC20Mock = await ethers.getContractFactoryFromArtifact(ERC20MockArtifact);

    // Deploy factory owner contract
    // const SquadV3FactoryOwner = await ethers.getContractFactoryFromArtifact(SquadV3FactoryOwnerArtifact);
    // const squadV3FactoryOwner = await SquadV3FactoryOwner.deploy(squadV3Factory.address);
    // await squadV3Factory.setOwner(squadV3FactoryOwner.address);

    // Prepare for master chef v3
    const CakeToken = await ethers.getContractFactoryFromArtifact(CakeTokenArtifact);
    const cakeToken = await CakeToken.deploy();

    const SyrupBar = await ethers.getContractFactoryFromArtifact(SyrupBarArtifact);
    const syrupBar = await SyrupBar.deploy(cakeToken.address);

    const lpTokenV1 = await ERC20Mock.deploy("LP Token V1", "LPV1");
    const dummyTokenV2 = await ERC20Mock.deploy("Dummy Token V2", "DTV2");

    const MasterChef = await ethers.getContractFactoryFromArtifact(MasterChefArtifact);
    const masterChef = await MasterChef.deploy(
      cakeToken.address,
      syrupBar.address,
      admin.address,
      ethers.utils.parseUnits("40"),
      ethers.constants.Zero
    );

    await cakeToken["mint(address,uint256)"](admin.address, "100000000000000000000000")

    await cakeToken.transferOwnership(masterChef.address);
    await syrupBar.transferOwnership(masterChef.address);

    await masterChef.add(0, lpTokenV1.address, true); // farm with pid 1 and 0 allocPoint
    await masterChef.add(1, dummyTokenV2.address, true); // farm with pid 2 and 1 allocPoint

    const MasterChefV2 = await ethers.getContractFactoryFromArtifact(MasterChefV2Artifact);
    const masterChefV2 = await MasterChefV2.deploy(masterChef.address, cakeToken.address, 2, admin.address);

    const MockBoost = await ethers.getContractFactoryFromArtifact(MockBoostArtifact);
    const mockBoost = await MockBoost.deploy(masterChefV2.address);

    await dummyTokenV2.mint(admin.address, ethers.utils.parseUnits("1000"));
    await dummyTokenV2.approve(masterChefV2.address, ethers.constants.MaxUint256);
    await masterChefV2.init(dummyTokenV2.address);

    const lpTokenV2 = await ERC20Mock.deploy("LP Token V2", "LPV2");
    const dummyTokenV3 = await ERC20Mock.deploy("Dummy Token V3", "DTV3");

    await masterChefV2.add(0, lpTokenV2.address, true, true); // regular farm with pid 0 and 0 allocPoint
    await masterChefV2.add(1, dummyTokenV3.address, true, true); // regular farm with pid 1 and 1 allocPoint

    // Deploy master chef v3
    const MasterChefV3 = await ethers.getContractFactory("MasterChefV3");
    masterChefV3 = await MasterChefV3.deploy(cakeToken.address, nonfungiblePositionManager.address, WETHContract.address);

    await dummyTokenV3.mint(admin.address, ethers.utils.parseUnits("1000"));
    await dummyTokenV3.approve(masterChefV2.address, ethers.constants.MaxUint256);
    await masterChefV2.deposit(1, await dummyTokenV3.balanceOf(admin.address));
    const firstFarmingBlock = await time.latestBlock();

    const SquadV3LmPoolDeployer = await ethers.getContractFactoryFromArtifact(SquadV3LmPoolDeployerArtifact);
    const squadV3LmPoolDeployer = await SquadV3LmPoolDeployer.deploy(
      masterChefV3.address
      // squadV3FactoryOwner.address
    );
    // await squadV3FactoryOwner.setLmPoolDeployer(squadV3LmPoolDeployer.address);
    await squadV3Factory.setLmPoolDeployer(squadV3LmPoolDeployer.address);
    await masterChefV3.setLMPoolDeployer(squadV3LmPoolDeployer.address);

    // Deploy mock ERC20 tokens
    const tokenA = await ERC20Mock.deploy("Token A", "A");
    const tokenB = await ERC20Mock.deploy("Token B", "B");
    const tokenC = await ERC20Mock.deploy("Token C", "C");
    // const WETHContract = await ERC20Mock.deploy("Token D", "D");

    await tokenA.mint(admin.address, ethers.utils.parseUnits("1000"));
    await tokenA.mint(user1.address, ethers.utils.parseUnits("1000"));
    await tokenA.mint(user2.address, ethers.utils.parseUnits("1000"));
    await tokenB.mint(admin.address, ethers.utils.parseUnits("1000"));
    await tokenB.mint(user1.address, ethers.utils.parseUnits("1000"));
    await tokenB.mint(user2.address, ethers.utils.parseUnits("1000"));
    await tokenC.mint(masterChefV3.address, ethers.utils.parseUnits("1000"));
    await tokenC.mint(admin.address, ethers.utils.parseUnits("1000"));
    await tokenC.mint(user1.address, ethers.utils.parseUnits("1000"));
    await tokenC.mint(user2.address, ethers.utils.parseUnits("1000"));
    await WETHContract.connect(admin).deposit({value: ethers.utils.parseUnits("1000")});
    await WETHContract.connect(user1).deposit({value: ethers.utils.parseUnits("1000")});
    await WETHContract.connect(user2).deposit({value: ethers.utils.parseUnits("1000")});

    await tokenA.connect(admin).approve(squadV3SwapRouter.address, ethers.constants.MaxUint256);
    await tokenB.connect(admin).approve(squadV3SwapRouter.address, ethers.constants.MaxUint256);
    await tokenC.connect(admin).approve(squadV3SwapRouter.address, ethers.constants.MaxUint256);
    await WETHContract.connect(admin).approve(squadV3SwapRouter.address, ethers.constants.MaxUint256);
    await WETHContract.connect(admin).approve(squadV3SwapRouter.address, ethers.constants.MaxUint256);
    await cakeToken.connect(admin).approve(squadV3SwapRouter.address, ethers.constants.MaxUint256);
    await cakeToken.connect(admin).approve(masterChefV3.address, ethers.constants.MaxUint256);
    await cakeToken.connect(admin).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);

    await cakeToken.connect(admin).transfer(masterChefV3.address, ethers.utils.parseUnits('30'))

    await tokenA.connect(user1).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenB.connect(user1).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenC.connect(user1).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await WETHContract.connect(user1).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenA.connect(user2).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenB.connect(user2).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await tokenC.connect(user2).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);
    await WETHContract.connect(user2).approve(nonfungiblePositionManager.address, ethers.constants.MaxUint256);

    await tokenA.connect(user1).approve(masterChefV3.address, ethers.constants.MaxUint256);
    await tokenB.connect(user1).approve(masterChefV3.address, ethers.constants.MaxUint256);
    await tokenC.connect(user1).approve(masterChefV3.address, ethers.constants.MaxUint256);
    await WETHContract.connect(user1).approve(masterChefV3.address, ethers.constants.MaxUint256);
    await tokenA.connect(user2).approve(masterChefV3.address, ethers.constants.MaxUint256);
    await tokenB.connect(user2).approve(masterChefV3.address, ethers.constants.MaxUint256);
    await tokenC.connect(user2).approve(masterChefV3.address, ethers.constants.MaxUint256);
    await WETHContract.connect(user2).approve(masterChefV3.address, ethers.constants.MaxUint256);

    // Create pools
    const pools = [
      {
        token0: tokenA.address < tokenB.address ? tokenA.address : tokenB.address,
        token1: tokenB.address > tokenA.address ? tokenB.address : tokenA.address,
        fee: 500,
        initSqrtPriceX96: ethers.BigNumber.from("2").pow(96),
      },
      {
        token0: tokenC.address < WETHContract.address ? tokenC.address : WETHContract.address,
        token1: WETHContract.address > tokenC.address ? WETHContract.address : tokenC.address,
        fee: 500,
        initSqrtPriceX96: ethers.BigNumber.from("2").pow(96),
      },
      {
        token0: cakeToken.address < WETHContract.address ? cakeToken.address : WETHContract.address,
        token1: WETHContract.address > cakeToken.address ? WETHContract.address : cakeToken.address,
        fee: 500,
        initSqrtPriceX96: ethers.BigNumber.from("2").pow(96),
      },
    ];
    const poolAddresses = await Promise.all(
      pools.map(async (p) => {
        const receipt = await (
          await nonfungiblePositionManager.createAndInitializePoolIfNecessary(
            p.token0,
            p.token1,
            p.fee,
            p.initSqrtPriceX96
          )
        ).wait();
        const [, address] = ethers.utils.defaultAbiCoder.decode(["int24", "address"], receipt.logs[0].data);
        return address;
      })
    );

    // Farm 1 month in advance and then upkeep
    await mineUpTo(firstFarmingBlock + 30 * 24 * 60 * 60);
    await masterChefV2.connect(admin).deposit(1, 0);
    // const cakeFarmed = await cakeToken.balanceOf(admin.address);
    // console.log(`${ethers.utils.formatUnits(cakeFarmed)} CAKE farmed`);
    await cakeToken.approve(masterChefV3.address, ethers.constants.MaxUint256);
    await masterChefV3.setReceiver(admin.address);
    await masterChefV3.upkeep(ethers.utils.parseUnits(`${4 * 24 * 60 * 60}`), 24 * 60 * 60, true);
    // console.log(`cakePerSecond: ${ethers.utils.formatUnits((await masterChefV3.latestPeriodCakePerSecond()).div(await masterChefV3.PRECISION()))}\n`);

    const LiquidityAmounts = await ethers.getContractFactoryFromArtifact(TestLiquidityAmountsArtifact);
    const liquidityAmounts = await LiquidityAmounts.deploy();

    this.nonfungiblePositionManager = nonfungiblePositionManager;
    this.masterChefV3 = masterChefV3;
    this.pools = pools;
    this.poolAddresses = poolAddresses;
    this.cakeToken = cakeToken;
    this.liquidityAmounts = liquidityAmounts;
    this.swapRouter = squadV3SwapRouter;

    await network.provider.send("evm_setAutomine", [false]);
  });

  afterEach(async function () {
    await network.provider.send("evm_setAutomine", [true]);
  });

  describe("Real world user flow", function () {
    context("when there are 2 users and 2 pools with no trading", function () {

      it("should executed successfully", async function () {
        // 1
        await time.increase(1);

        // 2
        await this.masterChefV3.add(1, this.poolAddresses[0], true);

        await time.increase(1);

        // 3
        await this.masterChefV3.updatePools([1]);

        await this.masterChefV3.add(3, this.poolAddresses[1], true);

        await time.increase(1);

        // 4
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("1"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.masterChefV3.address, 1);

        await time.increase(1);

        // 5
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.masterChefV3.address, 2);

        await time.increase(1);

        let cakeUser1;
        let cakeUser2;

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));

        console.log("@5 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log("");

        // 6
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.masterChefV3.address, 3);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));

        console.log("@6 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log("");

        // 7
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(3));

        console.log("@7 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 8
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("1"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.masterChefV3.address, 4);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@8 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 9
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.set(1, 3, true);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@9 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 10
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@10 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 11
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@11 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 12
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@12 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 13
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@13 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 14
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user2).increaseLiquidity({
          tokenId: 4,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@14 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 15
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user1).withdraw(1, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@15 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 16
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.set(2, 0, true);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@16 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 17
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user2).decreaseLiquidity({
          tokenId: 4,
          liquidity: await this.liquidityAmounts.getLiquidityForAmounts(
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(0))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(-100))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(100))),
            ethers.utils.parseUnits("1"),
            ethers.utils.parseUnits("1")
          ),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@17 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 18
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.masterChefV3.address, 5);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@18 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 19
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.set(2, 2, true);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@19 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 20
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user1).withdraw(5, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@20 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 21
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user2).withdraw(3, user2.address);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@21 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 22
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user1).withdraw(2, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@22 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 23
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user2).withdraw(4, user2.address);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4));

        console.log("@23 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 24
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("1"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.masterChefV3.address, 6);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6));

        console.log("@24 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 25
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.masterChefV3.address, 7);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6));

        console.log("@25 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 26
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.masterChefV3.address, 8);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6));

        console.log("@26 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 27
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6));

        console.log("@27 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 28
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("10"),
          amount1Desired: ethers.utils.parseUnits("10"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.masterChefV3.address, 9);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@28 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 29
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.upkeep(0, 2 * 24 * 60 * 60, true);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@29 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 30
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@30 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 31
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@31 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 32
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@32 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 33
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user1).increaseLiquidity({
          tokenId: 8,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@33 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 34
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@34 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 35
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user1).decreaseLiquidity({
          tokenId: 7,
          liquidity: await this.liquidityAmounts.getLiquidityForAmounts(
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(0))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(-100))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(100))),
            ethers.utils.parseUnits("1"),
            ethers.utils.parseUnits("1")
          ),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@35 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 36
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@36 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 37
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user2).increaseLiquidity({
          tokenId: 6,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@37 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 38
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.upkeep(ethers.utils.parseUnits(`${0}`), 24 * 60 * 60, true);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@38 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 39
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user1).withdraw(8, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@39 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 40
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@40 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 41
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user2).decreaseLiquidity({
          tokenId: 9,
          liquidity: await this.liquidityAmounts.getLiquidityForAmounts(
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(0))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(-100))),
            ethers.BigNumber.from(String(TickMath.getSqrtRatioAtTick(100))),
            ethers.utils.parseUnits("0"),
            ethers.utils.parseUnits("0")
          ),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@41 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 42
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@42 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 43
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@43 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 44
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user1).mint({
          token0: this.pools[1].token0,
          token1: this.pools[1].token1,
          fee: this.pools[1].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("3"),
          amount1Desired: ethers.utils.parseUnits("3"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user1.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user1)
          ["safeTransferFrom(address,address,uint256)"](user1.address, this.masterChefV3.address, 10);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@44 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 45
        await this.masterChefV3.updatePools([1, 2]);

        await this.masterChefV3.connect(user1).withdraw(7, user1.address);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9));

        console.log("@45 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 46
        await this.masterChefV3.updatePools([1, 2]);

        await this.nonfungiblePositionManager.connect(user2).mint({
          token0: this.pools[0].token0,
          token1: this.pools[0].token1,
          fee: this.pools[0].fee,
          tickLower: -100,
          tickUpper: 100,
          amount0Desired: ethers.utils.parseUnits("2"),
          amount1Desired: ethers.utils.parseUnits("2"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          recipient: user2.address,
          deadline: (await time.latest()) + 1,
        });
        await this.nonfungiblePositionManager
          .connect(user2)
          ["safeTransferFrom(address,address,uint256)"](user2.address, this.masterChefV3.address, 11);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9))
          .add(await this.masterChefV3.pendingCake(11));

        console.log("@46 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 47
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9))
          .add(await this.masterChefV3.pendingCake(11));

        console.log("@47 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 48
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9))
          .add(await this.masterChefV3.pendingCake(11));

        console.log("@48 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 49
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9))
          .add(await this.masterChefV3.pendingCake(11));

        console.log("@49 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 50
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9))
          .add(await this.masterChefV3.pendingCake(11));

        console.log("@50 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 51
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9))
          .add(await this.masterChefV3.pendingCake(11));

        console.log("@51 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 52
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9))
          .add(await this.masterChefV3.pendingCake(11));

        console.log("@52 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        // 53
        await this.masterChefV3.updatePools([1, 2]);

        await time.increase(1);

        cakeUser1 = (await this.cakeToken.balanceOf(user1.address))
          .add(await this.masterChefV3.pendingCake(1))
          .add(await this.masterChefV3.pendingCake(2))
          .add(await this.masterChefV3.pendingCake(5))
          .add(await this.masterChefV3.pendingCake(7))
          .add(await this.masterChefV3.pendingCake(8))
          .add(await this.masterChefV3.pendingCake(10));
        cakeUser2 = (await this.cakeToken.balanceOf(user2.address))
          .add(await this.masterChefV3.pendingCake(3))
          .add(await this.masterChefV3.pendingCake(4))
          .add(await this.masterChefV3.pendingCake(6))
          .add(await this.masterChefV3.pendingCake(9))
          .add(await this.masterChefV3.pendingCake(11));

        console.log("@53 ----------------------------------------");
        console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
        console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
        console.log("");

        assert(cakeUser1.sub(ethers.utils.parseUnits("57.68974359")).abs().lte(ethers.utils.parseUnits("0.1")));
        assert(cakeUser2.sub(ethers.utils.parseUnits("105.3102564")).abs().lte(ethers.utils.parseUnits("0.1")));
        await network.provider.send("evm_setAutomine", [true]);

        await time.increase(10000000);
        
        expect(await this.masterChefV3.balanceOf(user1.address)).to.eq("1")
        expect(await this.masterChefV3.tokenOfOwnerByIndex(user1.address, 0)).to.eq("10")
        
        console.log(await this.masterChefV3.getLatestPeriodInfoByPid(1));
        
        await expect(this.masterChefV3.updateLiquidity(1)).to.revertedWith("InvalidNFT")
        await expect(this.masterChefV3.updateBoostMultiplier(1,3)).to.revertedWith("Not farm boost contract")
        await this.masterChefV3.updateLiquidity(9)
        await time.increase(10000000);
        await expect(this.masterChefV3.harvest(9, user1.address)).to.revertedWith('NotOwner')
        console.log((await this.cakeToken.balanceOf(user1.address)).toString())
        await this.masterChefV3.connect(user2).harvest(9, user1.address)
        console.log((await this.cakeToken.balanceOf(user1.address)).toString())
        await time.increase(10000000);
        await this.masterChefV3.connect(user2).collect([9, user1.address, "10000000000", "10000000000"])
        await time.increase(10000000);
        await this.masterChefV3.connect(user2).collectTo([9, this.masterChefV3.address, "10000000000", "10000000000"], "0x0000000000000000000000000000000000000000")
        await WETHContract.connect(user1).transfer(this.masterChefV3.address, ethers.utils.parseEther("10"))
        await this.masterChefV3.connect(user1).collectTo([10, "0x0000000000000000000000000000000000000000", "10000000000000", "10000000000"], "0x0000000000000000000000000000000000000000")
        await this.masterChefV3.connect(user2).sweepToken(this.cakeToken.address, "0", user1.address)
        await this.masterChefV3.connect(user2).sweepToken(this.pools[0].token0, "0", user1.address)
        await this.masterChefV3.connect(user2).increaseLiquidity({
          tokenId: 9,
          amount0Desired: ethers.utils.parseUnits("100"),
          amount1Desired: ethers.utils.parseUnits("10"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });
        await this.masterChefV3.connect(user2).increaseLiquidity({
          tokenId: 9,
          amount0Desired: ethers.utils.parseUnits("10"),
          amount1Desired: ethers.utils.parseUnits("100"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        });
        await this.masterChefV3.connect(user2).increaseLiquidity({
          tokenId: 10,
          amount0Desired: ethers.utils.parseUnits("100"),
          amount1Desired: ethers.utils.parseUnits("10"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        },{value: ethers.utils.parseEther('10')});
        await this.masterChefV3.connect(user2).increaseLiquidity({
          tokenId: 10,
          amount0Desired: ethers.utils.parseUnits("1"),
          amount1Desired: ethers.utils.parseUnits("10"),
          amount0Min: ethers.constants.Zero,
          amount1Min: ethers.constants.Zero,
          deadline: (await time.latest()) + 1,
        },{value: ethers.utils.parseEther('10')});
        await WETHContract.connect(user1).deposit({value: "1000000000000000000"})
        await WETHContract.connect(user1).transfer(this.masterChefV3.address, "1000000000000000000")
        await this.masterChefV3.connect(user1).unwrapWETH9("1000000000000000000", user1.address)

        await expect(this.masterChefV3.connect(user2).burn(9)).to.revertedWith("NotEmpty")
        await this.masterChefV3.setOperator(user2.address)
        await this.masterChefV3.setPeriodDuration(24 * 3600 * 5)
        await this.masterChefV3.updateFarmBoostContract(user1.address)
        await this.masterChefV3.setEmergency(false)
      });
    });

    // context("when there are 2 users and 1 pool with different range positions", function () {
    //   it("should executed successfully", async function () {
    //     // 1
    //     await time.increase(1);

    //     // 2
    //     await this.masterChefV3.add(1, this.poolAddresses[0], true);

    //     await time.increase(1);

    //     // 3
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     // 4
    //     await this.masterChefV3.updatePools([1]);

    //     await this.nonfungiblePositionManager.connect(user1).mint({
    //       token0: this.pools[0].token0,
    //       token1: this.pools[0].token1,
    //       fee: this.pools[0].fee,
    //       tickLower: -10000,
    //       tickUpper: 10000,
    //       amount0Desired: ethers.BigNumber.from("999999999999999999"),
    //       amount1Desired: ethers.BigNumber.from("999999999999999999"),
    //       amount0Min: ethers.constants.Zero,
    //       amount1Min: ethers.constants.Zero,
    //       recipient: user1.address,
    //       deadline: (await time.latest()) + 1,
    //     });
    //     await this.nonfungiblePositionManager
    //       .connect(user1)
    //       ["safeTransferFrom(address,address,uint256)"](user1.address, this.masterChefV3.address, 1);

    //     await time.increase(1);

    //     // 5
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     let cakeUser1;
    //     let cakeUser2;

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));

    //     console.log("@5 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log("");

    //     // 6
    //     await this.masterChefV3.updatePools([1]);

    //     await this.nonfungiblePositionManager.connect(user2).mint({
    //       token0: this.pools[0].token0,
    //       token1: this.pools[0].token1,
    //       fee: this.pools[0].fee,
    //       tickLower: -1000,
    //       tickUpper: 1000,
    //       amount0Desired: ethers.BigNumber.from("999999999999999999"),
    //       amount1Desired: ethers.BigNumber.from("999999999999999999"),
    //       amount0Min: ethers.constants.Zero,
    //       amount1Min: ethers.constants.Zero,
    //       recipient: user2.address,
    //       deadline: (await time.latest()) + 1,
    //     });
    //     await this.nonfungiblePositionManager
    //       .connect(user2)
    //       ["safeTransferFrom(address,address,uint256)"](user2.address, this.masterChefV3.address, 2);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));

    //     console.log("@6 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log("");

    //     // 7
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@7 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 8
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@8 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 9
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@9 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 10
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@10 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 11
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@11 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 12
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@12 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 13
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@13 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 14
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@14 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 15
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@15 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 16
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@16 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 17
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@17 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 18
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@18 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 19
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@19 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 20
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@20 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 21
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@21 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 22
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@22 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 23
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@23 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 24
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@24 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 25
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@25 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 26
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@26 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 27
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@27 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 28
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@28 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 29
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@29 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 30
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@30 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 31
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@31 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 32
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@32 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 33
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@33 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 34
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@34 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 35
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@35 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 36
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@36 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 37
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@37 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 38
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@38 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 39
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@39 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 40
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@40 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 41
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@41 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 42
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@42 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 43
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@43 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 44
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@44 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 45
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@45 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 46
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@46 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 47
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@47 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 48
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@48 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 49
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@49 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 50
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@50 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 51
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@51 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 52
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@52 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 53
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@53 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     assert(cakeUser1.sub(ethers.utils.parseUnits("28.73260345")).abs().lte(ethers.utils.parseUnits("0.0000001")));
    //     assert(cakeUser2.sub(ethers.utils.parseUnits("167.2673966")).abs().lte(ethers.utils.parseUnits("0.0000001")));
    //   });
    // });

    // context("when there are 2 users and 1 pool with different range positions", function () {
    //   it("should executed successfully", async function () {
    //     // 1
    //     await time.increase(1);

    //     // 2
    //     await this.masterChefV3.add(1, this.poolAddresses[0], true);

    //     await time.increase(1);

    //     // 3
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     // 4
    //     await this.masterChefV3.updatePools([1]);

    //     await this.nonfungiblePositionManager.connect(user1).mint({
    //       token0: this.pools[0].token0,
    //       token1: this.pools[0].token1,
    //       fee: this.pools[0].fee,
    //       tickLower: -10000,
    //       tickUpper: 10000,
    //       amount0Desired: ethers.BigNumber.from("1000000000000000000"),
    //       amount1Desired: ethers.BigNumber.from("1000000000000000000"),
    //       amount0Min: ethers.constants.Zero,
    //       amount1Min: ethers.constants.Zero,
    //       recipient: user1.address,
    //       deadline: (await time.latest()) + 1,
    //     });
    //     await this.nonfungiblePositionManager
    //       .connect(user1)
    //       ["safeTransferFrom(address,address,uint256)"](user1.address, this.masterChefV3.address, 1);

    //     await time.increase(1);

    //     // 5
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     let cakeUser1;
    //     let cakeUser2;

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));

    //     console.log("@5 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log("");

    //     // 6
    //     await this.masterChefV3.updatePools([1]);

    //     await this.nonfungiblePositionManager.connect(user2).mint({
    //       token0: this.pools[0].token0,
    //       token1: this.pools[0].token1,
    //       fee: this.pools[0].fee,
    //       tickLower: -1000,
    //       tickUpper: 1000,
    //       amount0Desired: ethers.BigNumber.from("999999999999999999"),
    //       amount1Desired: ethers.BigNumber.from("999999999999999999"),
    //       amount0Min: ethers.constants.Zero,
    //       amount1Min: ethers.constants.Zero,
    //       recipient: user2.address,
    //       deadline: (await time.latest()) + 1,
    //     });
    //     await this.nonfungiblePositionManager
    //       .connect(user2)
    //       ["safeTransferFrom(address,address,uint256)"](user2.address, this.masterChefV3.address, 2);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));

    //     console.log("@6 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log("");

    //     // 7
    //     await this.masterChefV3.updatePools([1]);

    //     await this.swapRouter.exactInputSingle({
    //       tokenIn: this.pools[0].token0,
    //       tokenOut: this.pools[0].token1,
    //       fee: this.pools[0].fee,
    //       amountIn: ethers.utils.parseUnits("1"),
    //       amountOutMinimum: ethers.constants.Zero,
    //       sqrtPriceLimitX96: ethers.constants.Zero,
    //       recipient: admin.address,
    //       deadline: (await time.latest()) + 1,
    //     });

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@7 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 8
    //     await this.masterChefV3.updatePools([1]);

    //     await this.masterChefV3.connect(user1).increaseLiquidity({
    //       tokenId: 1,
    //       amount0Desired: ethers.utils.parseUnits("1"),
    //       amount1Desired: ethers.utils.parseUnits("0.805563891162833934"),
    //       amount0Min: ethers.constants.Zero,
    //       amount1Min: ethers.constants.Zero,
    //       deadline: (await time.latest()) + 1,
    //     });

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@8 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 9
    //     await this.masterChefV3.updatePools([1]);

    //     await this.swapRouter.exactInputSingle({
    //       tokenIn: this.pools[0].token0,
    //       tokenOut: this.pools[0].token1,
    //       fee: this.pools[0].fee,
    //       amountIn: ethers.utils.parseUnits("1"),
    //       amountOutMinimum: ethers.constants.Zero,
    //       sqrtPriceLimitX96: ethers.constants.Zero,
    //       recipient: admin.address,
    //       deadline: (await time.latest()) + 1,
    //     });

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@9 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 10
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@10 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 11
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@11 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 12
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@12 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 13
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@13 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 14
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@14 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 15
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@15 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 16
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@16 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 17
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@17 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 18
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@18 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 19
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@19 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 20
    //     await this.masterChefV3.updatePools([1]);

    //     await this.swapRouter.exactInputSingle({
    //       tokenIn: this.pools[0].token1,
    //       tokenOut: this.pools[0].token0,
    //       fee: this.pools[0].fee,
    //       amountIn: ethers.utils.parseUnits("1.5"),
    //       amountOutMinimum: ethers.constants.Zero,
    //       sqrtPriceLimitX96: ethers.constants.Zero,
    //       recipient: admin.address,
    //       deadline: (await time.latest()) + 1,
    //     });

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@20 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 21
    //     await this.masterChefV3.updatePools([1]);

    //     await this.masterChefV3.connect(user2).increaseLiquidity({
    //       tokenId: 2,
    //       amount0Desired: ethers.utils.parseUnits("0.999999999999999999"),
    //       amount1Desired: ethers.utils.parseUnits("0.545748338215849399"),
    //       amount0Min: ethers.constants.Zero,
    //       amount1Min: ethers.constants.Zero,
    //       deadline: (await time.latest()) + 1,
    //     });

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@21 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 22
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@22 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 23
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@23 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 24
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@24 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 25
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@25 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 26
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@26 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 27
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@27 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 28
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@28 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 29
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@29 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 30
    //     await this.masterChefV3.updatePools([1]);

    //     await this.masterChefV3.connect(user1).increaseLiquidity({
    //       tokenId: 1,
    //       amount0Desired: ethers.utils.parseUnits("1"),
    //       amount1Desired: ethers.utils.parseUnits("0.929584593669192594"),
    //       amount0Min: ethers.constants.Zero,
    //       amount1Min: ethers.constants.Zero,
    //       deadline: (await time.latest()) + 1,
    //     });

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@30 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 31
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@31 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 32
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@32 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 33
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@33 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 34
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@34 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 35
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@35 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 36
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@36 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 37
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@37 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 38
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@38 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 39
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@39 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 40
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@40 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 41
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@41 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 42
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@42 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 43
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@43 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 44
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@44 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 45
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@45 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 46
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@46 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 47
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@47 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 48
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@48 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 49
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@49 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 50
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@50 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 51
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@51 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 52
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@52 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     // 53
    //     await this.masterChefV3.updatePools([1]);

    //     await time.increase(1);

    //     cakeUser1 = (await this.cakeToken.balanceOf(user1.address)).add(await this.masterChefV3.pendingCake(1));
    //     cakeUser2 = (await this.cakeToken.balanceOf(user2.address)).add(await this.masterChefV3.pendingCake(2));

    //     console.log("@53 ----------------------------------------");
    //     console.log(`user1: ${ethers.utils.formatUnits(cakeUser1)}`);
    //     console.log(`user2: ${ethers.utils.formatUnits(cakeUser2)}`);
    //     console.log("");

    //     assert(cakeUser1.sub(ethers.utils.parseUnits("73.99948783")).abs().lte(ethers.utils.parseUnits("0.0000001")));
    //     assert(cakeUser2.sub(ethers.utils.parseUnits("122.0005122")).abs().lte(ethers.utils.parseUnits("0.0000001")));
    //   });
    // });
  });
});
