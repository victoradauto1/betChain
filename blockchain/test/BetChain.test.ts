import { expect } from "chai";
import { ethers } from "hardhat";
import { BetChain, ReentrancyAttacker, PlaceBetReentrancyAttacker, RejectEther, GasGuzzler } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BetChain", function () {
  let betChain: BetChain;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const BetChainFactory = await ethers.getContractFactory("BetChain");
    betChain = await BetChainFactory.deploy();
  });

  describe("Deployment", function () {
    it("Should initialize with betCount = 0", async function () {
      expect(await betChain.betCount()).to.equal(0);
    });
  });

  describe("Create Bet", function () {
    it("Should create a new bet", async function () {
      await expect(betChain.createBet("Quem vence a Copa?"))
        .to.emit(betChain, "BetCreated")
        .withArgs(0, "Quem vence a Copa?");

      expect(await betChain.betCount()).to.equal(1);
      
      const bet = await betChain.bets(0);
      expect(bet.title).to.equal("Quem vence a Copa?");
      expect(bet.status).to.equal(0); // BetStatus.OPEN
    });

    it("Should create multiple bets", async function () {
      await betChain.createBet("Bet 1");
      await betChain.createBet("Bet 2");
      await betChain.createBet("Bet 3");

      expect(await betChain.betCount()).to.equal(3);
    });
  });

  describe("Add Options", function () {
    beforeEach(async function () {
      await betChain.createBet("Quem vence?");
    });

    it("Should add an option to a bet", async function () {
      await expect(betChain.addOption(0, "Brasil"))
        .to.emit(betChain, "OptionAdded")
        .withArgs(0, 0, "Brasil");

      const options = await betChain.getOptions(0);
      expect(options.length).to.equal(1);
      expect(options[0].name).to.equal("Brasil");
      expect(options[0].totalAmount).to.equal(0);
    });

    it("Should add multiple options", async function () {
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
      await betChain.addOption(0, "França");

      const options = await betChain.getOptions(0);
      expect(options.length).to.equal(3);
      expect(options[1].name).to.equal("Argentina");
    });

    it("Should revert if bet does not exist", async function () {
      await expect(betChain.addOption(99, "Option"))
        .to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("Should revert if bet is not open", async function () {
      await betChain.addOption(0, "Brasil");
      await betChain.closeBet(0);

      await expect(betChain.addOption(0, "Argentina"))
        .to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });
  });

  describe("Place Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Quem vence?");
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
    });

    it("Should place a bet successfully", async function () {
      const betAmount = ethers.parseEther("1");

      await expect(
        betChain.connect(user1).placeBet(0, 0, { value: betAmount })
      )
        .to.emit(betChain, "BetPlaced")
        .withArgs(0, 0, user1.address, betAmount);

      const options = await betChain.getOptions(0);
      expect(options[0].totalAmount).to.equal(betAmount);

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(betAmount);

      expect(await betChain.userBets(0, 0, user1.address)).to.equal(betAmount);
      expect(await betChain.userTotalBets(0, user1.address)).to.equal(betAmount);
    });

    it("Should allow multiple users to bet on different options", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("2") });
      await betChain.connect(user3).placeBet(0, 0, { value: ethers.parseEther("0.5") });

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(ethers.parseEther("3.5"));

      const options = await betChain.getOptions(0);
      expect(options[0].totalAmount).to.equal(ethers.parseEther("1.5"));
      expect(options[1].totalAmount).to.equal(ethers.parseEther("2"));
    });

    it("Should allow same user to bet multiple times", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("0.5") });

      expect(await betChain.userBets(0, 0, user1.address)).to.equal(ethers.parseEther("1.5"));
      expect(await betChain.userTotalBets(0, user1.address)).to.equal(ethers.parseEther("1.5"));
    });

    it("Should revert if bet does not exist", async function () {
      await expect(
        betChain.connect(user1).placeBet(99, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("Should revert if bet is not open", async function () {
      await betChain.closeBet(0);

      await expect(
        betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("Should revert if option is invalid", async function () {
      await expect(
        betChain.connect(user1).placeBet(0, 99, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(betChain, "InvalidOption");
    });

    it("Should revert if bet amount is 0", async function () {
      await expect(
        betChain.connect(user1).placeBet(0, 0, { value: 0 })
      ).to.be.reverted;
    });
  });

  describe("Close Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Quem vence?");
      await betChain.addOption(0, "Brasil");
    });

    it("Should close a bet", async function () {
      await expect(betChain.closeBet(0))
        .to.emit(betChain, "BetClosed")
        .withArgs(0);

      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(1); // BetStatus.CLOSED
    });

    it("Should revert if bet does not exist", async function () {
      await expect(betChain.closeBet(99))
        .to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("Should revert if bet is already closed", async function () {
      await betChain.closeBet(0);

      await expect(betChain.closeBet(0))
        .to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });
  });

  describe("Settle Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Quem vence?");
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.closeBet(0);
    });

    it("Should settle a bet", async function () {
      await expect(betChain.settleBet(0, 0))
        .to.emit(betChain, "BetSettled")
        .withArgs(0, 0);

      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(2); // BetStatus.SETTLED
      expect(bet.winningOption).to.equal(0);
    });

    it("Should revert if bet does not exist", async function () {
      await expect(betChain.settleBet(99, 0))
        .to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("Should revert if bet is not closed", async function () {
      await betChain.createBet("New Bet");
      await betChain.addOption(1, "Option");

      await expect(betChain.settleBet(1, 0))
        .to.be.revertedWithCustomError(betChain, "BetNotClosed");
    });

    it("Should revert if winning option is invalid", async function () {
      await expect(betChain.settleBet(0, 99))
        .to.be.revertedWithCustomError(betChain, "InvalidOption");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      await betChain.createBet("Quem vence?");
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
    });

    it("Should withdraw winnings correctly", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("2") });
      
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      const initialBalance = await ethers.provider.getBalance(user1.address);
      const tx = await betChain.connect(user1).withdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const finalBalance = await ethers.provider.getBalance(user1.address);
      const expectedPayout = ethers.parseEther("3"); // 100% do pool total

      expect(finalBalance).to.equal(initialBalance - gasUsed + expectedPayout);
    });

    it("Should distribute winnings proportionally", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain.connect(user2).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user3).placeBet(0, 1, { value: ethers.parseEther("3") });
      
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      const initialBalance1 = await ethers.provider.getBalance(user1.address);
      const tx1 = await betChain.connect(user1).withdraw(0);
      const receipt1 = await tx1.wait();
      const gasUsed1 = receipt1!.gasUsed * receipt1!.gasPrice;
      const finalBalance1 = await ethers.provider.getBalance(user1.address);
      
      // user1 apostou 2 ETH de um total de 3 ETH no vencedor
      // user1 recebe (6 * 2) / 3 = 4 ETH
      const expectedPayout1 = ethers.parseEther("4");
      expect(finalBalance1).to.equal(initialBalance1 - gasUsed1 + expectedPayout1);

      const initialBalance2 = await ethers.provider.getBalance(user2.address);
      const tx2 = await betChain.connect(user2).withdraw(0);
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2!.gasUsed * receipt2!.gasPrice;
      const finalBalance2 = await ethers.provider.getBalance(user2.address);
      
      // user2 apostou 1 ETH de um total de 3 ETH no vencedor
      // user2 recebe (6 * 1) / 3 = 2 ETH
      const expectedPayout2 = ethers.parseEther("2");
      expect(finalBalance2).to.equal(initialBalance2 - gasUsed2 + expectedPayout2);
    });

    it("Should emit WinningsWithdrawn event", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(betChain.connect(user1).withdraw(0))
        .to.emit(betChain, "WinningsWithdrawn")
        .withArgs(0, user1.address, ethers.parseEther("1"));
    });

    it("Should set user bet to 0 after withdrawal", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await betChain.connect(user1).withdraw(0);

      expect(await betChain.userBets(0, 0, user1.address)).to.equal(0);
    });

    it("Should revert if bet does not exist", async function () {
      await expect(betChain.connect(user1).withdraw(99))
        .to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("Should revert if bet is not settled", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await expect(betChain.connect(user1).withdraw(0))
        .to.be.revertedWithCustomError(betChain, "BetNotSettled");
    });

    it("Should revert if user has nothing to withdraw", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(betChain.connect(user2).withdraw(0))
        .to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });

    it("Should revert if user already withdrew", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await betChain.connect(user1).withdraw(0);

      await expect(betChain.connect(user1).withdraw(0))
        .to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });

    it("Should revert if user bet on losing option", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("2") });
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(betChain.connect(user2).withdraw(0))
        .to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });
  });

  describe("Get Options", function () {
    it("Should return all options for a bet", async function () {
      await betChain.createBet("Quem vence?");
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
      await betChain.addOption(0, "França");

      const options = await betChain.getOptions(0);
      expect(options.length).to.equal(3);
      expect(options[0].name).to.equal("Brasil");
      expect(options[1].name).to.equal("Argentina");
      expect(options[2].name).to.equal("França");
    });

    it("Should revert if bet does not exist", async function () {
      await expect(betChain.getOptions(99))
        .to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });
  });

  describe("Security Tests", function () {
    describe("Reentrancy Attack on placeBet", function () {
      let attacker: PlaceBetReentrancyAttacker;

      beforeEach(async function () {
        await betChain.createBet("PlaceBet Reentrancy Test");
        await betChain.addOption(0, "Option 1");
        await betChain.addOption(0, "Option 2");

        const AttackerFactory = await ethers.getContractFactory("PlaceBetReentrancyAttacker");
        attacker = await AttackerFactory.deploy(await betChain.getAddress());
      });
    });

    describe("Reentrancy Attack on withdraw", function () {
      let attacker: ReentrancyAttacker;

      beforeEach(async function () {
        await betChain.createBet("Reentrancy Test");
        await betChain.addOption(0, "Option 1");
        await betChain.addOption(0, "Option 2");

        const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
        attacker = await AttackerFactory.deploy(await betChain.getAddress());
      });

      it("Should prevent reentrancy attack on withdraw", async function () {
        // Atacante faz uma aposta
        await attacker.attack(0, 0, { value: ethers.parseEther("2") });
        
        // Usuário honesto também aposta
        await betChain.connect(user1).placeBet(0, 1, { value: ethers.parseEther("1") });

        // Fecha e define o vencedor como a opção do atacante
        await betChain.closeBet(0);
        await betChain.settleBet(0, 0);

        const contractBalanceBefore = await ethers.provider.getBalance(await betChain.getAddress());

        // O atacante tenta fazer o withdraw (que tentará reentrancy)
        await expect(attacker.executeWithdraw()).to.be.reverted;

        const contractBalanceAfter = await ethers.provider.getBalance(await betChain.getAddress());
        
        // O contrato deve manter o saldo (reentrancy foi bloqueado)
        // Nota: se o reentrancy fosse bem sucedido, o contrato seria drenado
        expect(contractBalanceAfter).to.be.greaterThan(0);
      });

      it("Should prevent multiple withdrawals through reentrancy", async function () {
        await attacker.attack(0, 0, { value: ethers.parseEther("1") });
        await betChain.connect(user1).placeBet(0, 1, { value: ethers.parseEther("1") });

        await betChain.closeBet(0);
        await betChain.settleBet(0, 0);

        // Primeira tentativa de withdraw deveria reverter devido ao reentrancy guard
        await expect(attacker.executeWithdraw()).to.be.reverted;

        // Verificar que o atacante não recebeu múltiplos pagamentos
        const attackerBalance = await attacker.getBalance();
        expect(attackerBalance).to.equal(0);
      });
    });

    describe("Failed ETH Transfer", function () {
      let rejectContract: RejectEther;

      beforeEach(async function () {
        await betChain.createBet("Reject ETH Test");
        await betChain.addOption(0, "Option 1");
        await betChain.addOption(0, "Option 2");

        const RejectFactory = await ethers.getContractFactory("RejectEther");
        rejectContract = await RejectFactory.deploy(await betChain.getAddress());
      });

      it("Should revert when contract rejects ETH transfer", async function () {
        // Contrato que rejeita ETH faz uma aposta
        await rejectContract.placeBet(0, 0, { value: ethers.parseEther("1") });
        
        // Usuário normal também aposta
        await betChain.connect(user1).placeBet(0, 1, { value: ethers.parseEther("1") });

        // Fecha e define vencedor
        await betChain.closeBet(0);
        await betChain.settleBet(0, 0);

        // Tentativa de withdraw deve falhar porque o contrato rejeita ETH
        await expect(rejectContract.withdraw(0)).to.be.reverted;
      });

      it("Should verify require(success) coverage with normal user", async function () {
        // Este teste garante que quando tudo funciona corretamente,
        // o require(success) passa (cobrindo o branch "true")
        await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
        await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("1") });

        await betChain.closeBet(0);
        await betChain.settleBet(0, 0);

        // Withdraw bem-sucedido cobre o caso de require(success) == true
        await expect(betChain.connect(user1).withdraw(0))
          .to.emit(betChain, "WinningsWithdrawn");
      });
    });
  });

  describe("Edge Cases", function () {
    it("Should handle bet with no bets placed", async function () {
      await betChain.createBet("Empty Bet");
      await betChain.addOption(0, "Option 1");
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(0);
    });

    it("Should handle multiple bets on same option by same user", async function () {
      await betChain.createBet("Test");
      await betChain.addOption(0, "Option 1");
      
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("0.5") });

      expect(await betChain.userBets(0, 0, user1.address)).to.equal(ethers.parseEther("3.5"));
    });
  });
});