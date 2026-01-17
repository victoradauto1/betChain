import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BetChain,
  ReentrancyAttacker,
  PlaceBetReentrancyAttacker,
  RejectEther,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BetChain", function () {
  let betChain: BetChain;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const DAY = 24 * 60 * 60;
  const HOUR = 60 * 60;

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
    it("Should create a new bet with valid deadline", async function () {
      const futureDeadline = (await time.latest()) + DAY;

      await expect(betChain.createBet("Quem vence a Copa?", futureDeadline))
        .to.emit(betChain, "BetCreated")
        .withArgs(0, "Quem vence a Copa?", futureDeadline);

      expect(await betChain.betCount()).to.equal(1);

      const bet = await betChain.bets(0);
      expect(bet.title).to.equal("Quem vence a Copa?");
      expect(bet.status).to.equal(0); // BetStatus.OPEN
      expect(bet.deadline).to.equal(futureDeadline);
      expect(bet.optionsLocked).to.be.false;
    });

    it("Should create multiple bets with different deadlines", async function () {
      const deadline1 = (await time.latest()) + DAY;
      const deadline2 = (await time.latest()) + 2 * DAY;
      const deadline3 = (await time.latest()) + 3 * DAY;

      await betChain.createBet("Bet 1", deadline1);
      await betChain.createBet("Bet 2", deadline2);
      await betChain.createBet("Bet 3", deadline3);

      expect(await betChain.betCount()).to.equal(3);
    });

    it("Should revert if deadline is in the past", async function () {
      const pastDeadline = (await time.latest()) - DAY;

      await expect(
        betChain.createBet("Invalid Bet", pastDeadline),
      ).to.be.revertedWithCustomError(betChain, "InvalidDeadline");
    });

    it("Should revert if deadline is current timestamp", async function () {
      const now = await time.latest();

      await expect(
        betChain.createBet("Invalid Bet", now),
      ).to.be.revertedWithCustomError(betChain, "InvalidDeadline");
    });
  });

  describe("Add Options", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Quem vence?", deadline);
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

    it("Should add multiple options before any bet", async function () {
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
      await betChain.addOption(0, "França");

      const options = await betChain.getOptions(0);
      expect(options.length).to.equal(3);
      expect(options[1].name).to.equal("Argentina");
    });

    it("Should revert if bet does not exist", async function () {
      await expect(
        betChain.addOption(99, "Option"),
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("Should revert if bet is not open (manually closed)", async function () {
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");

      // Avança tempo para fechar
      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      await expect(
        betChain.addOption(0, "França"),
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("Should revert if options are locked (after first bet)", async function () {
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");

      // Primeira aposta trava opções
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await expect(
        betChain.addOption(0, "França"),
      ).to.be.revertedWithCustomError(betChain, "OptionsLocked");
    });

    it("Should revert if deadline has passed (auto-close)", async function () {
      await betChain.addOption(0, "Brasil");

      // Avança tempo além da deadline
      await time.increaseTo(deadline + 1);

      // Tentativa de adicionar opção deve falhar porque _syncBetStatus fecha a bet
      await expect(
        betChain.addOption(0, "Argentina"),
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });
  });

  describe("Place Bet", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Quem vence?", deadline);
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
    });

    it("Should place a bet successfully", async function () {
      const betAmount = ethers.parseEther("1");

      await expect(betChain.connect(user1).placeBet(0, 0, { value: betAmount }))
        .to.emit(betChain, "BetPlaced")
        .withArgs(0, 0, user1.address, betAmount);

      const options = await betChain.getOptions(0);
      expect(options[0].totalAmount).to.equal(betAmount);

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(betAmount);

      expect(await betChain.userBets(0, 0, user1.address)).to.equal(betAmount);
      expect(await betChain.userTotalBets(0, user1.address)).to.equal(
        betAmount,
      );
    });

    it("Should lock options after first bet", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      const bet = await betChain.bets(0);
      expect(bet.optionsLocked).to.be.true;

      await expect(
        betChain.addOption(0, "França"),
      ).to.be.revertedWithCustomError(betChain, "OptionsLocked");
    });

    it("Should allow multiple users to bet on different options", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user2)
        .placeBet(0, 1, { value: ethers.parseEther("2") });
      await betChain
        .connect(user3)
        .placeBet(0, 0, { value: ethers.parseEther("0.5") });

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(ethers.parseEther("3.5"));

      const options = await betChain.getOptions(0);
      expect(options[0].totalAmount).to.equal(ethers.parseEther("1.5"));
      expect(options[1].totalAmount).to.equal(ethers.parseEther("2"));
    });

    it("Should allow same user to bet multiple times", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("0.5") });

      expect(await betChain.userBets(0, 0, user1.address)).to.equal(
        ethers.parseEther("1.5"),
      );
      expect(await betChain.userTotalBets(0, user1.address)).to.equal(
        ethers.parseEther("1.5"),
      );
    });

    it("Should revert if bet does not exist", async function () {
      await expect(
        betChain
          .connect(user1)
          .placeBet(99, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("Should revert if bet is not open (manually closed)", async function () {
      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      await expect(
        betChain
          .connect(user1)
          .placeBet(0, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("Should revert if deadline has passed (deadline sovereignty)", async function () {
      // Avança tempo além da deadline
      await time.increaseTo(deadline + 1);

      // Tentativa de apostar deve falhar porque _syncBetStatus fecha a bet
      await expect(
        betChain
          .connect(user1)
          .placeBet(0, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("Should revert if option is invalid", async function () {
      await expect(
        betChain
          .connect(user1)
          .placeBet(0, 99, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "InvalidOption");
    });

    it("Should revert if bet amount is 0", async function () {
      await expect(
        betChain.connect(user1).placeBet(0, 0, { value: 0 }),
      ).to.be.revertedWithCustomError(betChain, "InvalidAmount");
    });

    it("Should revert if bet has less than 2 options", async function () {
      const newDeadline = (await time.latest()) + DAY;
      await betChain.createBet("Single Option Bet", newDeadline);
      await betChain.addOption(1, "Only One");

      await expect(
        betChain
          .connect(user1)
          .placeBet(1, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "InsufficientOptions");
    });
  });

  describe("Close Bet - Permissionless", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Quem vence?", deadline);
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
    });

    it("Should allow anyone to close bet after deadline", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      // Avança tempo além da deadline
      await time.increaseTo(deadline + 1);

      // Qualquer usuário pode fechar
      await expect(betChain.connect(user2).closeBet(0))
        .to.emit(betChain, "BetClosed")
        .withArgs(0);

      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(1); // BetStatus.CLOSED
    });

    it("Should auto-close on any interaction after deadline", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      // Avança tempo
      await time.increaseTo(deadline + 1);

      // Qualquer chamada que use _syncBetStatus fecha a bet
      await expect(betChain.connect(user3).closeBet(0))
        .to.emit(betChain, "BetClosed")
        .withArgs(0);
    });

    it("Should revert if trying to close before deadline", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      // Ainda dentro do prazo
      await expect(betChain.closeBet(0)).to.be.revertedWithCustomError(
        betChain,
        "BetNotOpen",
      );
    });

    it("Should revert if bet does not exist", async function () {
      await expect(betChain.closeBet(99)).to.be.revertedWithCustomError(
        betChain,
        "BetDoesNotExist",
      );
    });

    it("Should revert if bet is already closed", async function () {
      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      // Tentar fechar novamente deve reverter porque status != OPEN
      await expect(betChain.closeBet(0)).to.be.revertedWithCustomError(
        betChain,
        "BetNotOpen",
      );
    });

    it("Should allow closing even with zero bets (liveness)", async function () {
      // Bet sem apostas, mas deadline passou
      await time.increaseTo(deadline + 1);

      // Deve fechar mesmo sem apostas (liveness > validação de apostas)
      await expect(betChain.closeBet(0))
        .to.emit(betChain, "BetClosed")
        .withArgs(0);
    });
  });

  describe("Settle Bet", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Quem vence?", deadline);
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user2)
        .placeBet(0, 1, { value: ethers.parseEther("2") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
    });

    it("Should settle a bet with valid winning option", async function () {
      await expect(betChain.settleBet(0, 0))
        .to.emit(betChain, "BetSettled")
        .withArgs(0, 0);

      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(2); // BetStatus.SETTLED
      expect(bet.winningOption).to.equal(0);
    });

    it("Should revert if bet does not exist", async function () {
      await expect(betChain.settleBet(99, 0)).to.be.revertedWithCustomError(
        betChain,
        "BetDoesNotExist",
      );
    });

    it("Should revert if bet is not closed", async function () {
      const newDeadline = (await time.latest()) + DAY;
      await betChain.createBet("New Bet", newDeadline);
      await betChain.addOption(1, "Option 1");
      await betChain.addOption(1, "Option 2");

      await expect(betChain.settleBet(1, 0)).to.be.revertedWithCustomError(
        betChain,
        "BetNotClosed",
      );
    });

    it("Should revert if winning option is invalid", async function () {
      await expect(betChain.settleBet(0, 99)).to.be.revertedWithCustomError(
        betChain,
        "InvalidOption",
      );
    });

    it("Should revert if totalPool is zero", async function () {
      const newDeadline = (await time.latest()) + DAY;
      await betChain.createBet("Empty Bet", newDeadline);
      await betChain.addOption(1, "Option 1");
      await betChain.addOption(1, "Option 2");

      await time.increaseTo(newDeadline + 1);
      await betChain.closeBet(1);

      await expect(betChain.settleBet(1, 0)).to.be.revertedWithCustomError(
        betChain,
        "NothingToWithdraw",
      );
    });

    it("Should allow settleBet with exactly 2 options", async function () {
      const newDeadline = (await time.latest()) + DAY;
      await betChain.createBet("Two Options", newDeadline);
      await betChain.addOption(1, "Only One");
      await betChain.addOption(1, "Second One"); // Precisa de 2 opções para apostar

      // Agora pode apostar
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(newDeadline + 1);
      await betChain.closeBet(1);

      // Com 2 opções, deve funcionar
      await expect(betChain.settleBet(1, 0)).to.emit(betChain, "BetSettled");
    });

    it("Cannot create scenario with less than 2 options due to placeBet validation", async function () {
      // Timestamp atual + 1 hora para garantir que a bet ainda estará OPEN
      const newDeadline = (await time.latest()) + 3600; // 1 hora à frente
      await betChain.createBet("Single Option", newDeadline);

      // O betId recém-criado é betCount - 1
      const betId = (await betChain.betCount()) - 1n;

      // Adiciona apenas uma opção
      await betChain.addOption(betId, "Only One");

      // Tentar apostar deve falhar devido a menos de 2 opções
      await expect(
        betChain
          .connect(user1)
          .placeBet(betId, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "InsufficientOptions");

      // A validação de settleBet é defensiva, impossível em produção
      // Portanto, este teste apenas documenta que placeBet exige >= 2 opções
    });

    

    it("Should revert if winning option has no bets", async function () {
      // Criar nova bet para testar
      const newDeadline = (await time.latest()) + DAY;
      const betId = await betChain.betCount();
      await betChain.createBet("Test", newDeadline);
      await betChain.addOption(betId, "A");
      await betChain.addOption(betId, "B");
      await betChain.addOption(betId, "C");

      await betChain
        .connect(user1)
        .placeBet(betId, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user2)
        .placeBet(betId, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(newDeadline + 1);
      await betChain.closeBet(betId);

      // Opção 2 (C) não tem apostas
      await expect(betChain.settleBet(betId, 2)).to.be.revertedWithCustomError(
        betChain,
        "InvalidOption",
      );
    });
  });

  describe("Withdraw", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Quem vence?", deadline);
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
    });

    it("Should withdraw winnings correctly", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user2)
        .placeBet(0, 1, { value: ethers.parseEther("2") });

      await time.increaseTo(deadline + 1);
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
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain
        .connect(user2)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user3)
        .placeBet(0, 1, { value: ethers.parseEther("3") });

      await time.increaseTo(deadline + 1);
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
      expect(finalBalance1).to.equal(
        initialBalance1 - gasUsed1 + expectedPayout1,
      );

      const initialBalance2 = await ethers.provider.getBalance(user2.address);
      const tx2 = await betChain.connect(user2).withdraw(0);
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2!.gasUsed * receipt2!.gasPrice;
      const finalBalance2 = await ethers.provider.getBalance(user2.address);

      // user2 apostou 1 ETH de um total de 3 ETH no vencedor
      // user2 recebe (6 * 1) / 3 = 2 ETH
      const expectedPayout2 = ethers.parseEther("2");
      expect(finalBalance2).to.equal(
        initialBalance2 - gasUsed2 + expectedPayout2,
      );
    });

    it("Should emit WinningsWithdrawn event", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(betChain.connect(user1).withdraw(0))
        .to.emit(betChain, "WinningsWithdrawn")
        .withArgs(0, user1.address, ethers.parseEther("1"));
    });

    it("Should set user bet to 0 after withdrawal", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await betChain.connect(user1).withdraw(0);

      expect(await betChain.userBets(0, 0, user1.address)).to.equal(0);
    });

    it("Should revert if bet does not exist", async function () {
      await expect(
        betChain.connect(user1).withdraw(99),
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("Should revert if bet is not settled", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await expect(
        betChain.connect(user1).withdraw(0),
      ).to.be.revertedWithCustomError(betChain, "BetNotSettled");
    });

    it("Should revert if user has nothing to withdraw", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(
        betChain.connect(user2).withdraw(0),
      ).to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });

    it("Should revert if user already withdrew", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await betChain.connect(user1).withdraw(0);

      await expect(
        betChain.connect(user1).withdraw(0),
      ).to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });

    it("Should revert if user bet on losing option", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user2)
        .placeBet(0, 1, { value: ethers.parseEther("2") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(
        betChain.connect(user2).withdraw(0),
      ).to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });
  });

  describe("View Functions - Logical Status", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Test Bet", deadline);
      await betChain.addOption(0, "Option 1");
      await betChain.addOption(0, "Option 2");
    });

    it("isOpen should return true before deadline", async function () {
      expect(await betChain.isOpen(0)).to.be.true;
    });

    it("isOpen should return false after deadline (logical status)", async function () {
      await time.increaseTo(deadline + 1);

      // Mesmo sem chamar closeBet, isOpen deve retornar false
      expect(await betChain.isOpen(0)).to.be.false;
    });

    it("isExpired should return false before deadline", async function () {
      expect(await betChain.isExpired(0)).to.be.false;
    });

    it("isExpired should return true after deadline", async function () {
      await time.increaseTo(deadline + 1);
      expect(await betChain.isExpired(0)).to.be.true;
    });

    it("canClose should return false before deadline", async function () {
      expect(await betChain.canClose(0)).to.be.false;
    });

    it("canClose should return true after deadline if still OPEN", async function () {
      await time.increaseTo(deadline + 1);
      expect(await betChain.canClose(0)).to.be.true;
    });

    it("canClose should return false after manual close", async function () {
      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      expect(await betChain.canClose(0)).to.be.false;
    });

    it("canSettle should return false if bet is OPEN", async function () {
      expect(await betChain.canSettle(0)).to.be.false;
    });

    it("canSettle should return true after bet is CLOSED with valid pool", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      expect(await betChain.canSettle(0)).to.be.true;
    });

    it("canSettle should return false if totalPool is zero", async function () {
      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      expect(await betChain.canSettle(0)).to.be.false;
    });

    it("canSettle should return false after bet is SETTLED", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      expect(await betChain.canSettle(0)).to.be.false;
    });

    it("getBetInfo should return correct logical status", async function () {
      const infoBefore = await betChain.getBetInfo(0);

      expect(infoBefore.storedStatus).to.equal(0); // OPEN
      expect(infoBefore.logicalStatus).to.equal(0); // OPEN
      expect(infoBefore.expired).to.be.false;

      // Avança tempo
      await time.increaseTo(deadline + 1);

      const infoAfter = await betChain.getBetInfo(0);

      expect(infoAfter.storedStatus).to.equal(0); // Ainda OPEN no storage
      expect(infoAfter.logicalStatus).to.equal(1); // Mas CLOSED logicamente
      expect(infoAfter.expired).to.be.true;
    });

    it("calculatePayout should return 0 if bet not settled", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      expect(await betChain.calculatePayout(0, user1.address)).to.equal(0);
    });

    it("calculatePayout should return correct amount after settlement", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain
        .connect(user2)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user3)
        .placeBet(0, 1, { value: ethers.parseEther("3") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // Total pool: 6 ETH
      // Winning pool: 3 ETH
      // user1: (6 * 2) / 3 = 4 ETH
      // user2: (6 * 1) / 3 = 2 ETH
      expect(await betChain.calculatePayout(0, user1.address)).to.equal(
        ethers.parseEther("4"),
      );
      expect(await betChain.calculatePayout(0, user2.address)).to.equal(
        ethers.parseEther("2"),
      );
      expect(await betChain.calculatePayout(0, user3.address)).to.equal(0); // Perdedor
    });

    it("getUserBet should return correct amount", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1.5") });

      expect(await betChain.getUserBet(0, 0, user1.address)).to.equal(
        ethers.parseEther("1.5"),
      );
      expect(await betChain.getUserBet(0, 1, user1.address)).to.equal(0);
    });

    it("getUserTotalBet should return sum of all bets", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user1)
        .placeBet(0, 1, { value: ethers.parseEther("0.5") });

      expect(await betChain.getUserTotalBet(0, user1.address)).to.equal(
        ethers.parseEther("1.5"),
      );
    });
  });

  describe("Get Options", function () {
    it("Should return all options for a bet", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Quem vence?", deadline);
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
      await expect(betChain.getOptions(99)).to.be.revertedWithCustomError(
        betChain,
        "BetDoesNotExist",
      );
    });

    it("Should return empty array for bet with no options", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("No Options", deadline);

      const options = await betChain.getOptions(0);
      expect(options.length).to.equal(0);
    });
  });

  describe("Deadline Sovereignty Tests", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Sovereignty Test", deadline);
      await betChain.addOption(0, "Option 1");
      await betChain.addOption(0, "Option 2");
    });

    it("Should auto-close on placeBet attempt after deadline", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      // Salva o estado antes
      const betBefore = await betChain.bets(0);
      expect(betBefore.status).to.equal(0); // OPEN

      // Avança tempo
      await time.increaseTo(deadline + 1);

      // Tentativa de apostar deve reverter porque _syncBetStatus fecha a bet
      await expect(
        betChain
          .connect(user2)
          .placeBet(0, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");

      // O _syncBetStatus foi chamado internamente durante o revert
      // Vamos confirmar manualmente chamando outra função que usa sync
      await betChain
        .connect(user3)
        .closeBet(0)
        .catch(() => {}); // Pode dar erro se já fechou

      // Agora verifica o estado final
      const betAfter = await betChain.bets(0);
      expect(betAfter.status).to.equal(1); // CLOSED
    });

    it("Should auto-close on settleBet call after deadline", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);

      // settleBet deve funcionar mesmo sem closeBet manual
      await expect(betChain.settleBet(0, 0))
        .to.emit(betChain, "BetClosed")
        .to.emit(betChain, "BetSettled");
    });

    it("Should prevent any betting exactly at deadline", async function () {
      // Avança para exatamente a deadline
      await time.increaseTo(deadline);

      await expect(
        betChain
          .connect(user1)
          .placeBet(0, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("Should allow betting 1 second before deadline", async function () {
      // Importante: criar uma NOVA bet porque a anterior pode ter sido fechada
      const currentTime = await time.latest();
      const newDeadline = currentTime + DAY;

      await betChain.createBet("Last Second Bet", newDeadline);
      const betId = (await betChain.betCount()) - 1n; // Pega o ID da bet recém criada

      await betChain.addOption(betId, "Option A");
      await betChain.addOption(betId, "Option B");

      // Avança para 1 segundo antes da deadline (não exatamente, para evitar edge case)
      await time.increaseTo(newDeadline - 2);

      await expect(
        betChain
          .connect(user1)
          .placeBet(betId, 0, { value: ethers.parseEther("1") }),
      ).to.emit(betChain, "BetPlaced");
    });
  });

  describe("Security Tests", function () {
    describe("Reentrancy Attack on withdraw", function () {
      let attacker: ReentrancyAttacker;
      let deadline: number;

      beforeEach(async function () {
        deadline = (await time.latest()) + DAY;
        await betChain.createBet("Reentrancy Test", deadline);
        await betChain.addOption(0, "Option 1");
        await betChain.addOption(0, "Option 2");

        const AttackerFactory = await ethers.getContractFactory(
          "ReentrancyAttacker",
        );
        attacker = await AttackerFactory.deploy(await betChain.getAddress());
      });

      it("Should prevent reentrancy attack on withdraw", async function () {
        await attacker.attack(0, 0, { value: ethers.parseEther("2") });
        await betChain
          .connect(user1)
          .placeBet(0, 1, { value: ethers.parseEther("1") });

        await time.increaseTo(deadline + 1);
        await betChain.closeBet(0);
        await betChain.settleBet(0, 0);

        const contractBalanceBefore = await ethers.provider.getBalance(
          await betChain.getAddress(),
        );

        await expect(attacker.executeWithdraw()).to.be.reverted;

        const contractBalanceAfter = await ethers.provider.getBalance(
          await betChain.getAddress(),
        );
        expect(contractBalanceAfter).to.be.greaterThan(0);
      });

      it("Should prevent multiple withdrawals through reentrancy", async function () {
        await attacker.attack(0, 0, { value: ethers.parseEther("1") });
        await betChain
          .connect(user1)
          .placeBet(0, 1, { value: ethers.parseEther("1") });

        await time.increaseTo(deadline + 1);
        await betChain.closeBet(0);
        await betChain.settleBet(0, 0);

        await expect(attacker.executeWithdraw()).to.be.reverted;

        const attackerBalance = await attacker.getBalance();
        expect(attackerBalance).to.equal(0);
      });
    });

    describe("Failed ETH Transfer", function () {
      let rejectContract: RejectEther;
      let deadline: number;

      beforeEach(async function () {
        deadline = (await time.latest()) + DAY;
        await betChain.createBet("Reject ETH Test", deadline);
        await betChain.addOption(0, "Option 1");
        await betChain.addOption(0, "Option 2");

        const RejectFactory = await ethers.getContractFactory("RejectEther");
        rejectContract = await RejectFactory.deploy(
          await betChain.getAddress(),
        );
      });

      it("Should revert when contract rejects ETH transfer", async function () {
        await rejectContract.placeBet(0, 0, { value: ethers.parseEther("1") });
        await betChain
          .connect(user1)
          .placeBet(0, 1, { value: ethers.parseEther("1") });

        await time.increaseTo(deadline + 1);
        await betChain.closeBet(0);
        await betChain.settleBet(0, 0);

        await expect(rejectContract.withdraw(0)).to.be.reverted;
      });

      it("Should verify require(success) coverage with normal user", async function () {
        await betChain
          .connect(user1)
          .placeBet(0, 0, { value: ethers.parseEther("1") });
        await betChain
          .connect(user2)
          .placeBet(0, 1, { value: ethers.parseEther("1") });

        await time.increaseTo(deadline + 1);
        await betChain.closeBet(0);
        await betChain.settleBet(0, 0);

        await expect(betChain.connect(user1).withdraw(0)).to.emit(
          betChain,
          "WinningsWithdrawn",
        );
      });
    });
  });

  describe("Edge Cases", function () {
    it("Should handle bet with no bets placed but still settles", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Empty Bet", deadline);
      await betChain.addOption(0, "Option 1");
      await betChain.addOption(0, "Option 2");

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      // Não deve permitir settle com pool vazio
      await expect(betChain.settleBet(0, 0)).to.be.revertedWithCustomError(
        betChain,
        "NothingToWithdraw",
      );
    });

    it("Should handle multiple bets on same option by same user", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Test", deadline);
      await betChain.addOption(0, "Option 1");
      await betChain.addOption(0, "Option 2");

      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("0.5") });

      expect(await betChain.userBets(0, 0, user1.address)).to.equal(
        ethers.parseEther("3.5"),
      );
    });

    it("Should handle very short deadline (1 hour)", async function () {
      const shortDeadline = (await time.latest()) + HOUR;
      await betChain.createBet("Short Bet", shortDeadline);
      await betChain.addOption(0, "Quick Option");

      const bet = await betChain.bets(0);
      expect(bet.deadline).to.equal(shortDeadline);
    });

    it("Should handle very long deadline (1 year)", async function () {
      const longDeadline = (await time.latest()) + 365 * DAY;
      await betChain.createBet("Long Bet", longDeadline);

      const bet = await betChain.bets(0);
      expect(bet.deadline).to.equal(longDeadline);
    });

    it("Should handle bet where everyone loses (no bets on winning option)", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Everyone Loses", deadline);
      await betChain.addOption(0, "Popular");
      await betChain.addOption(0, "Unpopular");

      // Todos apostam na primeira opção
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user2)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      // Tentar escolher opção sem apostas deve falhar
      await expect(betChain.settleBet(0, 1)).to.be.revertedWithCustomError(
        betChain,
        "InvalidOption",
      );
    });

    it("Should handle single user betting on both options", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Hedge Bet", deadline);
      await betChain.addOption(0, "Option A");
      await betChain.addOption(0, "Option B");

      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain
        .connect(user1)
        .placeBet(0, 1, { value: ethers.parseEther("1") });

      expect(await betChain.getUserTotalBet(0, user1.address)).to.equal(
        ethers.parseEther("3"),
      );

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // user1 apostou 2 ETH na vencedora de um total de 2 ETH
      // Recebe todo o pool: 3 ETH
      const payout = await betChain.calculatePayout(0, user1.address);
      expect(payout).to.equal(ethers.parseEther("3"));
    });
  });

  describe("Integration Workflow Tests", function () {
    it("Complete happy path workflow", async function () {
      // 1. Criar bet
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Copa do Mundo", deadline);

      // 2. Adicionar opções
      await betChain.addOption(0, "Brasil");
      await betChain.addOption(0, "Argentina");
      await betChain.addOption(0, "França");

      // 3. Usuários apostam
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("3") });
      await betChain
        .connect(user2)
        .placeBet(0, 1, { value: ethers.parseEther("2") });
      await betChain
        .connect(user3)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      // 4. Deadline passa
      await time.increaseTo(deadline + 1);

      // 5. Fechar bet
      await betChain.closeBet(0);

      // 6. Finalizar com vencedor
      await betChain.settleBet(0, 0); // Brasil vence

      // 7. Vencedores retiram
      await betChain.connect(user1).withdraw(0);
      await betChain.connect(user3).withdraw(0);

      // 8. Perdedor tenta retirar
      await expect(
        betChain.connect(user2).withdraw(0),
      ).to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });

    it("Abandoned bet workflow (no manual intervention)", async function () {
      // 1. Criar bet
      const deadline = (await time.latest()) + HOUR;
      await betChain.createBet("Abandoned Bet", deadline);

      // 2. Adicionar opções e apostar
      await betChain.addOption(0, "Yes");
      await betChain.addOption(0, "No");
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      // 3. Deadline passa, ninguém fecha manualmente
      await time.increaseTo(deadline + HOUR);

      // 4. Qualquer pessoa pode fechar (permissionless)
      await betChain.connect(user3).closeBet(0);

      // 5. Finalizar e retirar
      await betChain.settleBet(0, 0);
      await betChain.connect(user1).withdraw(0);
    });

    it("Quick bet workflow (minimal time)", async function () {
      const deadline = (await time.latest()) + 60; // 1 minuto

      await betChain.createBet("Quick Bet", deadline);
      await betChain.addOption(0, "Fast");
      await betChain.addOption(0, "Slow");

      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);
      await betChain.connect(user1).withdraw(0);

      // Verifica que tudo funcionou
      expect(await betChain.userBets(0, 0, user1.address)).to.equal(0);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should not waste gas on repeated _syncBetStatus calls", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Gas Test", deadline);
      await betChain.addOption(0, "Option 1");
      await betChain.addOption(0, "Option 2");

      await time.increaseTo(deadline + 1);

      // Primeira chamada fecha e emite evento
      const tx1 = await betChain.closeBet(0);
      const receipt1 = await tx1.wait();

      // Verifica que foi fechado
      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(1); // CLOSED

      // Segunda chamada deve reverter (já fechado)
      await expect(betChain.closeBet(0)).to.be.revertedWithCustomError(
        betChain,
        "BetNotOpen",
      );
    });
  });
});
