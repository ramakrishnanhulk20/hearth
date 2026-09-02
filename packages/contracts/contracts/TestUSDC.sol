// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestUSDC is ERC20 {

    uint256 public constant FAUCET_AMOUNT = 10_000e6;

    uint256 public constant FAUCET_COOLDOWN = 8 hours;

    mapping(address claimant => uint256 timestamp) public lastClaimed;

    event FaucetClaimed(address indexed claimant, uint256 amount);

    error FaucetCooldown(uint256 availableAt);

    constructor() ERC20("Lantern Test USD", "tUSDC") {}

    function claim() external {
        uint256 availableAt = lastClaimed[msg.sender] + FAUCET_COOLDOWN;
        if (lastClaimed[msg.sender] != 0 && block.timestamp < availableAt) {
            revert FaucetCooldown(availableAt);
        }

        lastClaimed[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        emit FaucetClaimed(msg.sender, FAUCET_AMOUNT);
    }

    function claimableAt(address claimant) external view returns (uint256) {
        if (lastClaimed[claimant] == 0) return 0;
        return lastClaimed[claimant] + FAUCET_COOLDOWN;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
