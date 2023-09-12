// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.10;

import "../MasterChefV3.sol";

contract MCV3Test is MasterChefV3 {

    constructor(IERC20 _SQUAD, INonfungiblePositionManager _nonfungiblePositionManager, address _WETH) MasterChefV3(_SQUAD, _nonfungiblePositionManager, _WETH) {}

    function safeTransferETHTest(address to, uint256 value) external {
        safeTransferETH(to, value);
    }

    function safeTransferTest(address _to, uint256 _amount) external {
        _safeTransfer(_to, _amount);
    }

    function transferTokenTest(address _token, address _to) external {
        transferToken(_token, _to);
    }
}
