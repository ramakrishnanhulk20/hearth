// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title IHearthPrizePool
/// @notice What the vault needs from the prize pool: the fixed parameters of an awarded draw, the
///         reconcile cadence of each tier, and the encrypted transfer that backs credited winnings.
interface IHearthPrizePool {
    /// @dev Order is fixed once deployed: the vault and the app compare against these values by index.
    ///      Empty is a period in which nobody held a balance, Skipped is an award that landed after the
    ///      draw's window. Both book the harvest, hand the offered liquidity back and pay nothing.
    enum DrawStatus {
        None,
        Closed,
        Awarded,
        Empty,
        Skipped
    }

    /// @dev Everything the winner test needs, all public once the draw is awarded. In tier `t` a saver takes
    ///      `prizeCount[t]` nested shots against the range `M = 1 << scaleBits`: shot `k` is won when
    ///      `twab * zoneMul[t] > (r + k * M) * zoneDiv[t]`, for the saver's uniform draw `r` in `[0, M)`.
    ///      Fields are declared widest first so the struct packs without a wasted slot.
    struct DrawParams {
        DrawStatus status;
        uint64[3] prize;
        uint64[3] offered;
        uint64[3] zoneMul;
        uint64[3] zoneDiv;
        uint32[3] prizeCount;
        uint64 seed;
        uint8 scaleBits;
    }

    /// @notice Transfers `amount` of the confidential asset to the vault and returns what was sent.
    /// @dev Vault only. The vault must have allowed the pool on `amount` in the same transaction.
    function fund(euint64 amount) external returns (euint64 sent);

    /// @notice The public parameters of `drawId`, meaningful once the draw is awarded.
    function drawParams(uint32 drawId) external view returns (DrawParams memory);

    /// @notice How many draws pass between two publications of `tier`'s encrypted carry.
    /// @dev Never zero, so the vault can use it as a modulus.
    function reconcileEvery(uint8 tier) external view returns (uint16);
}
