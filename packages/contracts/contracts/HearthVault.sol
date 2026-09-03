// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint8, euint64, euint128, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
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

/// @title HearthVault
/// @notice Holds savers' confidential USDC, keeps every balance and time-weighted balance encrypted,
///         runs the winner test for each saver over those encrypted values, and pays out.
/// @dev Deposits arrive through the ERC-7984 receive hook. The only exits are `withdraw` and
///      `withdrawAll`, which pay winnings first and principal second in one confidential transfer, so a
///      winner's exit is indistinguishable from anyone else's. The draw schedule lives here
///      (`periodLength`, `firstPeriodAt`); the prize pool reads it. Evaluation walks the saver list from a
///      seed-derived start, so nobody chooses who is evaluated or in what order. Nothing in this contract
///      branches on a secret.
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

    /// @dev What a saver was evaluated on and what they won in one draw, both readable by that saver only.
    struct Outcome {
        euint64 weight;
        euint64 credit;
    }

    /// @dev How the aggregate weight of a period compared against the pool's tracked scale bracket.
    struct Scale {
        euint8 count;
        ebool nonEmpty;
    }

    /// @dev A tier's unpaid liquidity, riding along encrypted until the tier's reconcile cadence is due.
    ///      `publishedHandle` is pinned at publication so a later fold cannot change what the pool books.
    struct Carry {
        euint64 balance;
        euint64 publishedHandle;
        uint32 publishedAt;
        bool pending;
    }

    /// @dev Everything one draw needs on this side: where its evaluation walk starts, how far it has got,
    ///      and what each tier still has to give.
    struct DrawState {
        uint32 start;
        uint32 length;
        uint32 cursor;
        uint32 evaluated;
        bool opened;
        bool finalized;
        euint64[3] remaining;
    }

    uint8 public constant TIERS = 3;

    /// @notice Observations kept per saver and for the total. Three slots cover the newest observation at or
    ///         before any draw inside its two-period window, because at most two later periods can have
    ///         started and so at most two newer observations can have been pushed.
    uint8 public constant SLOTS = 3;

    /// @notice How many powers of two the aggregate weight is compared against at each close.
    uint8 public constant SCALE_PROBES = 5;

    /// @notice Savers needing encrypted work per `evaluate` call.
    /// @dev Measured with `fhevm.computeTransactionHCU` against the mock coprocessor's price table,
    ///      not on Sepolia, using the Sepolia tier parameters (prize counts 1, 1 and 4
    ///      at odds 1/24, 1/6 and 1): 748,032 homomorphic compute units of fixed cost per call plus
    ///      3,674,128 per saver. Four savers cost 15,444,544 units at a handle depth of 3,240,000, and
    ///      every further saver adds 381,000 to that depth through the tier remainder chain. The
    ///      coprocessor caps one transaction at 20,000,000 units and 5,000,000 of depth; Hearth budgets
    ///      18,000,000 and 4,500,000 so a heavier tier set still fits. Five savers cost 19,118,672, over
    ///      that budget, so the batch stops at four and the next call resumes from the cursor.
    uint256 public constant MAX_BATCH = 4;

    IERC7984 public immutable asset;
    uint256 public immutable periodLength;
    uint256 public immutable firstPeriodAt;

    /// @notice Largest principal a saver may hold, so that balance times period seconds fits 64 bits.
    uint64 public immutable maxPrincipal;

    IHearthPrizePool public prizePool;

    mapping(address saver => euint64) private _principal;
    mapping(address saver => euint64) private _winnings;
    mapping(address saver => Observation[3]) private _observations;
    TotalObservation[3] private _total;
    mapping(uint32 period => Scale) private _scale;

    address[] private _savers;
    mapping(address saver => bool) public isSaver;

    /// @notice When `saver` first deposited, so evaluation can skip savers who joined after a draw's period.
    mapping(address saver => uint32) public firstObservationAt;

    mapping(uint32 drawId => mapping(address saver => bool)) public evaluated;
    mapping(uint32 drawId => mapping(address saver => Outcome)) private _outcomes;
    mapping(uint32 drawId => DrawState) private _draws;
    Carry[3] private _carry;

    /// @dev Winnings credited that the pool failed to back. Always zero when the pool is solvent;
    ///      published at every finalization so anyone can check.
    euint64 private _unfunded;

    event Deposited(address indexed saver);
    event Withdrawn(address indexed saver);
    event Evaluated(address indexed saver, uint32 indexed drawId);
    event DrawFinalized(uint32 indexed drawId, euint64 unfunded);
    event CarryPublished(uint32 indexed drawId, uint8 indexed tier, euint64 carryHandle);
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
    error DrawAlreadyOpen(uint32 drawId);
    error DrawNotOpen(uint32 drawId);
    error EvaluationWindowClosed(uint32 drawId);
    error EvaluationWindowOpen(uint32 drawId);
    error InvalidTier(uint8 tier);
    error InvalidPrizeIndex(uint8 tier, uint32 index);
    error CarryNotPending(uint8 tier);
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

        for (uint8 tier = 0; tier < TIERS; tier++) {
            _carry[tier].balance = FHE.asEuint64(0);
            FHE.allowThis(_carry[tier].balance);
        }

        _unfunded = FHE.asEuint64(0);
        FHE.allowThis(_unfunded);
    }

    /// @notice Wires the prize pool. Once.
    /// @dev Reverts PrizePoolAlreadySet on a second call and ZeroAddress for the zero address. Emits
    ///      PrizePoolSet.
    function setPrizePool(IHearthPrizePool prizePool_) external onlyOwner {
        if (address(prizePool) != address(0)) revert PrizePoolAlreadySet();
        if (address(prizePool_) == address(0)) revert ZeroAddress();
        prizePool = prizePool_;
        emit PrizePoolSet(address(prizePool_));
    }

    /// @notice Stops new deposits. Withdrawals, evaluation and finalization are never paused. Draw
    ///         closing is stopped by the prize pool's own pause, which is a separate lever.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Lets deposits resume.
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
    ///      that would push the saver above `maxPrincipal`, or that is itself above it, is refused by
    ///      returning an encrypted false, which makes the token refund it in the same transaction. Both
    ///      halves of that test are needed: the sum alone can wrap 64 bits for an amount near the token's
    ///      maximum and then read as acceptable. Reverts NotTheAsset for any other caller and
    ///      EnforcedPause while paused. Emits Deposited whether or not the amount was zero; the event
    ///      carries no amount by design.
    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata
    ) external override whenNotPaused returns (ebool) {
        if (msg.sender != address(asset)) revert NotTheAsset();

        _register(from);

        euint64 grown = FHE.add(_principal[from], amount);
        ebool accepted = FHE.and(FHE.le(amount, maxPrincipal), FHE.le(grown, maxPrincipal));
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

    /// @notice Withdraws up to `encryptedAmount`, winnings first, then principal, clamped to the saver's
    ///         total and to what the vault itself holds.
    /// @dev An oversized request returns everything instead of reverting, so a balance cannot be probed.
    ///      Reverts NotASaver for an address that never deposited. Emits Withdrawn.
    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof) external nonReentrant {
        if (!isSaver[msg.sender]) revert NotASaver();
        _withdraw(FHE.fromExternal(encryptedAmount, inputProof));
    }

    /// @notice Withdraws principal and winnings in full, without an encrypted input.
    /// @dev Reverts NotASaver for an address that never deposited. Emits Withdrawn.
    function withdrawAll() external nonReentrant {
        if (!isSaver[msg.sender]) revert NotASaver();
        _withdraw(FHE.add(_principal[msg.sender], _winnings[msg.sender]));
    }

    /// @inheritdoc IHearthVault
    /// @dev Reverts NotThePrizePool for any other caller, PeriodNotOver while `period` is still running,
    ///      and HistoryLost if the total observations no longer reach back to `period`, which cannot
    ///      happen inside the two-period window.
    function scaleFor(uint32 period, uint8 bits) external returns (euint8 count, ebool nonEmpty) {
        if (msg.sender != address(prizePool)) revert NotThePrizePool();
        if (_currentPeriod() <= period) revert PeriodNotOver(period);

        euint128 weight = _totalWeight(period);
        nonEmpty = FHE.gt(weight, uint128(0));

        euint8[SCALE_PROBES] memory cleared;
        for (uint256 probe = 0; probe < SCALE_PROBES; probe++) {
            int256 exponent = int256(uint256(bits)) - 2 + int256(probe);
            // A non-positive exponent asks whether the pool holds anything at all, and 126 is as far as a
            // 128-bit aggregate can reach, so both ends of the bracket stay inside the type.
            uint8 shift = 0;
            if (exponent > 126) shift = 126;
            else if (exponent > 0) shift = uint8(uint256(exponent));
            cleared[probe] = FHE.asEuint8(FHE.ge(weight, uint128(1) << shift));
        }
        // Summed as a tree so the handle chain is three deep rather than five.
        count = FHE.add(FHE.add(FHE.add(cleared[0], cleared[1]), FHE.add(cleared[2], cleared[3])), cleared[4]);

        FHE.allowThis(count);
        FHE.allowThis(nonEmpty);
        FHE.makePubliclyDecryptable(count);
        FHE.makePubliclyDecryptable(nonEmpty);
        _scale[period] = Scale(count, nonEmpty);
    }

    /// @inheritdoc IHearthVault
    /// @dev A tier whose carry is awaiting reconciliation keeps it: folding a published amount into a draw
    ///      would let the pool book liquidity that has already been offered again. Reverts
    ///      NotThePrizePool for any other caller and DrawAlreadyOpen on a repeat.
    function openDraw(uint32 drawId, uint64[3] calldata offered) external {
        if (msg.sender != address(prizePool)) revert NotThePrizePool();
        DrawState storage state = _draws[drawId];
        if (state.opened) revert DrawAlreadyOpen(drawId);

        for (uint8 tier = 0; tier < TIERS; tier++) {
            euint64 available = FHE.asEuint64(offered[tier]);
            if (!_carry[tier].pending) {
                available = FHE.add(available, _carry[tier].balance);
                _carry[tier].balance = FHE.asEuint64(0);
                FHE.allowThis(_carry[tier].balance);
            }
            state.remaining[tier] = available;
            FHE.allowThis(available);
        }
        state.opened = true;
    }

    /// @inheritdoc IHearthVault
    /// @dev Nothing was paid, so what the draw holds is exactly `offered` plus whatever carry was folded
    ///      in at the open. The plaintext half goes back to the pool's liquidity and the encrypted half
    ///      back to the carry. Reverts NotThePrizePool for any other caller, DrawNotOpen for a draw that
    ///      was never opened and AlreadyFinalized on a repeat.
    function abandonDraw(uint32 drawId, uint64[3] calldata offered) external {
        if (msg.sender != address(prizePool)) revert NotThePrizePool();
        DrawState storage state = _draws[drawId];
        if (!state.opened) revert DrawNotOpen(drawId);
        if (state.finalized) revert AlreadyFinalized(drawId);

        for (uint8 tier = 0; tier < TIERS; tier++) {
            _carry[tier].balance = FHE.add(_carry[tier].balance, FHE.sub(state.remaining[tier], offered[tier]));
            FHE.allowThis(_carry[tier].balance);
            state.remaining[tier] = FHE.asEuint64(0);
            FHE.allowThis(state.remaining[tier]);
        }
        state.finalized = true;
    }

    /// @inheritdoc IHearthVault
    /// @dev The carry may have grown since publication, so the verified amount is subtracted rather than
    ///      the balance zeroed. Reverts NotThePrizePool for any other caller and CarryNotPending when
    ///      that tier has nothing awaiting reconciliation, which is the replay guard.
    function consumeCarry(uint8 tier, uint64 amount) external {
        if (msg.sender != address(prizePool)) revert NotThePrizePool();
        if (tier >= TIERS) revert InvalidTier(tier);
        if (!_carry[tier].pending) revert CarryNotPending(tier);

        _carry[tier].balance = FHE.sub(_carry[tier].balance, amount);
        _carry[tier].pending = false;
        FHE.allowThis(_carry[tier].balance);
    }

    /// @notice Advances the evaluation walk of `drawId` by up to `count` savers, crediting each one what
    ///         the published thresholds say they won.
    /// @dev Anyone may call, any number of times, inside the draw's window of periods `drawId + 1` and
    ///      `drawId + 2`. The walk starts at `seed mod saverCount` and runs the list in order, so the
    ///      caller chooses how many savers to advance but never which ones, and a saver who advances the
    ///      walk to reach themselves is doing what the keeper does. Savers with no observation at or
    ///      before the draw's period are marked done in plaintext at no encrypted cost. At most
    ///      `MAX_BATCH` savers per call need encrypted work; the call stops there and the next call
    ///      resumes from the cursor. Reverts PrizePoolNotSet, EvaluationWindowClosed outside the window,
    ///      and DrawNotAwarded for a draw that is None, Closed, Empty or Skipped. Pulls the encrypted
    ///      total credited from the pool. Emits Evaluated per saver.
    function evaluate(uint32 drawId, uint256 count) external nonReentrant {
        if (address(prizePool) == address(0)) revert PrizePoolNotSet();
        uint32 period = _currentPeriod();
        if (period < drawId + 1 || period > drawId + 2) revert EvaluationWindowClosed(drawId);

        IHearthPrizePool.DrawParams memory draw = prizePool.drawParams(drawId);
        if (draw.status != IHearthPrizePool.DrawStatus.Awarded) revert DrawNotAwarded(drawId);

        DrawState storage state = _draws[drawId];
        if (state.length == 0) {
            uint256 total = _savers.length;
            if (total == 0) return;
            state.length = uint32(total);
            state.start = uint32(draw.seed % total);
        }
        _walk(draw, drawId, state, count);
    }

    /// @notice Folds every tier's unpaid remainder into that tier's carry once the window of `drawId` is
    ///         over, and publishes the carry of each tier whose reconcile cadence is due.
    /// @dev Anyone may call, once per draw, after period `drawId + 2`. Reverts AlreadyFinalized on a
    ///      repeat or for a draw that was abandoned, EvaluationWindowOpen before the window ends,
    ///      DrawNotOpen for a draw that was never closed, and DrawNotAwarded for a draw whose award has
    ///      not landed yet. That last one matters: awarding is what books the draw's harvest, and a draw
    ///      folded into the carries first could never be awarded afterwards, because the award's own
    ///      hand-back would find the draw already finalized. Emits CarryPublished for each due tier and
    ///      DrawFinalized.
    function finalizeDraw(uint32 drawId) external {
        DrawState storage state = _draws[drawId];
        if (state.finalized) revert AlreadyFinalized(drawId);
        if (!state.opened) revert DrawNotOpen(drawId);
        if (_currentPeriod() <= drawId + 2) revert EvaluationWindowOpen(drawId);
        if (prizePool.drawParams(drawId).status != IHearthPrizePool.DrawStatus.Awarded) {
            revert DrawNotAwarded(drawId);
        }

        for (uint8 tier = 0; tier < TIERS; tier++) {
            Carry storage carry = _carry[tier];
            carry.balance = FHE.add(carry.balance, state.remaining[tier]);
            FHE.allowThis(carry.balance);

            if (drawId % prizePool.reconcileEvery(tier) == 0 && !carry.pending) {
                FHE.makePubliclyDecryptable(carry.balance);
                carry.publishedHandle = carry.balance;
                carry.publishedAt = drawId;
                carry.pending = true;
                emit CarryPublished(drawId, tier, carry.balance);
            }
        }

        FHE.makePubliclyDecryptable(_unfunded);
        state.finalized = true;
        emit DrawFinalized(drawId, _unfunded);
    }

    /// @inheritdoc IHearthVault
    function remainingHandles(uint32 drawId) external view returns (euint64[3] memory) {
        return _draws[drawId].remaining;
    }

    /// @inheritdoc IHearthVault
    function publishedCarry(uint8 tier) external view returns (euint64 handle, uint32 publishedAt, bool pending) {
        Carry storage carry = _carry[tier];
        return (carry.publishedHandle, carry.publishedAt, carry.pending);
    }

    /// @notice The encrypted liquidity `tier` is carrying into future draws.
    function carryHandle(uint8 tier) external view returns (euint64) {
        return _carry[tier].balance;
    }

    /// @notice The scale comparison the vault published for `period`: how many thresholds the aggregate
    ///         cleared, and whether anyone held a balance at all.
    function scaleHandles(uint32 period) external view returns (euint8 count, ebool nonEmpty) {
        Scale storage scale = _scale[period];
        return (scale.count, scale.nonEmpty);
    }

    /// @notice The public threshold prize `index` of `tier` sets for `saver` in `drawId`.
    /// @dev The same arithmetic evaluation runs, so a judge or the app's verify page can recompute any
    ///      outcome from public data and the saver's own decrypted weight: the saver won this prize
    ///      exactly when their weight is strictly above `threshold`. Reverts DrawNotAwarded unless the
    ///      draw is awarded, InvalidTier above the last tier and InvalidPrizeIndex above the tier's
    ///      prize count.
    /// @return threshold The weight a saver must exceed to win this prize.
    /// @return skipped True when the threshold is out of 64-bit range, so no weight can ever pass it and
    ///         evaluation stops the tier here.
    function thresholdOf(
        uint32 drawId,
        address saver,
        uint8 tier,
        uint32 index
    ) external view returns (uint256 threshold, bool skipped) {
        if (address(prizePool) == address(0)) revert PrizePoolNotSet();
        if (tier >= TIERS) revert InvalidTier(tier);

        IHearthPrizePool.DrawParams memory draw = prizePool.drawParams(drawId);
        if (draw.status != IHearthPrizePool.DrawStatus.Awarded) revert DrawNotAwarded(drawId);
        if (index >= draw.prizeCount[tier]) revert InvalidPrizeIndex(tier, index);

        return _thresholdOf(draw, drawId, saver, tier, index);
    }

    /// @notice Encrypted principal of `saver`; decryptable by the saver only.
    function confidentialBalanceOf(address saver) external view returns (euint64) {
        return _principal[saver];
    }

    /// @notice Encrypted unclaimed winnings of `saver`; decryptable by the saver only.
    function confidentialWinningsOf(address saver) external view returns (euint64) {
        return _winnings[saver];
    }

    /// @notice The time-weighted balance `saver` was evaluated on for `drawId`; decryptable by that saver
    ///         only, so they can check it against the published thresholds themselves.
    function weightHandle(uint32 drawId, address saver) external view returns (euint64) {
        return _outcomes[drawId][saver].weight;
    }

    /// @notice What `saver` won in `drawId`; decryptable by that saver only.
    function creditHandle(uint32 drawId, address saver) external view returns (euint64) {
        return _outcomes[drawId][saver].credit;
    }

    /// @notice One of the saver's three observations: slot 0 is the newest, slot 2 the oldest kept.
    function observationOf(address saver, uint8 slot) external view returns (euint64 cum, euint64 balance, uint32 ts) {
        Observation storage obs = _observations[saver][slot];
        return (obs.cum, obs.balance, obs.ts);
    }

    /// @notice Winnings credited that the prize pool failed to back. Zero whenever the pool is solvent.
    function unfundedHandle() external view returns (euint64) {
        return _unfunded;
    }

    /// @notice How many savers have been marked done for `drawId`, so the app can show progress.
    function evaluatedCount(uint32 drawId) external view returns (uint32) {
        return _draws[drawId].evaluated;
    }

    /// @notice How far the evaluation walk of `drawId` has advanced.
    function cursorOf(uint32 drawId) external view returns (uint32) {
        return _draws[drawId].cursor;
    }

    /// @notice Where the evaluation walk of `drawId` starts and how many savers it covers.
    /// @dev Both are zero until the first `evaluate` call fixes them from the seed and the saver count.
    /// @return start Index in the saver list the walk begins at.
    /// @return count How many savers the walk covers. Named `count` rather than `length`, which
    ///         collides with a tuple's own `length` in generated TypeScript clients and makes the
    ///         return type unusable there.
    function walkOf(uint32 drawId) external view returns (uint32 start, uint32 count) {
        DrawState storage state = _draws[drawId];
        return (state.start, state.length);
    }

    /// @inheritdoc IHearthVault
    function finalized(uint32 drawId) external view returns (bool) {
        return _draws[drawId].finalized;
    }

    /// @notice True once the prize pool has moved a draw's liquidity into this vault.
    function opened(uint32 drawId) external view returns (bool) {
        return _draws[drawId].opened;
    }

    /// @notice How many addresses have ever deposited. The list is never pruned.
    function saverCount() external view returns (uint256) {
        return _savers.length;
    }

    /// @notice The saver at `index` in the list evaluation walks.
    function saverAt(uint256 index) external view returns (address) {
        return _savers[index];
    }

    /// @notice The period the chain is in right now.
    function currentPeriod() external view returns (uint32) {
        return _currentPeriod();
    }

    /// @notice The period `timestamp` falls in. Anything before `firstPeriodAt` is period zero.
    function periodOf(uint256 timestamp) external view returns (uint32) {
        return Periods.periodOf(timestamp, firstPeriodAt, periodLength);
    }

    /// @notice The first second of the period after `period`.
    function periodEnd(uint32 period) external view returns (uint256) {
        return Periods.endOf(period, firstPeriodAt, periodLength);
    }

    /// @notice Last moment at which `drawId` can still be evaluated; finalization opens after it.
    function windowEndsAt(uint32 drawId) external view returns (uint256) {
        return Periods.endOf(drawId + 2, firstPeriodAt, periodLength);
    }

    /// @notice Disabled: the vault must always have an owner able to pause deposits in an incident.
    function renounceOwnership() public view override onlyOwner {
        revert RenounceDisabled();
    }

    /// @dev Runs one batch of the draw's walk. Split out of `evaluate` so the window and status checks
    ///      stay readable next to the loop that does the encrypted work.
    function _walk(
        IHearthPrizePool.DrawParams memory draw,
        uint32 drawId,
        DrawState storage state,
        uint256 count
    ) private {
        uint256 length = state.length;
        uint256 index = state.cursor;
        uint256 processed;
        uint256 heavy;
        uint32 marked;
        euint64 batchTotal;

        while (index < length && processed < count && heavy < MAX_BATCH) {
            address saver = _savers[(uint256(state.start) + index) % length];
            index++;
            processed++;
            if (evaluated[drawId][saver]) continue;

            evaluated[drawId][saver] = true;
            marked++;
            emit Evaluated(saver, drawId);
            if (Periods.periodOf(firstObservationAt[saver], firstPeriodAt, periodLength) > drawId) continue;

            heavy++;
            euint64 twab = _weightOf(saver, drawId);
            euint64 credit = _winnerTest(draw, state.remaining, drawId, saver, twab);

            _winnings[saver] = FHE.add(_winnings[saver], credit);
            _grant(_winnings[saver], saver);
            _outcomes[drawId][saver] = Outcome(twab, credit);
            _grant(twab, saver);
            _grant(credit, saver);
            batchTotal = heavy == 1 ? credit : FHE.add(batchTotal, credit);
        }

        state.cursor = uint32(index);
        state.evaluated += marked;
        if (heavy == 0) return;

        for (uint8 tier = 0; tier < TIERS; tier++) {
            FHE.allowThis(state.remaining[tier]);
        }

        FHE.allowThis(batchTotal);
        FHE.allowTransient(batchTotal, address(prizePool));
        euint64 sent = prizePool.fund(batchTotal);

        _unfunded = FHE.add(_unfunded, FHE.sub(batchTotal, sent));
        FHE.allowThis(_unfunded);
    }

    function _withdraw(euint64 requested) private {
        address saver = msg.sender;
        euint64 winnings = _winnings[saver];
        euint64 principal = _principal[saver];

        // An ERC-7984 transfer moves the whole amount or nothing, so the vault has to clamp to its own
        // confidential balance itself. Without this a saver whose winnings the pool failed to back would
        // ask for more than the vault holds and get nothing at all.
        euint64 available = FHE.add(principal, winnings);
        euint64 amount = FHE.min(FHE.min(requested, available), asset.confidentialBalanceOf(address(this)));
        euint64 fromWinnings = FHE.min(amount, winnings);
        euint64 fromPrincipal = FHE.sub(amount, fromWinnings);

        principal = FHE.sub(principal, fromPrincipal);
        _principal[saver] = principal;
        _grant(principal, saver);
        _winnings[saver] = FHE.sub(winnings, fromWinnings);
        _grant(_winnings[saver], saver);
        _observe(saver, principal);
        _observeTotal(FHE.sub(_total[0].balance, fromPrincipal));

        FHE.allowTransient(amount, address(asset));
        asset.confidentialTransfer(saver, amount);

        emit Withdrawn(saver);
    }

    function _register(address saver) private {
        if (isSaver[saver]) return;
        isSaver[saver] = true;
        firstObservationAt[saver] = uint32(block.timestamp);
        _savers.push(saver);
        _principal[saver] = FHE.asEuint64(0);
        _winnings[saver] = FHE.asEuint64(0);
        _grant(_principal[saver], saver);
        _grant(_winnings[saver], saver);
    }

    /// @dev Records `newBalance` for `saver` at the current time. A change in a later period pushes the
    ///      older observations down a slot, so the two periods of a draw's window can still be weighed.
    function _observe(address saver, euint64 newBalance) private {
        Observation storage current = _observations[saver][0];
        uint32 now32 = uint32(block.timestamp);
        uint32 period = _currentPeriod();

        if (current.ts == 0) {
            current.cum = FHE.asEuint64(0);
        } else if (Periods.periodOf(current.ts, firstPeriodAt, periodLength) == period) {
            current.cum = FHE.add(current.cum, FHE.mul(current.balance, uint64(now32 - current.ts)));
        } else {
            _observations[saver][2] = _observations[saver][1];
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
            _total[2] = _total[1];
            _total[1] = current;
            uint256 start = Periods.startOf(period, firstPeriodAt, periodLength);
            current.cum = FHE.mul(FHE.asEuint128(current.balance), uint128(block.timestamp - start));
        }

        current.balance = newBalance;
        current.ts = now32;
        FHE.allowThis(current.cum);
        FHE.allowThis(current.balance);
    }

    /// @dev Runs the nested-threshold winner test of `draw` for one saver and returns the encrypted credit.
    ///      A tier gives `prizeCount` shots at rising public thresholds, so the number of prizes won is the
    ///      floor or the ceiling of `twab * odds * prizeCount / M`, capped at `prizeCount`, which is linear
    ///      in the saver's share and gains nothing from splitting a balance across wallets. What the tier
    ///      still has to give is the only cap, applied in walk order.
    function _winnerTest(
        IHearthPrizePool.DrawParams memory draw,
        euint64[3] storage remaining,
        uint32 drawId,
        address saver,
        euint64 twab
    ) private returns (euint64 credit) {
        euint64 zero = FHE.asEuint64(0);

        for (uint8 tier = 0; tier < TIERS; tier++) {
            euint64 prize = FHE.asEuint64(draw.prize[tier]);
            euint64 tierPay = zero;

            for (uint32 index = 0; index < draw.prizeCount[tier]; index++) {
                (uint256 threshold, bool skipped) = _thresholdOf(draw, drawId, saver, tier, index);
                // Thresholds rise with the prize index, so once one is out of range no weight passes it.
                if (skipped) break;
                euint64 shot = FHE.select(FHE.gt(twab, uint64(threshold)), prize, zero);
                tierPay = index == 0 ? shot : FHE.add(tierPay, shot);
            }

            euint64 pay = FHE.min(remaining[tier], tierPay);
            remaining[tier] = FHE.sub(remaining[tier], pay);
            credit = tier == 0 ? pay : FHE.add(credit, pay);
        }
    }

    /// @dev Time-weighted balance of `saver` over `period`, read from the newest observation at or before
    ///      it. A saver whose kept history starts after `period` held nothing back then, so the answer is
    ///      a plaintext zero at no encrypted cost. It never reverts, because one saver with a gap in their
    ///      history must not be able to stall the walk for everybody else.
    function _weightOf(address saver, uint32 period) private returns (euint64) {
        Observation[3] storage slots = _observations[saver];
        for (uint8 slot = 0; slot < SLOTS; slot++) {
            Observation storage obs = slots[slot];
            if (obs.ts == 0) return FHE.asEuint64(0);
            uint32 obsPeriod = Periods.periodOf(obs.ts, firstPeriodAt, periodLength);
            if (obsPeriod <= period) return _weightFrom(obs, obsPeriod, period);
        }
        return FHE.asEuint64(0);
    }

    function _weightFrom(Observation storage obs, uint32 obsPeriod, uint32 period) private returns (euint64) {
        if (obsPeriod == period) {
            uint256 end = Periods.endOf(period, firstPeriodAt, periodLength);
            return FHE.add(obs.cum, FHE.mul(obs.balance, uint64(end - obs.ts)));
        }
        return FHE.mul(obs.balance, uint64(periodLength));
    }

    /// @dev The total's three slots shift at most once per period and the scale is read inside the
    ///      two-period window, so the revert is a canary rather than a reachable path.
    function _totalWeight(uint32 period) private returns (euint128) {
        for (uint8 slot = 0; slot < SLOTS; slot++) {
            TotalObservation storage obs = _total[slot];
            if (obs.ts == 0) return FHE.asEuint128(0);
            uint32 obsPeriod = Periods.periodOf(obs.ts, firstPeriodAt, periodLength);
            if (obsPeriod <= period) return _totalWeightFrom(obs, obsPeriod, period);
        }
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

    function _grant(euint64 handle, address saver) private {
        FHE.allowThis(handle);
        FHE.allow(handle, saver);
    }

    function _currentPeriod() private view returns (uint32) {
        return Periods.periodOf(block.timestamp, firstPeriodAt, periodLength);
    }

    /// @dev The public half of the winner test, shared by `evaluate` and `thresholdOf` so the app, the
    ///      tests and a judge check outcomes against the same implementation that decided them. `M` is a
    ///      power of two, so masking the hash gives a uniform draw in `[0, M)` with no modulo bias.
    function _thresholdOf(
        IHearthPrizePool.DrawParams memory draw,
        uint32 drawId,
        address saver,
        uint8 tier,
        uint32 index
    ) private pure returns (uint256 threshold, bool skipped) {
        uint256 range = uint256(1) << draw.scaleBits;
        uint256 point = uint256(keccak256(abi.encode(draw.seed, drawId, saver, tier))) & (range - 1);
        threshold = ((point + uint256(index) * range) * draw.zoneDiv[tier]) / draw.zoneMul[tier];
        skipped = threshold >= type(uint64).max;
    }
}
