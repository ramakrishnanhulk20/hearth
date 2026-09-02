// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Periods} from "../libraries/Periods.sol";

/// @dev Test-only surface for the internal library functions. Never deployed.
contract LibraryHarness {
    function periodOf(uint256 timestamp, uint256 first, uint256 length) external pure returns (uint32) {
        return Periods.periodOf(timestamp, first, length);
    }

    function startOf(uint32 period, uint256 first, uint256 length) external pure returns (uint256) {
        return Periods.startOf(period, first, length);
    }

    function endOf(uint32 period, uint256 first, uint256 length) external pure returns (uint256) {
        return Periods.endOf(period, first, length);
    }
}
