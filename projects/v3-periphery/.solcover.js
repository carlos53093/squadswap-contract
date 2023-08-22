module.exports = {
  skipFiles: [
    './contracts/NonfungibleTokenPositionDescriptorOffChain.sol',
    './contracts/NonfungibleTokenPositionDescriptorOffChainV2.sol',
  ],
  configureYulOptimizer: true,
  solcOptimizerDetails: {
    yul: true,
  },
};
