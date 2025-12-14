// SPDX-License-Identifier: MIT
/* solhint-disable */
/* solidity-coverage ignore next */
pragma solidity ^0.8.28;

interface IBetChain {
    function placeBet(uint256 betId, uint256 optionId) external payable;
    function withdrawPrize(uint256 betId) external;
    function withdrawFee(uint256 betId) external;
    function createBet(
        string calldata title,
        string calldata description,
        string calldata imageUrl,
        string[] calldata optionNames,
        uint256 deadline
    ) external;
    function finalizeBet(uint256 betId, uint256 winningOptionId) external;
}

/**
 * @title ReentrancyAttacker
 * @notice Malicious contract that attempts to reenter withdrawPrize
 */
contract ReentrancyAttacker {
    IBetChain public betChain;
    uint256 public attackCount;
    uint256 public currentBetId;
    bool public attacking;

    constructor(address _betChain) {
        betChain = IBetChain(_betChain);
    }

    function placeBet(uint256 betId, uint256 optionId) external payable {
        betChain.placeBet{value: msg.value}(betId, optionId);
    }

    function attackWithdrawPrize(uint256 betId) external {
        currentBetId = betId;
        attacking = true;
        attackCount = 0;
        betChain.withdrawPrize(betId);
    }

    // Fallback function that attempts reentrancy
    receive() external payable {
        if (attacking && attackCount < 1) {
            attackCount++;
            // Try to reenter withdrawPrize - this should fail due to nonReentrant
            betChain.withdrawPrize(currentBetId);
        }
    }
}

/**
 * @title ReentrancyAttackerCreator
 * @notice Malicious contract that attempts to reenter withdrawFee
 */
contract ReentrancyAttackerCreator {
    IBetChain public betChain;
    uint256 public attackCount;
    uint256 public currentBetId;
    bool public attacking;

    constructor(address _betChain) {
        betChain = IBetChain(_betChain);
    }

    function createBet() external {
        string[] memory options = new string[](2);
        options[0] = "Option A";
        options[1] = "Option B";
        
        betChain.createBet(
            "Attacker Bet",
            "Malicious",
            "",
            options,
            0
        );
    }

    function finalizeBet(uint256 betId, uint256 winningOptionId) external {
        betChain.finalizeBet(betId, winningOptionId);
    }

    function attackWithdrawFee(uint256 betId) external {
        currentBetId = betId;
        attacking = true;
        attackCount = 0;
        betChain.withdrawFee(betId);
    }

    // Fallback function that attempts reentrancy
    receive() external payable {
        if (attacking && attackCount < 1) {
            attackCount++;
            // Try to reenter withdrawFee - this should fail due to nonReentrant
            betChain.withdrawFee(currentBetId);
        }
    }
}