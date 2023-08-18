// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./ISquadV3Pool.sol";
import "./ILMPool.sol";

interface ILMPoolDeployer {
    function deploy(ISquadV3Pool pool) external returns (ILMPool lmPool);
}
