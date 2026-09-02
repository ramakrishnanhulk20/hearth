// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, euint128} from "@fhevm/solidity/lib/FHE.sol";
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
/// @notice Runs the draw schedule: harvests yield into tiered prize liquidity, draws the encrypted
///         random seed, verifies the decrypted seed and aggregate weight, fixes prize sizes, backs the
///         winnings the vault credits, and takes unpaid liquidity back after each draw.
/// @dev All liquidity accounting here is plaintext: prize sizes are public, the
///      identities of winners are not. Every lifecycle step is callable by anyone; the keeper is a
///      convenience, never a privilege.
contract HearthPrizePool is
    IHearthPrizePool,
    IAutomationCompatible,
    ZamaEthereumConfig,
    Ownable2Step,
    Pausable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    /// @dev A saver's chance to win a tier is `prizeCount * odds * twab / aggregate`, capped at one, and
    ///      a tier pays `liquidity * UTILISATION / prizeCount` per winner.
    struct Tier {
        uint32 prizeCount;
        uint64 oddsNumerator;
        uint64 oddsDenominator;
        uint16 shares;
    }

    struct Draw {
        DrawStatus status;
        euint64 seedHandle;
        euint128 aggregateHandle;
        uint64 seed;
        uint128 aggregate;
        uint64 harvested;
        uint64[3] prize;
        uint64[3] offered;
    }

    uint8 public constant TIERS = 3;

    /// @notice Share of a tier's liquidity offered per draw, in basis points. Half, so a tier can pay
    ///         twice its expected number of winners before the vault's clamp bites.
    uint16 public constant UTILISATION_BPS = 5000;

    IHearthVault public immutable vault;
    IERC7984 public immutable asset;
    uint256 public immutable periodLength;
    uint256 public immutable firstPeriodAt;
    uint16 private immutable _totalShares;

    IYieldSource public yieldSource;
    Tier[3] private _tiers;

    /// @notice Unreserved liquidity of each tier, in asset base units.
    uint64[3] public liquidity;

    mapping(uint32 drawId => Draw) private _draws;
    uint32 public lastClosedDraw;

    event DrawClosed(uint32 indexed drawId, euint64 seedHandle, euint128 aggregateHandle, uint64 harvested);
    event DrawAwarded(uint32 indexed drawId, uint64 seed, uint128 aggregate, uint64[3] prize, uint64[3] offered);
    event DrawEmpty(uint32 indexed drawId);
    event DrawReconciled(uint32 indexed drawId, uint64[3] paid, uint64[3] returned);
    event YieldSourceSet(address indexed yieldSource);
    event Funded(euint64 amount);

    error ZeroAddress();
    error NotTheVault();
    error InvalidTier(uint8 tier);
    error NothingToClose();
    error AlreadyClosed(uint32 drawId);
    error WrongStatus(uint32 drawId, DrawStatus status);
    error AwardWindowClosed(uint32 drawId);
    error NotFinalized(uint32 drawId);
    error RemainderAboveOffered(uint8 tier);
    error CannotRescueAsset();
    error RenounceDisabled();

    /// @param vault_ The vault whose schedule this pool follows and whose winnings it backs.
    /// @param asset_ The confidential token prizes are paid in; must match the vault's asset.
    /// @param tiers_ Prize count, odds and liquidity shares of each tier.
    /// @param owner_ Account allowed to pause draw closing and change the yield source.
    constructor(IHearthVault vault_, IERC7984 asset_, Tier[3] memory tiers_, address owner_) Ownable(owner_) {
        if (address(vault_) == address(0) || address(asset_) == address(0)) revert ZeroAddress();

        vault = vault_;
        asset = asset_;
        periodLength = vault_.periodLength();
        firstPeriodAt = vault_.firstPeriodAt();

        uint16 totalShares;
        for (uint8 tier = 0; tier < TIERS; tier++) {
            Tier memory config = tiers_[tier];
            if (
                config.prizeCount == 0 ||
                config.oddsNumerator == 0 ||
                config.oddsDenominator < config.oddsNumerator ||
                config.shares == 0
            ) revert InvalidTier(tier);
            _tiers[tier] = config;
            totalShares += config.shares;
        }
        _totalShares = totalShares;
    }

    /// @notice Sets the source of prize liquidity. The zero address disables harvesting.
    function setYieldSource(IYieldSource yieldSource_) external onlyOwner {
        yieldSource = yieldSource_;
        emit YieldSourceSet(address(yieldSource_));
    }

    /// @notice Stops draws from closing. Awarding, evaluation and withdrawals continue.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Returns a stray ERC-20 to `to`. The pool never holds public tokens of its own.
    function rescueERC20(IERC20 token, address to) external onlyOwner {
        if (address(token) == address(asset)) revert CannotRescueAsset();
        token.safeTransfer(to, token.balanceOf(address(this)));
    }

    /// @notice Verifies the decrypted seed and aggregate of a closed draw and fixes its prize sizes.
    /// @dev `proof` is the KMS signature bundle over the two handles in the order [seed, aggregate].
    ///      Must land while period `drawId + 1` runs; a draw awarded later would have no evaluation
    ///      window. An aggregate of zero means nobody held a balance: liquidity stays for the next draw.
    ///      Emits DrawAwarded or DrawEmpty.
    function awardDraw(uint32 drawId, uint64 seed, uint128 aggregate, bytes calldata proof) external nonReentrant {
        Draw storage draw = _draws[drawId];
        if (draw.status != DrawStatus.Closed) revert WrongStatus(drawId, draw.status);
        if (_currentPeriod() != drawId + 1) revert AwardWindowClosed(drawId);

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = euint64.unwrap(draw.seedHandle);
        handles[1] = euint128.unwrap(draw.aggregateHandle);
        FHE.checkSignatures(handles, abi.encode(seed, aggregate), proof);

        draw.seed = seed;
        draw.aggregate = aggregate;

        if (aggregate == 0) {
            draw.status = DrawStatus.Empty;
            emit DrawEmpty(drawId);
            return;
        }

        for (uint8 tier = 0; tier < TIERS; tier++) {
            uint64 available = liquidity[tier];
            draw.offered[tier] = available;
            draw.prize[tier] = uint64((uint256(available) * UTILISATION_BPS) / 10_000 / _tiers[tier].prizeCount);
            liquidity[tier] = 0;
        }
        draw.status = DrawStatus.Awarded;

        emit DrawAwarded(drawId, seed, aggregate, draw.prize, draw.offered);
    }

    /// @notice Takes back the liquidity a draw did not pay out, using the vault's published remainders.
    /// @dev `proof` covers the three remainder handles in tier order. Emits DrawReconciled.
    function reconcile(uint32 drawId, uint64[3] calldata remaining, bytes calldata proof) external nonReentrant {
        Draw storage draw = _draws[drawId];
        if (draw.status != DrawStatus.Awarded) revert WrongStatus(drawId, draw.status);
        if (!vault.finalized(drawId)) revert NotFinalized(drawId);

        euint64[3] memory encrypted = vault.remainingHandles(drawId);
        bytes32[] memory handles = new bytes32[](TIERS);
        for (uint8 tier = 0; tier < TIERS; tier++) {
            handles[tier] = euint64.unwrap(encrypted[tier]);
        }
        FHE.checkSignatures(handles, abi.encode(remaining[0], remaining[1], remaining[2]), proof);

        uint64[3] memory paid;
        uint64[3] memory returned;
        for (uint8 tier = 0; tier < TIERS; tier++) {
            if (remaining[tier] > draw.offered[tier]) revert RemainderAboveOffered(tier);
            liquidity[tier] += remaining[tier];
            returned[tier] = remaining[tier];
            paid[tier] = draw.offered[tier] - remaining[tier];
        }
        draw.status = DrawStatus.Reconciled;

        emit DrawReconciled(drawId, paid, returned);
    }

    /// @inheritdoc IHearthPrizePool
    function fund(euint64 amount) external nonReentrant returns (euint64 sent) {
        if (msg.sender != address(vault)) revert NotTheVault();
        FHE.allowTransient(amount, address(asset));
        sent = asset.confidentialTransfer(address(vault), amount);
        emit Funded(amount);
    }

    /// @inheritdoc IAutomationCompatible
    function performUpkeep(bytes calldata) external {
        closeDraw();
    }

    /// @inheritdoc IAutomationCompatible
    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
        return (canClose(), "");
    }

    /// @inheritdoc IHearthPrizePool
    function drawParams(uint32 drawId) external view returns (DrawParams memory params) {
        Draw storage draw = _draws[drawId];
        params.status = draw.status;
        params.seed = draw.seed;
        params.aggregate = draw.aggregate;
        params.prize = draw.prize;
        params.offered = draw.offered;
        for (uint8 tier = 0; tier < TIERS; tier++) {
            params.zoneMul[tier] = uint64(_tiers[tier].prizeCount) * _tiers[tier].oddsNumerator;
            params.zoneDiv[tier] = _tiers[tier].oddsDenominator;
        }
    }

    /// @notice Full record of a draw, including the encrypted handles the keeper decrypts.
    function drawOf(uint32 drawId) external view returns (Draw memory) {
        return _draws[drawId];
    }

    function tierOf(uint8 tier) external view returns (Tier memory) {
        return _tiers[tier];
    }

    function currentPeriod() external view returns (uint32) {
        return _currentPeriod();
    }

    /// @notice Closes the period that just ended: harvests yield, draws the encrypted seed, snapshots
    ///         the encrypted aggregate weight, and marks both for public decryption.
    /// @dev Anyone may call, once per period, while the following period runs. Public rather than
    ///      external only so `performUpkeep` can reuse it with the same guards. Emits DrawClosed.
    function closeDraw() public whenNotPaused nonReentrant {
        uint32 period = _currentPeriod();
        if (period < 2) revert NothingToClose();
        uint32 drawId = period - 1;

        Draw storage draw = _draws[drawId];
        if (draw.status != DrawStatus.None) revert AlreadyClosed(drawId);

        uint64 harvested = address(yieldSource) == address(0) ? 0 : yieldSource.harvest();
        _distribute(harvested);

        euint64 seed = FHE.randEuint64();
        FHE.allowThis(seed);
        FHE.makePubliclyDecryptable(seed);
        euint128 aggregate = vault.aggregateFor(drawId);

        draw.status = DrawStatus.Closed;
        draw.seedHandle = seed;
        draw.aggregateHandle = aggregate;
        draw.harvested = harvested;
        lastClosedDraw = drawId;

        emit DrawClosed(drawId, seed, aggregate, harvested);
    }

    /// @notice Disabled: the pool must keep an owner able to change the yield source.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    /// @notice True when a period has ended and its draw has not been closed yet.
    function canClose() public view returns (bool) {
        uint32 period = _currentPeriod();
        return !paused() && period >= 2 && _draws[period - 1].status == DrawStatus.None;
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

    function _currentPeriod() private view returns (uint32) {
        return Periods.periodOf(block.timestamp, firstPeriodAt, periodLength);
    }
}
