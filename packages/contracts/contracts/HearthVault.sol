// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, euint128, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IHearthPrizePool} from "./interfaces/IHearthPrizePool.sol";
import {IHearthVault} from "./interfaces/IHearthVault.sol";
import {Periods} from "./libraries/Periods.sol";
import {UniformRandom} from "./libraries/UniformRandom.sol";

/// @title HearthVault
/// @notice Holds savers' confidential USDC, keeps every balance and time-weighted balance encrypted,
///         runs the winner test for each saver over those encrypted values, and pays out.
/// @dev Deposits arrive through the ERC-7984 receive hook. The only exit is `withdraw`, which pays
///      winnings first and principal second in one confidential transfer, so a winner's exit is
///      indistinguishable from anyone else's. The draw schedule lives here (`periodLength`,
///      `firstPeriodAt`); the prize pool reads it. Nothing in this contract branches on a secret.
contract HearthVault is
    IHearthVault,
    IERC7984Receiver,
    ZamaEthereumConfig,
    Ownable2Step,
    Pausable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    /// @dev `cum` is balance-seconds accumulated since the start of the period containing `ts`.
    struct Observation {
        euint64 cum;
        euint64 balance;
        uint32 ts;
    }

    struct TotalObservation {
        euint128 cum;
        euint64 balance;
        uint32 ts;
    }

    uint8 public constant TIERS = 3;

    /// @notice Savers per `evaluate` call. Six keeps a three-tier evaluation inside the coprocessor's
    ///         20,000,000 unit budget with margin; see the HCU table in the README.
    uint256 public constant MAX_BATCH = 6;

    IERC7984 public immutable asset;
    uint256 public immutable periodLength;
    uint256 public immutable firstPeriodAt;

    /// @notice Largest principal a saver may hold, so that balance times period seconds fits 64 bits.
    uint64 public immutable maxPrincipal;

    IHearthPrizePool public prizePool;

    mapping(address saver => euint64) private _principal;
    mapping(address saver => euint64) private _winnings;
    mapping(address saver => Observation[2]) private _observations;
    TotalObservation[2] private _total;
    mapping(uint32 period => euint128) private _aggregate;

    address[] private _savers;
    mapping(address saver => bool) public isSaver;

    mapping(uint32 drawId => mapping(address saver => bool)) public evaluated;
    mapping(uint32 drawId => euint64[3]) private _remaining;
    mapping(uint32 drawId => bool) private _remainingSet;
    mapping(uint32 drawId => bool) public finalized;

    /// @dev Winnings credited that the pool failed to back. Always zero when the pool is solvent;
    ///      published at finalization so anyone can check.
    euint64 private _unfunded;

    event Deposited(address indexed saver);
    event Withdrawn(address indexed saver);
    event Evaluated(address indexed saver, uint32 indexed drawId);
    event DrawFinalized(uint32 indexed drawId, euint64[3] remaining, euint64 unfunded);
    event PrizePoolSet(address indexed prizePool);

    error ZeroAddress();
    error NotTheAsset();
    error NotThePrizePool();
    error PrizePoolAlreadySet();
    error PrizePoolNotSet();
    error NotASaver();
    error PeriodTooShort();
    error PeriodNotOver(uint32 period);
    error DrawNotAwarded(uint32 drawId);
    error EvaluationWindowClosed(uint32 drawId);
    error EvaluationWindowOpen(uint32 drawId);
    error BatchTooLarge(uint256 requested, uint256 allowed);
    error NoWeight(uint32 drawId);
    error HistoryLost(address saver, uint32 period);
    error AlreadyFinalized(uint32 drawId);
    error RenounceDisabled();

    /// @param asset_ The confidential ERC-7984 token savers deposit.
    /// @param periodLength_ Draw period in seconds, at least one minute.
    /// @param firstPeriodAt_ Timestamp at which period 1 starts.
    /// @param owner_ Account allowed to pause deposits and wire the prize pool.
    constructor(
        IERC7984 asset_,
        uint256 periodLength_,
        uint256 firstPeriodAt_,
        address owner_
    ) Ownable(owner_) {
        if (address(asset_) == address(0)) revert ZeroAddress();
        if (periodLength_ < 1 minutes) revert PeriodTooShort();

        asset = asset_;
        periodLength = periodLength_;
        firstPeriodAt = firstPeriodAt_;
        maxPrincipal = type(uint64).max / uint64(periodLength_);

        _total[0].cum = FHE.asEuint128(0);
        _total[0].balance = FHE.asEuint64(0);
        FHE.allowThis(_total[0].cum);
        FHE.allowThis(_total[0].balance);

        _unfunded = FHE.asEuint64(0);
        FHE.allowThis(_unfunded);
    }

    /// @notice Wires the prize pool. Once.
    function setPrizePool(IHearthPrizePool prizePool_) external onlyOwner {
        if (address(prizePool) != address(0)) revert PrizePoolAlreadySet();
        if (address(prizePool_) == address(0)) revert ZeroAddress();
        prizePool = prizePool_;
        emit PrizePoolSet(address(prizePool_));
    }

    /// @notice Stops new deposits and draw closing. Withdrawals and evaluation are never paused.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Returns a stray public ERC-20 to `to`. Savers' confidential balances cannot be touched:
    ///         the asset is not an ERC-20 and this function cannot move it.
    function rescueERC20(IERC20 token, address to) external onlyOwner {
        token.safeTransfer(to, token.balanceOf(address(this)));
    }

    /// @notice Deposit entry point, called by the token inside `confidentialTransferAndCall`.
    /// @dev `amount` is what the token actually moved, already clamped to the sender's balance. A deposit
    ///      that would push the saver above `maxPrincipal` is refused by returning an encrypted false, which
    ///      makes the token refund it in the same transaction. Emits Deposited whether or not the amount
    ///      was zero; the event carries no amount by design.
    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata
    ) external override whenNotPaused returns (ebool) {
        if (msg.sender != address(asset)) revert NotTheAsset();

        _register(from);

        euint64 grown = FHE.add(_principal[from], amount);
        ebool accepted = FHE.le(grown, maxPrincipal);
        euint64 principal = FHE.select(accepted, grown, _principal[from]);
        euint64 credited = FHE.select(accepted, amount, FHE.asEuint64(0));

        _principal[from] = principal;
        _grant(principal, from);
        _observe(from, principal);
        _observeTotal(FHE.add(_total[0].balance, credited));

        emit Deposited(from);

        FHE.allowThis(accepted);
        FHE.allowTransient(accepted, msg.sender);
        return accepted;
    }

    /// @notice Withdraws up to `encryptedAmount`, winnings first, then principal, clamped to the saver's total.
    /// @dev An oversized request returns everything instead of reverting, so a balance cannot be probed.
    ///      Reverts NotASaver for an address that never deposited. Emits Withdrawn.
    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof) external nonReentrant {
        if (!isSaver[msg.sender]) revert NotASaver();
        _withdraw(FHE.fromExternal(encryptedAmount, inputProof));
    }

    /// @notice Withdraws principal and winnings in full, without an encrypted input.
    function withdrawAll() external nonReentrant {
        if (!isSaver[msg.sender]) revert NotASaver();
        _withdraw(FHE.add(_principal[msg.sender], _winnings[msg.sender]));
    }

    /// @inheritdoc IHearthVault
    function aggregateFor(uint32 period) external returns (euint128) {
        if (msg.sender != address(prizePool)) revert NotThePrizePool();
        if (_currentPeriod() <= period) revert PeriodNotOver(period);

        euint128 weight = _totalWeight(period);
        FHE.allowThis(weight);
        FHE.makePubliclyDecryptable(weight);
        _aggregate[period] = weight;
        return weight;
    }

    /// @notice Runs the winner test of `drawId` for each of `savers` and credits encrypted winnings.
    /// @dev Anyone may call, any number of times, during period `drawId + 1`. A saver is evaluated once;
    ///      repeats and unknown addresses are skipped. Pulls the encrypted total credited from the pool.
    ///      Emits Evaluated per saver.
    function evaluate(uint32 drawId, address[] calldata savers) external nonReentrant {
        if (address(prizePool) == address(0)) revert PrizePoolNotSet();
        if (savers.length > MAX_BATCH) revert BatchTooLarge(savers.length, MAX_BATCH);
        if (_currentPeriod() != drawId + 1) revert EvaluationWindowClosed(drawId);

        IHearthPrizePool.DrawParams memory draw = prizePool.drawParams(drawId);
        if (draw.status != IHearthPrizePool.DrawStatus.Awarded) revert DrawNotAwarded(drawId);
        if (draw.aggregate == 0) revert NoWeight(drawId);

        euint64[3] storage remaining = _remaining[drawId];
        if (!_remainingSet[drawId]) _initRemaining(drawId, draw.offered);

        euint64 batchTotal = FHE.asEuint64(0);

        for (uint256 i = 0; i < savers.length; i++) {
            address saver = savers[i];
            if (!isSaver[saver] || evaluated[drawId][saver]) continue;

            euint64 twab = _weightOf(saver, drawId);
            euint64 credit = FHE.asEuint64(0);

            for (uint8 tier = 0; tier < TIERS; tier++) {
                uint256 r = UniformRandom.draw(
                    uint256(keccak256(abi.encode(draw.seed, drawId, saver, tier))),
                    draw.aggregate
                );
                uint256 threshold = (r * draw.zoneDiv[tier]) / draw.zoneMul[tier];
                if (threshold >= type(uint64).max) continue;

                ebool won = FHE.gt(twab, uint64(threshold));
                euint64 pay = FHE.select(won, FHE.min(remaining[tier], draw.prize[tier]), FHE.asEuint64(0));
                remaining[tier] = FHE.sub(remaining[tier], pay);
                credit = FHE.add(credit, pay);
            }

            _winnings[saver] = FHE.add(_winnings[saver], credit);
            _grant(_winnings[saver], saver);
            batchTotal = FHE.add(batchTotal, credit);

            evaluated[drawId][saver] = true;
            emit Evaluated(saver, drawId);
        }

        for (uint8 tier = 0; tier < TIERS; tier++) {
            FHE.allowThis(remaining[tier]);
        }

        FHE.allowThis(batchTotal);
        FHE.allowTransient(batchTotal, address(prizePool));
        euint64 sent = prizePool.fund(batchTotal);

        _unfunded = FHE.add(_unfunded, FHE.sub(batchTotal, sent));
        FHE.allowThis(_unfunded);
    }

    /// @notice Publishes the unpaid remainder of each tier once the evaluation window of `drawId` is over.
    /// @dev Anyone may call. The prize pool verifies the decrypted remainders in `reconcile`.
    function finalizeDraw(uint32 drawId) external {
        if (finalized[drawId]) revert AlreadyFinalized(drawId);
        if (_currentPeriod() <= drawId + 1) revert EvaluationWindowOpen(drawId);

        IHearthPrizePool.DrawParams memory draw = prizePool.drawParams(drawId);
        if (draw.status != IHearthPrizePool.DrawStatus.Awarded) revert DrawNotAwarded(drawId);
        if (!_remainingSet[drawId]) _initRemaining(drawId, draw.offered);

        euint64[3] storage remaining = _remaining[drawId];
        for (uint8 tier = 0; tier < TIERS; tier++) {
            FHE.makePubliclyDecryptable(remaining[tier]);
        }
        FHE.makePubliclyDecryptable(_unfunded);

        finalized[drawId] = true;
        emit DrawFinalized(drawId, remaining, _unfunded);
    }

    /// @inheritdoc IHearthVault
    function remainingHandles(uint32 drawId) external view returns (euint64[3] memory) {
        return _remaining[drawId];
    }

    /// @notice Encrypted principal of `saver`; decryptable by the saver only.
    function confidentialBalanceOf(address saver) external view returns (euint64) {
        return _principal[saver];
    }

    /// @notice Encrypted unclaimed winnings of `saver`; decryptable by the saver only.
    function confidentialWinningsOf(address saver) external view returns (euint64) {
        return _winnings[saver];
    }

    /// @notice The saver's newest (`slot` 0) or previous-period (`slot` 1) observation.
    function observationOf(address saver, uint8 slot) external view returns (euint64 cum, euint64 balance, uint32 ts) {
        Observation storage obs = _observations[saver][slot];
        return (obs.cum, obs.balance, obs.ts);
    }

    /// @notice Encrypted aggregate weight of `period`, set when the prize pool closed that draw.
    function aggregateHandle(uint32 period) external view returns (euint128) {
        return _aggregate[period];
    }

    function unfundedHandle() external view returns (euint64) {
        return _unfunded;
    }

    function saverCount() external view returns (uint256) {
        return _savers.length;
    }

    function saverAt(uint256 index) external view returns (address) {
        return _savers[index];
    }

    function currentPeriod() external view returns (uint32) {
        return _currentPeriod();
    }

    function periodOf(uint256 timestamp) external view returns (uint32) {
        return Periods.periodOf(timestamp, firstPeriodAt, periodLength);
    }

    function periodEnd(uint32 period) external view returns (uint256) {
        return Periods.endOf(period, firstPeriodAt, periodLength);
    }

    /// @notice Disabled: the vault must always have an owner able to pause deposits in an incident.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    function _withdraw(euint64 requested) private {
        address saver = msg.sender;
        euint64 winnings = _winnings[saver];
        euint64 principal = _principal[saver];

        euint64 available = FHE.add(principal, winnings);
        euint64 amount = FHE.min(requested, available);
        euint64 fromWinnings = FHE.min(amount, winnings);
        euint64 fromPrincipal = FHE.sub(amount, fromWinnings);

        principal = FHE.sub(principal, fromPrincipal);
        _principal[saver] = principal;
        _grant(principal, saver);
        _observe(saver, principal);
        _observeTotal(FHE.sub(_total[0].balance, fromPrincipal));

        FHE.allowTransient(amount, address(asset));
        euint64 sent = asset.confidentialTransfer(saver, amount);

        // The token clamps to the vault's balance. A shortfall means the pool failed to back winnings;
        // it is kept in the winnings bucket so principal accounting stays exact.
        euint64 shortfall = FHE.sub(amount, sent);
        _winnings[saver] = FHE.add(FHE.sub(winnings, fromWinnings), shortfall);
        _grant(_winnings[saver], saver);

        emit Withdrawn(saver);
    }

    function _register(address saver) private {
        if (isSaver[saver]) return;
        isSaver[saver] = true;
        _savers.push(saver);
        _principal[saver] = FHE.asEuint64(0);
        _winnings[saver] = FHE.asEuint64(0);
        _grant(_principal[saver], saver);
        _grant(_winnings[saver], saver);
    }

    /// @dev Records `newBalance` for `saver` at the current time, keeping the previous period's last
    ///      observation so that the just-finished period can still be evaluated.
    function _observe(address saver, euint64 newBalance) private {
        Observation storage current = _observations[saver][0];
        uint32 now32 = uint32(block.timestamp);
        uint32 period = _currentPeriod();

        if (current.ts == 0) {
            current.cum = FHE.asEuint64(0);
        } else if (Periods.periodOf(current.ts, firstPeriodAt, periodLength) == period) {
            current.cum = FHE.add(current.cum, FHE.mul(current.balance, uint64(now32 - current.ts)));
        } else {
            _observations[saver][1] = current;
            uint256 start = Periods.startOf(period, firstPeriodAt, periodLength);
            current.cum = FHE.mul(current.balance, uint64(block.timestamp - start));
        }

        current.balance = newBalance;
        current.ts = now32;
        FHE.allowThis(current.cum);
        FHE.allow(current.cum, saver);
    }

    function _observeTotal(euint64 newBalance) private {
        TotalObservation storage current = _total[0];
        uint32 now32 = uint32(block.timestamp);
        uint32 period = _currentPeriod();

        if (current.ts == 0) {
            current.cum = FHE.asEuint128(0);
        } else if (Periods.periodOf(current.ts, firstPeriodAt, periodLength) == period) {
            current.cum = FHE.add(current.cum, FHE.mul(FHE.asEuint128(current.balance), uint128(now32 - current.ts)));
        } else {
            _total[1] = current;
            uint256 start = Periods.startOf(period, firstPeriodAt, periodLength);
            current.cum = FHE.mul(FHE.asEuint128(current.balance), uint128(block.timestamp - start));
        }

        current.balance = newBalance;
        current.ts = now32;
        FHE.allowThis(current.cum);
        FHE.allowThis(current.balance);
    }

    /// @dev Time-weighted balance of `saver` over `period`, valid while period `period + 1` runs.
    function _weightOf(address saver, uint32 period) private returns (euint64) {
        Observation storage current = _observations[saver][0];
        if (current.ts == 0) return FHE.asEuint64(0);

        uint32 currentPeriod_ = Periods.periodOf(current.ts, firstPeriodAt, periodLength);
        if (currentPeriod_ <= period) return _weightFrom(current, currentPeriod_, period);

        Observation storage previous = _observations[saver][1];
        if (previous.ts == 0) return FHE.asEuint64(0);

        uint32 previousPeriod = Periods.periodOf(previous.ts, firstPeriodAt, periodLength);
        if (previousPeriod <= period) return _weightFrom(previous, previousPeriod, period);

        revert HistoryLost(saver, period);
    }

    function _weightFrom(Observation storage obs, uint32 obsPeriod, uint32 period) private returns (euint64) {
        if (obsPeriod == period) {
            uint256 end = Periods.endOf(period, firstPeriodAt, periodLength);
            return FHE.add(obs.cum, FHE.mul(obs.balance, uint64(end - obs.ts)));
        }
        return FHE.mul(obs.balance, uint64(periodLength));
    }

    function _totalWeight(uint32 period) private returns (euint128) {
        TotalObservation storage current = _total[0];
        if (current.ts == 0) return FHE.asEuint128(0);

        uint32 currentPeriod_ = Periods.periodOf(current.ts, firstPeriodAt, periodLength);
        if (currentPeriod_ <= period) return _totalWeightFrom(current, currentPeriod_, period);

        TotalObservation storage previous = _total[1];
        if (previous.ts == 0) return FHE.asEuint128(0);

        uint32 previousPeriod = Periods.periodOf(previous.ts, firstPeriodAt, periodLength);
        if (previousPeriod <= period) return _totalWeightFrom(previous, previousPeriod, period);

        revert HistoryLost(address(this), period);
    }

    function _totalWeightFrom(
        TotalObservation storage obs,
        uint32 obsPeriod,
        uint32 period
    ) private returns (euint128) {
        if (obsPeriod == period) {
            uint256 end = Periods.endOf(period, firstPeriodAt, periodLength);
            return FHE.add(obs.cum, FHE.mul(FHE.asEuint128(obs.balance), uint128(end - obs.ts)));
        }
        return FHE.mul(FHE.asEuint128(obs.balance), uint128(periodLength));
    }

    function _initRemaining(uint32 drawId, uint64[3] memory offered) private {
        euint64[3] storage remaining = _remaining[drawId];
        for (uint8 tier = 0; tier < TIERS; tier++) {
            remaining[tier] = FHE.asEuint64(offered[tier]);
            FHE.allowThis(remaining[tier]);
        }
        _remainingSet[drawId] = true;
    }

    function _grant(euint64 handle, address saver) private {
        FHE.allowThis(handle);
        FHE.allow(handle, saver);
    }

    function _currentPeriod() private view returns (uint32) {
        return Periods.periodOf(block.timestamp, firstPeriodAt, periodLength);
    }
}
