// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ebool, euint8, euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title IHearthVault
/// @notice What the prize pool needs from the vault: the period schedule, the encrypted scale of a
///         finished period's aggregate weight, the draw's encrypted liquidity, and the per-tier carry.
interface IHearthVault {
    /// @notice Compares the aggregate weight of `period` against `2^(scaleBits-2) .. 2^(scaleBits+2)` and
    ///         against one, marks both results publicly decryptable and returns them.
    /// @dev Prize pool only; the period must have ended. The exact aggregate is never published, because
    ///      two consecutive aggregates and a public transaction timestamp would recover a lone mover's
    ///      deposit exactly.
    /// @return count How many of the five thresholds the aggregate cleared, so the pool can move its scale.
    /// @return nonEmpty Whether anyone held a balance during `period`.
    function scaleFor(uint32 period, uint8 scaleBits) external returns (euint8 count, ebool nonEmpty);

    /// @notice Moves `offered` plus the tier's encrypted carry into the draw's encrypted liquidity.
    /// @dev Prize pool only, once per draw.
    function openDraw(uint32 drawId, uint64[3] calldata offered) external;

    /// @notice Gives a draw that will never pay back: the plaintext `offered` returns to the pool and the
    ///         encrypted part returns to the tier's carry.
    /// @dev Prize pool only, for a draw that was opened and is not finalized.
    function abandonDraw(uint32 drawId, uint64[3] calldata offered) external;

    /// @notice Subtracts a reconciled `amount` from `tier`'s encrypted carry and clears the publication.
    /// @dev Prize pool only, and only while that tier has a published carry awaiting reconciliation.
    function consumeCarry(uint8 tier, uint64 amount) external;

    function periodLength() external view returns (uint256);

    function firstPeriodAt() external view returns (uint256);

    /// @notice True once `finalizeDraw` folded `drawId` into the carries, or the draw was abandoned.
    function finalized(uint32 drawId) external view returns (bool);

    /// @notice The encrypted liquidity of each tier that `drawId` has not paid out.
    function remainingHandles(uint32 drawId) external view returns (euint64[3] memory);

    /// @notice The carry handle `tier` published, the draw it was published at, and whether it is still
    ///         waiting to be reconciled.
    function publishedCarry(uint8 tier) external view returns (euint64 handle, uint32 publishedAt, bool pending);
}
