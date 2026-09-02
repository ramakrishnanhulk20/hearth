// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title UniformRandom
/// @notice Maps 256 bits of entropy onto [0, upperBound) without modulo bias.
/// @dev The top of the 256-bit range does not divide evenly by `upperBound`; values that land in the
///      short final bucket are rehashed until they do not. Fewer than one rehash is expected on average
///      for any bound, and the loop is bounded in practice by the negligible chance of repeated hits.
library UniformRandom {
    error ZeroBound();

    function draw(uint256 entropy, uint256 upperBound) internal pure returns (uint256) {
        if (upperBound == 0) revert ZeroBound();
        // 2^256 mod upperBound, the count of values in the incomplete bucket at the top of the range.
        uint256 skip = (type(uint256).max - upperBound + 1) % upperBound;
        uint256 value = entropy;
        while (value < skip) {
            value = uint256(keccak256(abi.encodePacked(value)));
        }
        return value % upperBound;
    }
}
