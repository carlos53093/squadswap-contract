// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

import './pool/ISquadV3PoolImmutables.sol';
import './pool/ISquadV3PoolState.sol';
import './pool/ISquadV3PoolDerivedState.sol';
import './pool/ISquadV3PoolActions.sol';
import './pool/ISquadV3PoolOwnerActions.sol';
import './pool/ISquadV3PoolEvents.sol';

/// @title The interface for a SquadSwap V3 Pool
/// @notice A SquadSwap pool facilitates swapping and automated market making between any two assets that strictly conform
/// to the ERC20 specification
/// @dev The pool interface is broken up into many smaller pieces
interface ISquadV3Pool is
    ISquadV3PoolImmutables,
    ISquadV3PoolState,
    ISquadV3PoolDerivedState,
    ISquadV3PoolActions,
    ISquadV3PoolOwnerActions,
    ISquadV3PoolEvents
{

}
