// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.10;

import "../Enumerable.sol";

contract EnumerableTest is Enumerable {

    function tokenOfOwnerByIndexRevert() public view returns(uint res) {
        res = tokenOfOwnerByIndex(address(this), 10);
    }

    function balanceOfRevert() public view {
        balanceOf(address(0));
    }
}
