// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title Periods
/// @notice Fixed-length draw periods counted from a start timestamp. Period 1 begins at `first`.
/// @dev A timestamp before `first` belongs to period 0, which never has a draw.
library Periods {
    function periodOf(uint256 timestamp, uint256 first, uint256 length) internal pure returns (uint32) {
        if (timestamp < first) return 0;
        return uint32((timestamp - first) / length + 1);
    }

    function startOf(uint32 period, uint256 first, uint256 length) internal pure returns (uint256) {
        return first + (uint256(period) - 1) * length;
    }

    function endOf(uint32 period, uint256 first, uint256 length) internal pure returns (uint256) {
        return first + uint256(period) * length;
    }
}
