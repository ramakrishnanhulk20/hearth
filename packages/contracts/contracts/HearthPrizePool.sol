// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint8, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAutomationCompatible} from "./interfaces/IAutomationCompatible.sol";
import {IHearthPrizePool} from "./interfaces/IHearthPrizePool.sol";
import {IHearthVault} from "./interfaces/IHearthVault.sol";
import {IYieldSource} from "./interfaces/IYieldSource.sol";
import {Periods} from "./libraries/Periods.sol";

/// @title HearthPrizePool
/// @notice Runs the draw schedule: fixes prize sizes, moves tier liquidity into a draw, draws the encrypted
///         random seed, verifies the decrypted seed, scale, non-empty flag and harvest, backs the winnings
///         the vault credits, and books each tier's reconciled carry back into plaintext liquidity.
/// @dev All liquidity accounting here is plaintext: prize sizes are public, the identities of winners are
///      not. Every lifecycle step is callable by anyone; the keeper is a convenience, never a privilege.
///      Prize sizes are fixed at close, before the seed exists, so nothing done after seeing the seed can
///      change what a win is worth. A step that misses its window never destroys liquidity: the offered
///      amount goes back to the tiers and that period simply pays no prize.
contract HearthPrizePool is
    IHearthPrizePool,
    IAutomationCompatible,
    ZamaEthereumConfig,
    Ownable2Step,
    Pausable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    /// @dev In tier `t` a saver takes `prizeCount` nested shots, each won with probability
    ///      `odds * twab / M`, and a tier pays `liquidity * UTILISATION / prizeCount` per shot won.
    ///      `reconcileEvery` is how many draws the tier's encrypted carry rides along before it is
    ///      published: a long cadence hides which draw a jackpot was paid in.
    struct Tier {
        uint32 prizeCount;
        uint64 oddsNumerator;
        uint64 oddsDenominator;
        uint16 shares;
        uint16 reconcileEvery;
    }

    struct Draw {
        DrawStatus status;
        euint64 seedHandle;
        euint8 scaleHandle;
        ebool nonEmptyHandle;
        euint64 harvestHandle;
        uint64 seed;
        uint8 scaleBits;
        uint64 harvested;
        uint64[3] prize;
        uint64[3] offered;
    }

    uint8 public constant TIERS = 3;

    /// @notice Share of a tier's liquidity offered per draw, in basis points. Half, so a tier can pay
    ///         twice its expected number of winners before the vault's clamp bites.
    uint16 public constant UTILISATION_BPS = 5000;

    /// @notice Largest scale the pool will track. The vault's aggregate is a 128-bit balance-seconds
    ///         figure, so a range above this could never be reached by any supply the wrapper can mint.
    uint8 public constant MAX_SCALE_BITS = 120;

    IHearthVault public immutable vault;
    IERC7984 public immutable asset;
    uint256 public immutable periodLength;
    uint256 public immutable firstPeriodAt;
    uint16 private immutable _totalShares;

    IYieldSource public yieldSource;
    Tier[3] private _tiers;

    /// @notice Bit length of the range `M = 1 << scaleBits` that draws are run against, tracked so that
    ///         `M` stays between the aggregate weight and twice it. Each award moves it by at most three.
    uint8 public scaleBits;

    /// @notice Unreserved liquidity of each tier, in asset base units.
    uint64[3] public liquidity;

    mapping(uint32 drawId => Draw) private _draws;

    /// @notice Highest draw id closed so far. Draws can be closed out of order inside their windows.
    uint32 public lastClosedDraw;

    event DrawClosed(
        uint32 indexed drawId,
        euint64 seedHandle,
        euint8 scaleHandle,
        ebool nonEmptyHandle,
        euint64 harvestHandle,
        uint64[3] prize,
        uint64[3] offered
    );
    event DrawAwarded(uint32 indexed drawId, uint64 seed, uint8 scaleBits, uint64 harvested);
    event DrawEmpty(uint32 indexed drawId, uint64 harvested);
    event DrawSkipped(uint32 indexed drawId, uint64 harvested);
    event TierReconciled(uint32 indexed drawId, uint8 indexed tier, uint64 carry);
    event HarvestFailed(uint32 indexed drawId);
    event YieldSourceSet(address indexed yieldSource);
    event Funded(euint64 amount);

    error ZeroAddress();
    error NotTheVault();
    error InvalidTier(uint8 tier);
    error InvalidScaleBits(uint8 scaleBits);
    error NothingToClose();
    error AlreadyClosed(uint32 drawId);
    error WrongStatus(uint32 drawId, DrawStatus status);
    error CloseWindowClosed(uint32 drawId);
    error CarryNotPending(uint8 tier);
    error CannotRescueAsset();
    error YieldSourceHasNoCode();
    error RenounceDisabled();

    /// @param vault_ The vault whose schedule this pool follows and whose winnings it backs.
    /// @param asset_ The confidential token prizes are paid in; must match the vault's asset.
    /// @param tiers_ Prize count, odds, liquidity shares and reconcile cadence of each tier.
    /// @param initialScaleBits Expected bit length of the first period's aggregate weight.
    /// @param owner_ Account allowed to pause draw closing and change the yield source.
    constructor(
        IHearthVault vault_,
        IERC7984 asset_,
        Tier[3] memory tiers_,
        uint8 initialScaleBits,
        address owner_
    ) Ownable(owner_) {
        if (address(vault_) == address(0) || address(asset_) == address(0)) revert ZeroAddress();
        if (initialScaleBits == 0 || initialScaleBits > MAX_SCALE_BITS) revert InvalidScaleBits(initialScaleBits);

        vault = vault_;
        asset = asset_;
        periodLength = vault_.periodLength();
        firstPeriodAt = vault_.firstPeriodAt();
        scaleBits = initialScaleBits;

        uint16 totalShares;
        for (uint8 tier = 0; tier < TIERS; tier++) {
            Tier memory config = tiers_[tier];
            // `prizeCount * oddsNumerator` is the zone multiplier the vault divides by, so it has to fit
            // the 64-bit field it is published in.
            if (
                config.prizeCount == 0 ||
                config.oddsNumerator == 0 ||
                config.oddsDenominator < config.oddsNumerator ||
                config.shares == 0 ||
                config.reconcileEvery == 0 ||
                uint256(config.prizeCount) * config.oddsNumerator > type(uint64).max
            ) revert InvalidTier(tier);
            _tiers[tier] = config;
            totalShares += config.shares;
        }
        _totalShares = totalShares;
    }

    /// @notice Sets the source of prize liquidity. The zero address disables harvesting.
    /// @dev Emits YieldSourceSet.
    function setYieldSource(IYieldSource yieldSource_) external onlyOwner {
        // A codeless source would make every close revert in the pool's own frame, outside the try.
        if (address(yieldSource_) != address(0) && address(yieldSource_).code.length == 0) {
            revert YieldSourceHasNoCode();
        }
        yieldSource = yieldSource_;
        emit YieldSourceSet(address(yieldSource_));
    }

    /// @notice Stops draws from closing. Awarding, evaluation, reconciliation and withdrawals continue.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Lets draws close again.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Returns a stray ERC-20 to `to`. The pool never holds public tokens of its own.
    /// @dev Reverts CannotRescueAsset for the prize asset, so prize liquidity can never be swept.
    function rescueERC20(IERC20 token, address to) external onlyOwner {
        if (address(token) == address(asset)) revert CannotRescueAsset();
        token.safeTransfer(to, token.balanceOf(address(this)));
    }

    /// @notice Closes the oldest draw still open inside its window.
    /// @dev Convenience for keepers and the app. Reverts NothingToClose when no draw is closable.
    function closeDraw() external {
        uint32 drawId = closableDraw();
        if (drawId == 0) revert NothingToClose();
        closeDraw(drawId);
    }

    /// @notice Verifies the decrypted seed, scale, non-empty flag and harvest of a closed draw, books the
    ///         harvest into the tiers, moves the tracked scale, and opens or abandons the draw.
    /// @dev `proof` is the KMS signature bundle over the four handles in the order [seed, scale, nonEmpty,
    ///      harvest]. The harvest is booked before any branch, so yield is never lost. Reverts WrongStatus
    ///      unless the draw is Closed, and reverts InvalidKMSSignatures if the proof does not verify. An
    ///      award after the window marks the draw Skipped; a period nobody held a balance in marks it
    ///      Empty. Both hand the offered liquidity back to the tiers. Emits DrawAwarded, DrawEmpty or
    ///      DrawSkipped.
    /// @param scaleCount How many of the vault's five thresholds the aggregate weight cleared.
    /// @param nonEmpty Whether anyone held a balance during the draw's period.
    function awardDraw(
        uint32 drawId,
        uint64 seed,
        uint8 scaleCount,
        bool nonEmpty,
        uint64 harvested,
        bytes calldata proof
    ) external nonReentrant {
        Draw storage draw = _draws[drawId];
        if (draw.status != DrawStatus.Closed) revert WrongStatus(drawId, draw.status);

        bytes32[] memory handles = new bytes32[](4);
        handles[0] = euint64.unwrap(draw.seedHandle);
        handles[1] = euint8.unwrap(draw.scaleHandle);
        handles[2] = ebool.unwrap(draw.nonEmptyHandle);
        handles[3] = euint64.unwrap(draw.harvestHandle);
        FHE.checkSignatures(handles, abi.encode(seed, scaleCount, nonEmpty, harvested), proof);

        _distribute(harvested);
        // An empty period measures nothing, so the bracket holds; otherwise an idle pool would decay
        // its scale and hand the first returning savers every prize until it climbed back.
        if (nonEmpty) scaleBits = _nextScaleBits(scaleCount);

        draw.seed = seed;
        draw.scaleBits = scaleBits;
        draw.harvested = harvested;

        if (_currentPeriod() > drawId + 2) {
            _returnOffered(drawId, draw);
            draw.status = DrawStatus.Skipped;
            emit DrawSkipped(drawId, harvested);
            return;
        }

        if (!nonEmpty) {
            _returnOffered(drawId, draw);
            draw.status = DrawStatus.Empty;
            emit DrawEmpty(drawId, harvested);
            return;
        }

        draw.status = DrawStatus.Awarded;
        emit DrawAwarded(drawId, seed, draw.scaleBits, harvested);
    }

    /// @notice Books a tier's decrypted carry back into its plaintext liquidity.
    /// @dev `proof` is the KMS signature bundle over the single carry handle the vault published at its
    ///      last due finalization. Reverts CarryNotPending when that tier has nothing awaiting
    ///      reconciliation, which is also the replay guard, InvalidTier above the last tier, and
    ///      InvalidKMSSignatures if the proof does not verify. Emits TierReconciled.
    function reconcile(uint8 tier, uint64 carry, bytes calldata proof) external nonReentrant {
        if (tier >= TIERS) revert InvalidTier(tier);
        (euint64 handle, uint32 publishedAt, bool pending) = vault.publishedCarry(tier);
        if (!pending) revert CarryNotPending(tier);

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = euint64.unwrap(handle);
        FHE.checkSignatures(handles, abi.encode(carry), proof);

        vault.consumeCarry(tier, carry);
        liquidity[tier] += carry;

        emit TierReconciled(publishedAt, tier, carry);
    }

    /// @inheritdoc IHearthPrizePool
    /// @dev Reverts NotTheVault for any other caller. Emits Funded.
    function fund(euint64 amount) external nonReentrant returns (euint64 sent) {
        if (msg.sender != address(vault)) revert NotTheVault();
        FHE.allowTransient(amount, address(asset));
        sent = asset.confidentialTransfer(address(vault), amount);
        emit Funded(amount);
    }

    /// @inheritdoc IAutomationCompatible
    /// @dev Closes the draw the upkeep reported rather than whatever is closable now, so a stale
    ///      `performData` fails on the status check instead of closing an unrelated draw.
    function performUpkeep(bytes calldata performData) external {
        closeDraw(abi.decode(performData, (uint32)));
    }

    /// @inheritdoc IAutomationCompatible
    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
        return (canClose(), abi.encode(closableDraw()));
    }

    /// @inheritdoc IHearthPrizePool
    function drawParams(uint32 drawId) external view returns (DrawParams memory params) {
        Draw storage draw = _draws[drawId];
        params.status = draw.status;
        params.seed = draw.seed;
        params.scaleBits = draw.scaleBits;
        params.prize = draw.prize;
        params.offered = draw.offered;
        for (uint8 tier = 0; tier < TIERS; tier++) {
            params.zoneMul[tier] = uint64(_tiers[tier].prizeCount) * _tiers[tier].oddsNumerator;
            params.zoneDiv[tier] = _tiers[tier].oddsDenominator;
            params.prizeCount[tier] = _tiers[tier].prizeCount;
        }
    }

    /// @notice Full record of a draw, including the encrypted handles the keeper decrypts.
    function drawOf(uint32 drawId) external view returns (Draw memory) {
        return _draws[drawId];
    }

    /// @notice Prize count, odds, shares and reconcile cadence of `tier`.
    /// @dev Reverts InvalidTier above the last tier.
    function tierOf(uint8 tier) external view returns (Tier memory) {
        if (tier >= TIERS) revert InvalidTier(tier);
        return _tiers[tier];
    }

    /// @inheritdoc IHearthPrizePool
    /// @dev Reverts InvalidTier above the last tier.
    function reconcileEvery(uint8 tier) external view returns (uint16) {
        if (tier >= TIERS) revert InvalidTier(tier);
        return _tiers[tier].reconcileEvery;
    }

    /// @notice Last moment at which any step of `drawId` can still land.
    function windowEndsAt(uint32 drawId) external view returns (uint256) {
        return Periods.endOf(drawId + 2, firstPeriodAt, periodLength);
    }

    /// @notice The period the chain is in right now.
    function currentPeriod() external view returns (uint32) {
        return _currentPeriod();
    }

    /// @notice Closes `drawId`: fixes every tier's prize size and offered liquidity, moves that liquidity
    ///         into the draw, draws the encrypted seed, asks the vault for the encrypted scale of the
    ///         period's aggregate weight, and harvests yield.
    /// @dev Anyone may call, once per draw, from the start of period `drawId + 1` until `closeDeadline`.
    ///      Reverts CloseWindowClosed outside that span, AlreadyClosed for a draw already past None, and
    ///      EnforcedPause while paused. A yield source that reverts does not stop the close: the harvest
    ///      handle is then a trivial zero and HarvestFailed is emitted, so a broken source can never
    ///      strand a period. The vault marks the scale and the non-empty flag publicly decryptable itself,
    ///      because it is the contract allowed on them. Costs 3,039,448 homomorphic compute units at a
    ///      handle depth of 1,109,064 and about 1.23 million gas, measured on the Sepolia tier set, which
    ///      is independent of how many savers the pool has. Emits DrawClosed.
    function closeDraw(uint32 drawId) public whenNotPaused nonReentrant {
        uint32 period = _currentPeriod();
        if (drawId == 0 || period < drawId + 1 || block.timestamp >= closeDeadline(drawId)) {
            revert CloseWindowClosed(drawId);
        }

        Draw storage draw = _draws[drawId];
        if (draw.status != DrawStatus.None) revert AlreadyClosed(drawId);

        uint64[3] memory offered;
        for (uint8 tier = 0; tier < TIERS; tier++) {
            uint64 available = liquidity[tier];
            offered[tier] = available;
            draw.offered[tier] = available;
            draw.prize[tier] = uint64((uint256(available) * UTILISATION_BPS) / 10_000 / _tiers[tier].prizeCount);
            liquidity[tier] = 0;
        }
        vault.openDraw(drawId, offered);

        euint64 seed = FHE.randEuint64();
        FHE.allowThis(seed);
        FHE.makePubliclyDecryptable(seed);

        (euint8 scale, ebool nonEmpty) = vault.scaleFor(drawId, scaleBits);

        euint64 harvestHandle;
        if (address(yieldSource) == address(0)) {
            harvestHandle = FHE.asEuint64(0);
        } else {
            try yieldSource.harvest() returns (euint64 harvested) {
                harvestHandle = harvested;
            } catch {
                harvestHandle = FHE.asEuint64(0);
                emit HarvestFailed(drawId);
            }
        }
        FHE.allowThis(harvestHandle);
        FHE.makePubliclyDecryptable(harvestHandle);

        draw.status = DrawStatus.Closed;
        draw.seedHandle = seed;
        draw.scaleHandle = scale;
        draw.nonEmptyHandle = nonEmpty;
        draw.harvestHandle = harvestHandle;
        if (drawId > lastClosedDraw) lastClosedDraw = drawId;

        emit DrawClosed(drawId, seed, scale, nonEmpty, harvestHandle, draw.prize, draw.offered);
    }

    /// @notice Disabled: the pool must keep an owner able to change the yield source.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    /// @notice Last moment at which `drawId` may still be closed.
    /// @dev The first three quarters of the two-period window, so the KMS round trip, the award and every
    ///      evaluation batch always have at least half a period left after a close.
    function closeDeadline(uint32 drawId) public view returns (uint256) {
        return Periods.startOf(drawId + 2, firstPeriodAt, periodLength) + periodLength / 2;
    }

    /// @notice The oldest draw that can still be closed right now, or zero when there is none.
    /// @dev At any period at most two draws are inside their window, so this scan is two iterations.
    function closableDraw() public view returns (uint32) {
        uint32 period = _currentPeriod();
        if (period < 2) return 0;
        uint32 oldest = period > 2 ? period - 2 : 1;
        for (uint32 drawId = oldest; drawId < period; drawId++) {
            if (_draws[drawId].status == DrawStatus.None && block.timestamp < closeDeadline(drawId)) {
                return drawId;
            }
        }
        return 0;
    }

    /// @notice True when a draw is waiting to be closed and the pool is not paused.
    function canClose() public view returns (bool) {
        return !paused() && closableDraw() != 0;
    }

    function _returnOffered(uint32 drawId, Draw storage draw) private {
        vault.abandonDraw(drawId, draw.offered);
        for (uint8 tier = 0; tier < TIERS; tier++) {
            liquidity[tier] += draw.offered[tier];
        }
    }

    function _distribute(uint64 harvested) private {
        if (harvested == 0) return;
        uint64 assigned;
        for (uint8 tier = 1; tier < TIERS; tier++) {
            uint64 share = uint64((uint256(harvested) * _tiers[tier].shares) / _totalShares);
            liquidity[tier] += share;
            assigned += share;
        }
        // The grand tier takes its share plus the rounding remainder.
        liquidity[0] += harvested - assigned;
    }

    /// @dev The vault reports how many of `2^(m-2) .. 2^(m+2)` the aggregate cleared, so `m - 2 + count`
    ///      is the bit length of the smallest power of two at or above it. A count of zero or five means
    ///      the aggregate left the bracket, and the scale walks towards it two or three bits per draw.
    function _nextScaleBits(uint8 count) private view returns (uint8) {
        int256 next = int256(uint256(scaleBits)) - 2 + int256(uint256(count));
        if (next < 1) return 1;
        if (next > int256(uint256(MAX_SCALE_BITS))) return MAX_SCALE_BITS;
        return uint8(uint256(next));
    }

    function _currentPeriod() private view returns (uint32) {
        return Periods.periodOf(block.timestamp, firstPeriodAt, periodLength);
    }
}
