// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IYieldSource} from "../interfaces/IYieldSource.sol";

/// @dev Test-only yield venue that always fails, so the suite can prove a broken source cannot stall a
///      close. Never deployed.
contract RevertingYieldSource is IYieldSource {
    error Broken();

    function harvest() external pure returns (euint64) {
        revert Broken();
    }

    function harvestable() external pure returns (uint64) {
        return 0;
    }
}
