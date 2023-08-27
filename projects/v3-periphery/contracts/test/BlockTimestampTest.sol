// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;

import "../base/BlockTimestamp.sol";

/// @title Function for getting block timestamp
/// @dev Base contract that is overridden for tests
contract BlockTimestampTest is BlockTimestamp {
    /// @dev Method that exists purely to be overridden for tests
    /// @return The current block timestamp
    function blockTimestamp() public view virtual returns (uint256) {
        return _blockTimestamp();
    }
}
