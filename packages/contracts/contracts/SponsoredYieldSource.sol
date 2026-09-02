// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/interfaces/IERC7984ERC20Wrapper.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IYieldSource} from "./interfaces/IYieldSource.sol";

/// @title SponsoredYieldSource
/// @notice Prize liquidity that accrues at a fixed rate from a sponsor-funded confidential USDC balance.
/// @dev Stands in for a yield venue on networks where none pays yield on the pool's asset. Sponsors wrap
///      public USDC into this contract; it releases the balance to the prize pool at `ratePerSecond`, so
///      prizes grow with time the way harvested yield would. Every number here is public by design: what
///      was sponsored, what has accrued, what was harvested. Savers' balances never touch this contract.
contract SponsoredYieldSource is IYieldSource, ZamaEthereumConfig, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC7984ERC20Wrapper public immutable asset;
    IERC20 public immutable underlying;

    /// @notice The only address that may harvest, so its plaintext accounting always sees the amount moved.
    address public immutable recipient;

    /// @notice Release rate in asset base units per second.
    uint64 public ratePerSecond;

    /// @notice Sponsored units not yet harvested.
    uint64 public balance;

    uint64 public accrued;
    uint64 public lastAccrualAt;

    event Sponsored(address indexed from, uint64 amount, uint64 balance);
    event RateChanged(uint64 ratePerSecond);
    event Harvested(uint64 amount, uint64 balance);

    error ZeroAddress();
    error ZeroAmount();
    error NotRecipient();
    error RenounceDisabled();

    /// @param asset_ The confidential wrapper the pool settles in.
    /// @param recipient_ The prize pool that receives harvests.
    /// @param ratePerSecond_ Initial release rate in base units per second; may be zero.
    /// @param owner_ Account allowed to change the rate.
    constructor(
        IERC7984ERC20Wrapper asset_,
        address recipient_,
        uint64 ratePerSecond_,
        address owner_
    ) Ownable(owner_) {
        if (address(asset_) == address(0) || recipient_ == address(0)) revert ZeroAddress();
        asset = asset_;
        underlying = IERC20(asset_.underlying());
        recipient = recipient_;
        ratePerSecond = ratePerSecond_;
        lastAccrualAt = uint64(block.timestamp);
        emit RateChanged(ratePerSecond_);
    }

    /// @notice Adds public USDC to the sponsored balance. Anyone may sponsor.
    /// @dev Pulls `amount` rounded down to a multiple of the wrapper rate, wraps it into this contract and
    ///      books the wrapped units, so the booked balance always equals what the wrapper minted.
    /// @param amount Underlying token amount to sponsor.
    function sponsor(uint256 amount) external nonReentrant {
        uint256 rate = asset.rate();
        uint256 rounded = amount - (amount % rate);
        if (rounded == 0) revert ZeroAmount();

        underlying.safeTransferFrom(msg.sender, address(this), rounded);
        underlying.forceApprove(address(asset), rounded);
        asset.wrap(address(this), rounded);

        uint64 units = SafeCast.toUint64(rounded / rate);
        balance += units;
        emit Sponsored(msg.sender, units, balance);
    }

    /// @notice Changes the release rate. Accrual up to now is settled first at the old rate.
    function setRate(uint64 ratePerSecond_) external onlyOwner {
        accrued = harvestable();
        lastAccrualAt = uint64(block.timestamp);
        ratePerSecond = ratePerSecond_;
        emit RateChanged(ratePerSecond_);
    }

    /// @inheritdoc IYieldSource
    /// @dev Reverts with NotRecipient for any other caller. Emits Harvested when an amount moves. The
    ///      plaintext amount in the event is what this source intended to send; what the pool books is the
    ///      decryption of the returned handle, which the token wrote after clamping to this balance.
    function harvest() external nonReentrant returns (euint64 transferred) {
        if (msg.sender != recipient) revert NotRecipient();

        uint64 amount = harvestable();
        accrued = 0;
        lastAccrualAt = uint64(block.timestamp);
        if (amount == 0) {
            transferred = FHE.asEuint64(0);
            FHE.allowTransient(transferred, recipient);
            return transferred;
        }

        balance -= amount;
        euint64 encrypted = FHE.asEuint64(amount);
        FHE.allowTransient(encrypted, address(asset));
        transferred = asset.confidentialTransfer(recipient, encrypted);

        emit Harvested(amount, balance);
    }

    /// @inheritdoc IYieldSource
    function harvestable() public view returns (uint64) {
        uint256 pending = uint256(accrued) + uint256(ratePerSecond) * (block.timestamp - lastAccrualAt);
        return pending > balance ? balance : uint64(pending);
    }

    /// @notice Disabled: a source with no owner could never change its rate again.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }
}
