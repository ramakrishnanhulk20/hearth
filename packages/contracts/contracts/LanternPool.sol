// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, ebool, euint64, euint128, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "@openzeppelin/confidential-contracts/interfaces/IERC7984Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IConfidentialWrapper {
    function wrap(address to, uint256 amount) external returns (euint64);
}

contract LanternPool is IERC7984Receiver, ZamaEthereumConfig, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC7984 public immutable asset;

    IERC20 public immutable underlying;

    mapping(address depositor => euint64) private _principal;
    mapping(address depositor => euint64) private _winnings;
    euint64 private _total;

    address[] private _depositors;
    mapping(address depositor => bool) public hasDeposited;
    mapping(address depositor => uint256) private _depositorIndex;

    enum Phase {
        Idle,
        Scanning
    }

    Phase public phase;
    uint256 public drawId;
    uint64 public jackpot;
    uint256 public scanCursor;
    uint256 public scanEnd;

    euint64 private _target;
    euint64 private _running;
    ebool private _passed;

    mapping(uint256 draw => mapping(address depositor => euint64)) private _stakeAtOpen;
    mapping(uint256 draw => mapping(address depositor => bool)) private _stakeFrozen;

    uint64 public reserve;

    uint64 public prizePerDraw;

    uint64 public drawInterval;

    uint256 public lastDrawAt;

    uint256 public maxChunk = 25;

    event Deposited(address indexed depositor);
    event Withdrawn(address indexed depositor);
    event Claimed(address indexed depositor);
    event DrawOpened(uint256 indexed draw, uint64 prize, uint256 participants);
    event DrawScanned(uint256 indexed draw, uint256 cursor, uint256 participants);
    event DrawSettled(uint256 indexed draw);
    event ReserveFunded(address indexed from, uint64 amount, uint64 reserve);
    event ScheduleChanged(uint64 prizePerDraw, uint64 drawInterval);
    event MaxChunkChanged(uint256 maxChunk);

    error NotTheAsset();
    error DrawInProgress();
    error NoDrawInProgress();
    error TooSoon(uint256 availableAt);
    error NoParticipants();
    error ReserveTooSmall(uint64 available, uint64 needed);
    error ChunkTooLarge(uint256 requested, uint256 allowed);
    error NothingToScan();
    error PrizeNotSet();
    error InvalidMaxChunk();

    constructor(
        IERC7984 asset_,
        IERC20 underlying_,
        uint64 prizePerDraw_,
        uint64 drawInterval_,
        address owner_
    ) Ownable(owner_) {
        asset = asset_;
        underlying = underlying_;
        prizePerDraw = prizePerDraw_;
        drawInterval = drawInterval_;

        _register(address(this));
        _principal[address(this)] = FHE.asEuint64(1);
        FHE.allowThis(_principal[address(this)]);

        _total = FHE.asEuint64(1);
        FHE.allowThis(_total);
    }

    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata
    ) external override returns (ebool) {
        if (msg.sender != address(asset)) revert NotTheAsset();

        _register(from);
        _freezeStakeIfMidDraw(from);

        _principal[from] = FHE.add(_principal[from], amount);
        _total = FHE.add(_total, amount);

        _grantPrincipal(from);
        FHE.allowThis(_total);

        emit Deposited(from);

        ebool accepted = FHE.asEbool(true);
        FHE.allowThis(accepted);
        FHE.allowTransient(accepted, msg.sender);
        return accepted;
    }

    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof) external nonReentrant {
        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);
        _freezeStakeIfMidDraw(msg.sender);

        euint64 balance = _principal[msg.sender];
        euint64 amount = FHE.min(requested, balance);

        _principal[msg.sender] = FHE.sub(balance, amount);
        _total = FHE.sub(_total, amount);

        FHE.allowTransient(amount, address(asset));
        euint64 sent = asset.confidentialTransfer(msg.sender, amount);

        euint64 shortfall = FHE.sub(amount, sent);
        _principal[msg.sender] = FHE.add(_principal[msg.sender], shortfall);
        _total = FHE.add(_total, shortfall);

        _grantPrincipal(msg.sender);
        FHE.allowThis(_total);

        emit Withdrawn(msg.sender);
    }

    function claim() external nonReentrant {
        euint64 owed = _winnings[msg.sender];

        FHE.allowTransient(owed, address(asset));
        euint64 sent = asset.confidentialTransfer(msg.sender, owed);

        _winnings[msg.sender] = FHE.sub(owed, sent);
        _grantWinnings(msg.sender);

        emit Claimed(msg.sender);
    }

    function openDraw() external {
        if (phase != Phase.Idle) revert DrawInProgress();
        if (prizePerDraw == 0) revert PrizeNotSet();

        uint256 availableAt = lastDrawAt + drawInterval;
        if (lastDrawAt != 0 && block.timestamp < availableAt) revert TooSoon(availableAt);
        if (_depositors.length == 0) revert NoParticipants();
        if (reserve < prizePerDraw) revert ReserveTooSmall(reserve, prizePerDraw);

        drawId += 1;
        reserve -= prizePerDraw;
        jackpot = prizePerDraw;

        euint64 roll = FHE.randEuint64();
        euint128 widened = FHE.mul(FHE.asEuint128(roll), FHE.asEuint128(_total));
        _target = FHE.asEuint64(FHE.shr(widened, uint8(64)));
        FHE.allowThis(_target);

        _running = FHE.asEuint64(0);
        FHE.allowThis(_running);
        _passed = FHE.asEbool(false);
        FHE.allowThis(_passed);

        scanCursor = 0;
        scanEnd = _depositors.length;
        phase = Phase.Scanning;

        emit DrawOpened(drawId, jackpot, scanEnd);
    }

    function scanChunk(uint256 count) external {
        if (phase != Phase.Scanning) revert NoDrawInProgress();
        if (count > maxChunk) revert ChunkTooLarge(count, maxChunk);

        uint256 end = scanCursor + count;
        if (end > scanEnd) end = scanEnd;
        if (end == scanCursor) revert NothingToScan();

        euint64 running = _running;
        ebool passed = _passed;
        euint64 prize = FHE.asEuint64(jackpot);

        for (uint256 i = scanCursor; i < end; i++) {
            address who = _depositors[i];

            running = FHE.add(running, _stakeInDraw(who));
            ebool nowPassed = FHE.lt(_target, running);
            ebool won = FHE.ne(nowPassed, passed);

            _winnings[who] = FHE.select(won, FHE.add(_winnings[who], prize), _winnings[who]);
            _grantWinnings(who);

            passed = nowPassed;
        }

        _running = running;
        FHE.allowThis(_running);
        _passed = passed;
        FHE.allowThis(_passed);
        scanCursor = end;

        emit DrawScanned(drawId, end, scanEnd);

        if (end == scanEnd) {
            phase = Phase.Idle;
            lastDrawAt = block.timestamp;
            emit DrawSettled(drawId);
        }
    }

    function fundReserve(uint64 amount) external nonReentrant {
        underlying.safeTransferFrom(msg.sender, address(this), amount);
        underlying.forceApprove(address(asset), amount);
        IConfidentialWrapper(address(asset)).wrap(address(this), amount);

        reserve += amount;
        emit ReserveFunded(msg.sender, amount, reserve);
    }

    function setSchedule(uint64 prizePerDraw_, uint64 drawInterval_) external onlyOwner {
        prizePerDraw = prizePerDraw_;
        drawInterval = drawInterval_;
        emit ScheduleChanged(prizePerDraw_, drawInterval_);
    }

    function setMaxChunk(uint256 maxChunk_) external onlyOwner {
        if (maxChunk_ == 0) revert InvalidMaxChunk();
        maxChunk = maxChunk_;
        emit MaxChunkChanged(maxChunk_);
    }

    function confidentialBalanceOf(address depositor) external view returns (euint64) {
        return _principal[depositor];
    }

    function confidentialWinningsOf(address depositor) external view returns (euint64) {
        return _winnings[depositor];
    }

    function depositorCount() external view returns (uint256) {
        return _depositors.length;
    }

    function depositorAt(uint256 index) external view returns (address) {
        return _depositors[index];
    }

    function nextDrawAt() external view returns (uint256) {
        if (lastDrawAt == 0) return 0;
        return lastDrawAt + drawInterval;
    }

    function scanTransactionsRemaining() external view returns (uint256) {
        if (phase != Phase.Scanning) return 0;
        return (scanEnd - scanCursor + maxChunk - 1) / maxChunk;
    }

    function _register(address who) private {
        if (hasDeposited[who]) return;

        hasDeposited[who] = true;
        _depositorIndex[who] = _depositors.length;
        _depositors.push(who);

        _principal[who] = FHE.asEuint64(0);
        _winnings[who] = FHE.asEuint64(0);
        _grantPrincipal(who);
        _grantWinnings(who);
    }

    function _freezeStakeIfMidDraw(address who) private {
        if (phase != Phase.Scanning) return;
        if (!hasDeposited[who]) return;
        if (_stakeFrozen[drawId][who]) return;

        uint256 index = _depositorIndex[who];

        if (index >= scanEnd) return;

        if (index < scanCursor) return;

        _stakeAtOpen[drawId][who] = _principal[who];
        _stakeFrozen[drawId][who] = true;
        FHE.allowThis(_stakeAtOpen[drawId][who]);
    }

    function _stakeInDraw(address who) private view returns (euint64) {
        if (_stakeFrozen[drawId][who]) return _stakeAtOpen[drawId][who];
        return _principal[who];
    }

    function _grantPrincipal(address who) private {
        FHE.allowThis(_principal[who]);
        FHE.allow(_principal[who], who);
    }

    function _grantWinnings(address who) private {
        FHE.allowThis(_winnings[who]);
        FHE.allow(_winnings[who], who);

        if (who == address(this)) {
            FHE.makePubliclyDecryptable(_winnings[who]);
        }
    }
}
