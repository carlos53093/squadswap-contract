// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.7.6;

import './interfaces/ISquadV3Factory.sol';
import './interfaces/ISquadV3Pool.sol';
import './interfaces/IERC20Minimal.sol';

contract FeeManager {
    address public traderWallet;
    address public squadWallet;
    address public teamWallet;
    address constant dead = 0x0000000000000000000000000000000000000000;
    address public owner;
    address public squadToken;
    address public burn;
    ISquadV3Factory public factory;

    uint256 public traderRate;
    uint256 public squadRate;
    uint256 public teamRate;
    // uint256 public burnRate;

    uint256 constant totalRate = 1000; 

    event UpdateOnwer(address indexed _old, address indexed _new);

    constructor() {
        owner = msg.sender;
        traderRate = 250;
        squadRate = 250;
        teamRate = 250;
        // burnRate = 250;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setFactory(address _factory) onlyOwner external {
        address old = address(factory);
        factory = ISquadV3Factory(_factory);
        emit UpdateOnwer(old, _factory);
    }

    function setWallets(address _trader, address _sqad, address _team, address _burn) onlyOwner external {
        traderWallet = _trader;
        squadWallet = _sqad;
        teamWallet = _team;
        burn = _burn;
    }

    function setSquadToken(address _token) onlyOwner external {
        squadToken = _token;
    }

    function setRates(uint256 _traderRate, uint256 _teamRate, uint256 _squadRate, uint256 _burnRate) onlyOwner external {
        require(_traderRate + _teamRate + _squadRate + _burnRate == totalRate, "invalid Rate");
        traderRate = _traderRate;
        teamRate = _teamRate;
        squadRate = _squadRate;
        // burnRate = _burnRate;
    }

    function collectFee(address pool, uint128 amount0Requested, uint128 amount1Requested) onlyOwner external {
        (uint128 amount0, uint128 amount1) = factory.collectProtocol(pool, address(this), amount0Requested, amount1Requested);
        address token0 = ISquadV3Pool(pool).token0();
        address token1 = ISquadV3Pool(pool).token1();

        if (amount0 > 0) {
            uint256 traderAmount0 = amount0 * traderRate / totalRate;
            uint256 squadAmount0 = amount0 * squadRate / totalRate;
            uint256 teamAmount0 = amount0 * teamRate / totalRate;
            uint256 burnAmount0 = amount0 - traderAmount0 - squadAmount0 - teamAmount0;
            IERC20Minimal(token0).transfer(traderWallet, traderAmount0);
            IERC20Minimal(token0).transfer(squadWallet, squadAmount0);
            IERC20Minimal(token0).transfer(teamWallet, teamAmount0);
            IERC20Minimal(token0).transfer(burn, burnAmount0);
        }

        if (amount1 > 0) {
            uint256 traderAmount1 = amount1 * traderRate / totalRate;
            uint256 squadAmount1 = amount1 * squadRate / totalRate;
            uint256 teamAmount1 = amount1 * teamRate / totalRate;
            uint256 burnAmount1 = amount1 - traderAmount1 - squadAmount1 - teamAmount1;
            IERC20Minimal(token1).transfer(traderWallet, traderAmount1);
            IERC20Minimal(token1).transfer(squadWallet, squadAmount1);
            IERC20Minimal(token1).transfer(teamWallet, teamAmount1);
            IERC20Minimal(token1).transfer(burn, burnAmount1);
        }
    }
}