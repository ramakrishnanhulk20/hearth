// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title IHearthPrizePool
/// @notice What the vault needs from the prize pool: the fixed parameters of an awarded draw, and
///         the encrypted transfer that backs the winnings the vault has just credited.
interface IHearthPrizePool {
    enum DrawStatus {
        None,
        Closed,
        Awarded,
        Empty,
        Reconciled
    }

    /// @dev Everything the winner test needs, all public once the draw is awarded. A saver wins tier
    ///      `t` when `twab * zoneMul[t] > r * zoneDiv[t]` for their uniform draw `r` in `[0, aggregate)`.
    struct DrawParams {
        DrawStatus status;
        uint64 seed;
        uint128 aggregate;
        uint64[3] prize;
        uint64[3] offered;
        uint64[3] zoneMul;
        uint64[3] zoneDiv;
    }

    /// @notice Transfers `amount` of the confidential asset to the vault and returns what was sent.
    /// @dev Vault only. The vault must have allowed the pool on `amount` in the same transaction.
    function fund(euint64 amount) external returns (euint64 sent);

    function drawParams(uint32 drawId) external view returns (DrawParams memory);
}
