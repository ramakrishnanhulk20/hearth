// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64, euint128} from "@fhevm/solidity/lib/FHE.sol";

/// @title IHearthVault
/// @notice What the prize pool needs from the vault: the period schedule, the encrypted aggregate
///         weight of a finished period, and the per-tier remainders of a finalized draw.
interface IHearthVault {
    /// @notice Computes the encrypted total time-weighted balance of `period`, marks it publicly
    ///         decryptable and returns the handle. Prize pool only; the period must have ended.
    function aggregateFor(uint32 period) external returns (euint128);

    function periodLength() external view returns (uint256);

    function firstPeriodAt() external view returns (uint256);

    /// @notice The encrypted liquidity of each tier that was not paid out for `drawId`.
    function remainingHandles(uint32 drawId) external view returns (euint64[3] memory);

    /// @notice True once `finalizeDraw` has published the remainders of `drawId`.
    function finalized(uint32 drawId) external view returns (bool);
}
