// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import '../lens/SquadInterfaceMulticall.sol';

contract SquadInterfaceMulticallTest is SquadInterfaceMulticall {

    event Multicall(uint256 blockNumber, bool success, uint256 gasUsed, bytes returnData);

    function getCurrentBlockTimestampTest() public view returns (uint256 timestamp) {
        timestamp = getCurrentBlockTimestamp();
    }

    function getEthBalanceTest(address addr) public view returns (uint256 balance) {
        balance = getEthBalance(addr);
    }

    function multicallTest(address target, uint gasLimit, string memory str) public returns (uint256 blockNumber, Result[] memory returnData) {
        bytes memory callData = bytes(str);
        Call memory data = Call({target: target, gasLimit: gasLimit, callData: callData});
        Call[] memory datas = new Call[](1);
        datas[0] = data;
        (blockNumber, returnData) = multicall(datas);
        emit Multicall(blockNumber, returnData[0].success, returnData[0].gasUsed, returnData[0].returnData);
    }
}
