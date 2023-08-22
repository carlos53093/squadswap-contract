module.exports = {
  skipFiles: [
    "libraries/Babylonian.sol",
    "libraries/Math.sol",
    "libraries/SquadLibrary.sol",
    "libraries/SafeMath.sol",
    "libraries/UQ112x112.sol",
    "libraries/WBNB.sol",
    "SquadERC20.sol",
    "SquadFactory.sol",
    "SquadPair.sol",
    "SquadRouter.sol",
    "SquadRouter01.sol",
    "V2SwapRouter.sol",
    "StableSwapRouter.sol",
    "utils/MockERC20.sol",
    "contracts/base/ApproveAndCall.sol"
  ],
  configureYulOptimizer: true,
  solcOptimizerDetails: {
    yul: true,
  },
};
