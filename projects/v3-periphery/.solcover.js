module.exports = {
  skipFiles: [
    '/NonfungibleTokenPositionDescriptorOffChain.sol',
    '/NonfungibleTokenPositionDescriptorOffChainV2.sol',
    '/test/TestPancakeswapCallee.sol',
    '/test/TestPancakeswapCallee.sol',
  ],
  configureYulOptimizer: true,
  solcOptimizerDetails: {
    yul: true,
  },
};
