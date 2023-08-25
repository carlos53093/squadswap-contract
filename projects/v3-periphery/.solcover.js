module.exports = {
  skipFiles: [
    '/NonfungibleTokenPositionDescriptorOffChain.sol',
    '/NonfungibleTokenPositionDescriptorOffChainV2.sol',
  ],
  configureYulOptimizer: true,
  solcOptimizerDetails: {
    yul: true,
  },
};
