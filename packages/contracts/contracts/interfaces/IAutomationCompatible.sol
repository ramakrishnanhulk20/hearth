// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title IAutomationCompatible
/// @notice The two functions Chainlink Automation calls on a custom-logic upkeep.
/// @dev Copied by signature from @chainlink/contracts 1.5.0 so the pool does not pull in that
///      package and its peer dependencies for two function selectors.
interface IAutomationCompatible {
    /// @notice Simulated off chain by the Automation network; must not be relied on for state.
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);

    /// @notice Executed on chain when `checkUpkeep` reported work. Must validate its own inputs.
    function performUpkeep(bytes calldata performData) external;
}
