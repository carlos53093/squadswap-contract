module.exports = {
  skipFiles: [
      "/keeper/MasterChefV3KeeperV1.sol",
      "/keeper/MasterChefV3KeeperV2.sol",
      "/receiver/MasterChefV3Receiver.sol",
      "/receiver/MasterChefV3ReceiverV2.sol",
      "/utils/Multicall.sol",
  ],
  configureYulOptimizer: true,
  solcOptimizerDetails: {
    yul: true,
  },
};
