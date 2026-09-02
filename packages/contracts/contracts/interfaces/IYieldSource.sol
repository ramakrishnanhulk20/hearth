// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title IYieldSource
/// @notice A source of prize liquidity for a Hearth prize pool, paid in the pool's confidential asset.
/// @dev The recipient never books a number the source reports. It books the KMS-verified decryption of the
///      handle returned here, so a buggy or hostile source cannot create prize liquidity it did not transfer.
///      Only the savers' balances are private; yield is public in every prize-savings protocol.
interface IYieldSource {
    /// @notice Moves every harvestable unit to the recipient and returns the encrypted amount moved.
    /// @dev Callable by the recipient only. Returns a handle the recipient is allowed on, so the recipient can
    ///      mark it publicly decryptable in the same transaction. Returns an encrypted zero without reverting
    ///      when nothing has accrued, so the recipient's proof always covers a handle.
    /// @return transferred The encrypted amount the asset reported as transferred.
    function harvest() external returns (euint64 transferred);

    /// @notice Units of the confidential asset that `harvest` would move right now.
    function harvestable() external view returns (uint64);
}
