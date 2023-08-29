// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.10;

import "../libraries/SafeCast.sol";

contract SafeCaseTest {

    function toUint128Test(uint256 value) public pure returns (uint128) {
        return SafeCast.toUint128(value);
    }
}
