// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import '@squadswap/v3-core/contracts/interfaces/ISquadV3Factory.sol';
import '@squadswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';

import './SquadV3LmPool.sol';

/// @dev This contract is for Master Chef to create a corresponding LmPool when
/// adding a new farming pool. As for why not just create LmPool inside the
/// Master Chef contract is merely due to the imcompatibility of the solidity
/// versions.
contract SquadV3LmPoolDeployer {
    address public immutable masterChef;

    modifier onlyMasterChef() {
        require(msg.sender == masterChef, "Not MC");
        _;
    }

    constructor(address _masterChef) {
        masterChef = _masterChef;
    }

    /// @dev Deploys a LmPool
    /// @param pool The contract address of the SquadSwap V3 pool
    function deploy(ISquadV3Pool pool) external onlyMasterChef returns (ISquadV3LmPool lmPool) {
        lmPool = new SquadV3LmPool(address(pool), masterChef, uint32(block.timestamp));
        ISquadV3Factory(INonfungiblePositionManager(IMasterChefV3(masterChef).nonfungiblePositionManager()).factory()).setLmPool(address(pool), address(lmPool));
    }
}
