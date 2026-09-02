// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IYieldSource
/// @notice A source of prize liquidity for a Hearth prize pool, paid in the pool's confidential asset.
/// @dev Amounts are plaintext on purpose: yield is public in every prize-savings protocol, only the
///      savers' balances are private. Implementations either hold sponsored confidential USDC or
///      redeem growth from a yield venue, and transfer the harvested amount to their fixed recipient.
interface IYieldSource {
    /// @notice Moves every harvestable unit to the recipient and returns the amount moved.
    /// @dev Callable by the recipient only, so the recipient's plaintext accounting always sees the
    ///      amount. Returns zero without reverting when nothing has accrued.
    function harvest() external returns (uint64 amount);

    /// @notice Units of the confidential asset that `harvest` would move right now.
    function harvestable() external view returns (uint64);
}
