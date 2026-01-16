// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IBetChain {
    function placeBet(uint256 betId, uint256 optionId) external payable;

    function withdraw(uint256 betId) external;
}

/**
 * @title ReentrancyAttacker
 * @notice Contrato que tenta realizar um ataque de reentrancy no withdraw
 */
contract ReentrancyAttacker {
    IBetChain public betChain;
    uint256 public betId;
    uint256 public attackCount;
    uint256 public maxAttacks = 3;

    constructor(address _betChain) {
        betChain = IBetChain(_betChain);
    }

    function attack(uint256 _betId, uint256 _optionId) external payable {
        betId = _betId;
        attackCount = 0;
        betChain.placeBet{value: msg.value}(_betId, _optionId);
    }

    function executeWithdraw() external {
        betChain.withdraw(betId);
    }

    // Função receive que tenta realizar reentrancy
    receive() external payable {
        if (attackCount < maxAttacks) {
            attackCount++;
            betChain.withdraw(betId);
        }
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function withdrawFunds() external {
        uint256 amount = address(this).balance;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH_TRANSFER_FAILED");
    }
}

/**
 * @title PlaceBetReentrancyAttacker
 * @notice Contrato que tenta realizar reentrancy no placeBet através do fallback
 */
contract PlaceBetReentrancyAttacker {
    IBetChain public betChain;
    uint256 public betId;
    uint256 public optionId;
    uint256 public attackCount;
    uint256 public maxAttacks = 2;
    bool public attacking;

    constructor(address _betChain) {
        betChain = IBetChain(_betChain);
    }

    function attack(uint256 _betId, uint256 _optionId) external payable {
        betId = _betId;
        optionId = _optionId;
        attackCount = 0;
        attacking = true;

        // Primeira chamada ao placeBet
        betChain.placeBet{value: msg.value / 2}(_betId, _optionId);
        attacking = false;
    }

    // Fallback que tenta reentrancy quando recebe qualquer chamada
    fallback() external payable {
        if (
            attacking && attackCount < maxAttacks && address(this).balance > 0
        ) {
            attackCount++;
            // Tenta chamar placeBet novamente durante a execução
            betChain.placeBet{value: address(this).balance}(betId, optionId);
        }
    }

    receive() external payable {
        if (
            attacking && attackCount < maxAttacks && address(this).balance > 0
        ) {
            attackCount++;
            // Tenta chamar placeBet novamente durante a execução
            betChain.placeBet{value: address(this).balance}(betId, optionId);
        }
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

/**
 * @title RejectEther
 * @notice Contrato que rejeita o recebimento de ETH para testar falha no withdraw
 */
contract RejectEther {
    IBetChain public betChain;

    constructor(address _betChain) {
        betChain = IBetChain(_betChain);
    }

    function placeBet(uint256 betId, uint256 optionId) external payable {
        betChain.placeBet{value: msg.value}(betId, optionId);
    }

    function withdraw(uint256 betId) external {
        betChain.withdraw(betId);
    }

    // Rejeita qualquer recebimento de ETH
    receive() external payable {
        revert("I reject your ETH!");
    }

    fallback() external payable {
        revert("I reject your ETH!");
    }
}

/**
 * @title GasGuzzler
 * @notice Contrato que consome muito gas ao receber ETH, causando falha
 */
contract GasGuzzler {
    IBetChain public betChain;
    uint256[] public wasteGas;

    constructor(address _betChain) {
        betChain = IBetChain(_betChain);
    }

    function placeBet(uint256 betId, uint256 optionId) external payable {
        betChain.placeBet{value: msg.value}(betId, optionId);
    }

    function withdraw(uint256 betId) external {
        betChain.withdraw(betId);
    }

    // Consome muito gas ao receber ETH
    receive() external payable {
        for (uint256 i = 0; i < 1000; i++) {
            wasteGas.push(i);
        }
    }
}
