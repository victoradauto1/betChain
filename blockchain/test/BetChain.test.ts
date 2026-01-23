import { expect } from "chai";
import { ethers } from "hardhat";
import {
  BetChain,
  ReentrancyAttacker,
  PlaceBetReentrancyAttacker,
  RejectEther,
  GasGuzzler,
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
    it("should initialize with betCount = 0", async function () {
      expect(await betChain.betCount()).to.equal(0);
    });
  });

  describe("Create Bet - Legacy Method", function () {
    it("should create a new bet with a valid deadline", async function () {
      const futureDeadline = (await time.latest()) + DAY;

      await expect(betChain.createBet("Who wins the Cup?", futureDeadline))
        .to.emit(betChain, "BetCreated")
        .withArgs(0, "Who wins the Cup?", futureDeadline);

      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(0); // OPEN
      expect(bet.optionsLocked).to.be.false;
      expect(await betChain.betCount()).to.equal(1);
    });

    it("should revert if deadline is in the past", async function () {
      const now = await time.latest();

      await expect(
        betChain.createBet("Invalid", now - DAY)
      ).to.be.revertedWithCustomError(betChain, "InvalidDeadline");
    });

    it("should revert if deadline is present", async function () {
      const now = await time.latest();

      await expect(
        betChain.createBet("Invalid", now)
      ).to.be.revertedWithCustomError(betChain, "InvalidDeadline");
    });

    it("should allow creating multiple bets", async function () {
      const futureDeadline = (await time.latest()) + DAY;

      await betChain.createBet("Bet 1", futureDeadline);
      await betChain.createBet("Bet 2", futureDeadline + HOUR);
      await betChain.createBet("Bet 3", futureDeadline + DAY);

      expect(await betChain.betCount()).to.equal(3);
    });
  });

  describe("Create Bet With Options - Recommended Method", function () {
    it("should create bet with multiple options in one transaction", async function () {
      const futureDeadline = (await time.latest()) + DAY;
      const options = ["Brazil", "Argentina", "France"];

      const tx = await betChain.createBetWithOptions(
        "World Cup Winner",
        futureDeadline,
        options
      );

      await expect(tx)
        .to.emit(betChain, "BetCreated")
        .withArgs(0, "World Cup Winner", futureDeadline);

      await expect(tx).to.emit(betChain, "OptionAdded").withArgs(0, 0, "Brazil");
      await expect(tx).to.emit(betChain, "OptionAdded").withArgs(0, 1, "Argentina");
      await expect(tx).to.emit(betChain, "OptionAdded").withArgs(0, 2, "France");

      const betOptions = await betChain.getOptions(0);
      expect(betOptions.length).to.equal(3);
      expect(betOptions[0].name).to.equal("Brazil");
      expect(betOptions[1].name).to.equal("Argentina");
      expect(betOptions[2].name).to.equal("France");
    });

    it("should revert if less than 2 options provided", async function () {
      const futureDeadline = (await time.latest()) + DAY;

      await expect(
        betChain.createBetWithOptions("Invalid", futureDeadline, ["Only One"])
      ).to.be.revertedWithCustomError(betChain, "InsufficientOptions");

      await expect(
        betChain.createBetWithOptions("Invalid", futureDeadline, [])
      ).to.be.revertedWithCustomError(betChain, "InsufficientOptions");
    });

    it("should revert if deadline is invalid", async function () {
      const now = await time.latest();
      const options = ["A", "B"];

      await expect(
        betChain.createBetWithOptions("Invalid", now, options)
      ).to.be.revertedWithCustomError(betChain, "InvalidDeadline");

      await expect(
        betChain.createBetWithOptions("Invalid", now - DAY, options)
      ).to.be.revertedWithCustomError(betChain, "InvalidDeadline");
    });

    it("should create bet with exactly 2 options", async function () {
      const futureDeadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Simple Bet", futureDeadline, ["Yes", "No"]);

      const betOptions = await betChain.getOptions(0);
      expect(betOptions.length).to.equal(2);
    });

    it("should create bet with many options", async function () {
      const futureDeadline = (await time.latest()) + DAY;
      const options = ["Option1", "Option2", "Option3", "Option4", "Option5"];

      await betChain.createBetWithOptions("Many Options", futureDeadline, options);

      const betOptions = await betChain.getOptions(0);
      expect(betOptions.length).to.equal(5);
    });
  });

  describe("Add Options - Legacy/Advanced", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Who wins?", deadline);
    });

    it("should add options before any bet is placed", async function () {
      await expect(betChain.addOption(0, "Brazil"))
        .to.emit(betChain, "OptionAdded")
        .withArgs(0, 0, "Brazil");

      await expect(betChain.addOption(0, "Argentina"))
        .to.emit(betChain, "OptionAdded")
        .withArgs(0, 1, "Argentina");

      const options = await betChain.getOptions(0);
      expect(options.length).to.equal(2);
      expect(options[0].name).to.equal("Brazil");
      expect(options[1].name).to.equal("Argentina");
    });

    it("should lock options after first bet", async function () {
      await betChain.addOption(0, "Brazil");
      await betChain.addOption(0, "Argentina");

      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await expect(
        betChain.addOption(0, "France")
      ).to.be.revertedWithCustomError(betChain, "OptionsLocked");
    });

    it("should revert when adding option to non-existent bet", async function () {
      await expect(
        betChain.addOption(999, "Invalid")
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("should revert when adding option to closed bet", async function () {
      await betChain.addOption(0, "A");
      await betChain.addOption(0, "B");

      await time.increaseTo(deadline + 1);

      await expect(
        betChain.addOption(0, "C")
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("should revert when adding option to settled bet", async function () {
      await betChain.addOption(0, "A");
      await betChain.addOption(0, "B");

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(
        betChain.addOption(0, "C")
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });
  });

  describe("Place Bet", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Who wins?", deadline, ["Brazil", "Argentina"]);
    });

    it("should place bets and update pools correctly", async function () {
      await expect(
        betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") })
      )
        .to.emit(betChain, "BetPlaced")
        .withArgs(0, 0, user1.address, ethers.parseEther("1"));

      await betChain
        .connect(user2)
        .placeBet(0, 1, { value: ethers.parseEther("2") });

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(ethers.parseEther("3"));

      const options = await betChain.getOptions(0);
      expect(options[0].totalAmount).to.equal(ethers.parseEther("1"));
      expect(options[1].totalAmount).to.equal(ethers.parseEther("2"));
    });

    it("should allow multiple bets from same user on same option", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("2") });

      const userBet = await betChain.getUserBet(0, 0, user1.address);
      expect(userBet).to.equal(ethers.parseEther("3"));
    });

    it("should allow user to bet on multiple options", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(0, 1, { value: ethers.parseEther("2") });

      const userBet0 = await betChain.getUserBet(0, 0, user1.address);
      const userBet1 = await betChain.getUserBet(0, 1, user1.address);
      const totalBet = await betChain.getUserTotalBet(0, user1.address);

      expect(userBet0).to.equal(ethers.parseEther("1"));
      expect(userBet1).to.equal(ethers.parseEther("2"));
      expect(totalBet).to.equal(ethers.parseEther("3"));
    });

    it("should revert if betting after deadline", async function () {
      await time.increaseTo(deadline + 1);

      await expect(
        betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("should revert if betting on invalid option", async function () {
      await expect(
        betChain.connect(user1).placeBet(0, 5, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(betChain, "InvalidOption");
    });

    it("should revert if betting with zero value", async function () {
      await expect(
        betChain.connect(user1).placeBet(0, 0, { value: 0 })
      ).to.be.revertedWithCustomError(betChain, "InvalidAmount");
    });

    it("should revert if betting on non-existent bet", async function () {
      await expect(
        betChain.connect(user1).placeBet(999, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("should revert if bet has insufficient options (edge case)", async function () {
      const futureDeadline = (await time.latest()) + DAY;
      await betChain.createBet("Edge Case", futureDeadline);
      await betChain.addOption(1, "Only One");

      await expect(
        betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(betChain, "InsufficientOptions");
    });

    it("should lock options on first bet", async function () {
      const futureDeadline = (await time.latest()) + DAY;
      await betChain.createBet("Lock Test", futureDeadline);
      await betChain.addOption(1, "A");
      await betChain.addOption(1, "B");

      let bet = await betChain.bets(1);
      expect(bet.optionsLocked).to.be.false;

      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("1") });

      bet = await betChain.bets(1);
      expect(bet.optionsLocked).to.be.true;
    });
  });

  describe("Close Bet - Permissionless", function () {
    it("should allow anyone to close after deadline", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Close test", deadline, ["A", "B"]);

      await time.increaseTo(deadline + 1);

      await expect(betChain.connect(user2).closeBet(0))
        .to.emit(betChain, "BetClosed")
        .withArgs(0);

      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(1); // CLOSED
    });

    it("should revert if closing before deadline", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Early Close", deadline, ["A", "B"]);

      await expect(
        betChain.closeBet(0)
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("should revert if closing already closed bet", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Double Close", deadline, ["A", "B"]);

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      await expect(
        betChain.closeBet(0)
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });

    it("should revert if closing non-existent bet", async function () {
      await expect(
        betChain.closeBet(999)
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("should auto-close via _syncBetStatus on settle", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Auto Close", deadline, ["A", "B"]);
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);

      // Should auto-close when settling
      await expect(betChain.settleBet(0, 0))
        .to.emit(betChain, "BetClosed")
        .withArgs(0);
    });
  });

  describe("Settle Bet", function () {
    it("should settle correctly with valid winning option", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Settle test", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      await expect(betChain.settleBet(0, 0))
        .to.emit(betChain, "BetSettled")
        .withArgs(0, 0);

      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(2); // SETTLED
      expect(bet.winningOption).to.equal(0);
    });

    it("should revert if settling non-closed bet", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Not Closed", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await expect(
        betChain.settleBet(0, 0)
      ).to.be.revertedWithCustomError(betChain, "BetNotClosed");
    });

    it("should revert if settling with invalid option", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Invalid Option", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      await expect(
        betChain.settleBet(0, 5)
      ).to.be.revertedWithCustomError(betChain, "InvalidOption");
    });

    it("should revert if winning option has zero bets", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Zero Bets", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      await expect(
        betChain.settleBet(0, 1) // Option B has no bets
      ).to.be.revertedWithCustomError(betChain, "InvalidOption");
    });

    it("should revert if total pool is zero", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("No Pool", deadline, ["A", "B"]);

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      await expect(
        betChain.settleBet(0, 0)
      ).to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });

    it("should revert if settling non-existent bet", async function () {
      await expect(
        betChain.settleBet(999, 0)
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("should revert if settling already settled bet", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Double Settle", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(
        betChain.settleBet(0, 0)
      ).to.be.revertedWithCustomError(betChain, "BetNotClosed");
    });
  });

  describe("Withdraw", function () {
    it("should distribute winnings proportionally", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Withdraw test", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain.connect(user2).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user3).placeBet(0, 1, { value: ethers.parseEther("3") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // Total pool: 6 ETH
      // Winner pool (option 0): 3 ETH
      // user1 bet: 2 ETH -> payout: (6 * 2) / 3 = 4 ETH
      // user2 bet: 1 ETH -> payout: (6 * 1) / 3 = 2 ETH

      const balanceBefore1 = await ethers.provider.getBalance(user1.address);
      const tx1 = await betChain.connect(user1).withdraw(0);
      const receipt1 = await tx1.wait();
      const gasUsed1 = receipt1!.gasUsed * receipt1!.gasPrice;
      const balanceAfter1 = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter1 - balanceBefore1 + gasUsed1).to.equal(ethers.parseEther("4"));

      const balanceBefore2 = await ethers.provider.getBalance(user2.address);
      const tx2 = await betChain.connect(user2).withdraw(0);
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2!.gasUsed * receipt2!.gasPrice;
      const balanceAfter2 = await ethers.provider.getBalance(user2.address);

      expect(balanceAfter2 - balanceBefore2 + gasUsed2).to.equal(ethers.parseEther("2"));
    });

    it("should emit WinningsWithdrawn event", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Event test", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(betChain.connect(user1).withdraw(0))
        .to.emit(betChain, "WinningsWithdrawn")
        .withArgs(0, user1.address, ethers.parseEther("2"));
    });

    it("should prevent double withdrawal", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Double withdraw", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await betChain.connect(user1).withdraw(0);

      await expect(
        betChain.connect(user1).withdraw(0)
      ).to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });

    it("should revert if user did not bet on winning option", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Loser withdraw", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(
        betChain.connect(user2).withdraw(0)
      ).to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });

    it("should revert if withdrawing from non-settled bet", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Not settled", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await expect(
        betChain.connect(user1).withdraw(0)
      ).to.be.revertedWithCustomError(betChain, "BetNotSettled");
    });

    it("should revert if withdrawing from non-existent bet", async function () {
      await expect(
        betChain.connect(user1).withdraw(999)
      ).to.be.revertedWithCustomError(betChain, "BetDoesNotExist");
    });

    it("should handle single winner taking all", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Winner takes all", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("5") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await betChain.connect(user1).withdraw(0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(ethers.parseEther("6"));
    });

    it("should handle multiple winners with equal bets", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Equal winners", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user3).placeBet(0, 1, { value: ethers.parseEther("2") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // Total: 4 ETH, Winning pool: 2 ETH
      // Each winner gets: (4 * 1) / 2 = 2 ETH

      const balanceBefore1 = await ethers.provider.getBalance(user1.address);
      const tx1 = await betChain.connect(user1).withdraw(0);
      const receipt1 = await tx1.wait();
      const gasUsed1 = receipt1!.gasUsed * receipt1!.gasPrice;
      const balanceAfter1 = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter1 - balanceBefore1 + gasUsed1).to.equal(ethers.parseEther("2"));

      const balanceBefore2 = await ethers.provider.getBalance(user2.address);
      const tx2 = await betChain.connect(user2).withdraw(0);
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2!.gasUsed * receipt2!.gasPrice;
      const balanceAfter2 = await ethers.provider.getBalance(user2.address);

      expect(balanceAfter2 - balanceBefore2 + gasUsed2).to.equal(ethers.parseEther("2"));
    });
  });

  describe("Security - Reentrancy", function () {
    it("should prevent reentrancy on withdraw", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Reentrancy test", deadline, ["A", "B"]);

      const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await AttackerFactory.deploy(await betChain.getAddress());

      await attacker.attack(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(0, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(attacker.executeWithdraw()).to.be.reverted;
    });

    it("should handle rejected ETH transfers gracefully", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Reject test", deadline, ["A", "B"]);

      const RejectEtherFactory = await ethers.getContractFactory("RejectEther");
      const rejecter = await RejectEtherFactory.deploy(await betChain.getAddress());

      await rejecter.placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(0, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // Should revert because contract rejects ETH
      await expect(rejecter.withdraw(0)).to.be.revertedWith("Transfer failed");
    });

    it("should safely handle gas guzzler contracts", async function () {
  const deadline = (await time.latest()) + DAY;
  await betChain.createBetWithOptions("Gas test", deadline, ["A", "B"]);

  const GasGuzzlerFactory = await ethers.getContractFactory("GasGuzzler");
  const guzzler = await GasGuzzlerFactory.deploy(await betChain.getAddress());

  await guzzler.placeBet(0, 0, { value: ethers.parseEther("1") });
  await betChain.connect(user1).placeBet(0, 1, { value: ethers.parseEther("1") });

  await time.increaseTo(deadline + 1);
  await betChain.closeBet(0);
  await betChain.settleBet(0, 0);

  // ✅ Should NOT revert — call forwards gas safely
  await expect(guzzler.withdraw(0)).to.not.be.reverted;
});
  });

  describe("View Functions", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("View Test", deadline, ["A", "B", "C"]);
    });

    it("isOpen should return correct status", async function () {
      expect(await betChain.isOpen(0)).to.be.true;

      await time.increaseTo(deadline + 1);
      expect(await betChain.isOpen(0)).to.be.false;
    });

    it("isExpired should return correct status", async function () {
      expect(await betChain.isExpired(0)).to.be.false;

      await time.increaseTo(deadline + 1);
      expect(await betChain.isExpired(0)).to.be.true;
    });

    it("canClose should return correct status", async function () {
      expect(await betChain.canClose(0)).to.be.false;

      await time.increaseTo(deadline + 1);
      expect(await betChain.canClose(0)).to.be.true;

      await betChain.closeBet(0);
      expect(await betChain.canClose(0)).to.be.false;
    });

    it("canSettle should return correct status", async function () {
      expect(await betChain.canSettle(0)).to.be.false;

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      expect(await betChain.canSettle(0)).to.be.true;

      await betChain.closeBet(0);
      expect(await betChain.canSettle(0)).to.be.true;

      await betChain.settleBet(0, 0);
      expect(await betChain.canSettle(0)).to.be.false;
    });

    it("getOptions should return all options", async function () {
      const options = await betChain.getOptions(0);
      expect(options.length).to.equal(3);
      expect(options[0].name).to.equal("A");
      expect(options[1].name).to.equal("B");
      expect(options[2].name).to.equal("C");
      expect(options[0].totalAmount).to.equal(0);
    });

    it("getBetInfo should return complete bet information", async function () {
      const info = await betChain.getBetInfo(0);

      expect(info.title).to.equal("View Test");
      expect(info.storedStatus).to.equal(0); // OPEN
      expect(info.logicalStatus).to.equal(0); // OPEN
      expect(info.deadline).to.equal(deadline);
      expect(info.totalPool).to.equal(0);
      expect(info.optionsLocked).to.be.false;
      expect(info.expired).to.be.false;
    });

    it("getBetInfo should show expired status after deadline", async function () {
      await time.increaseTo(deadline + 1);

      const info = await betChain.getBetInfo(0);
      expect(info.expired).to.be.true;
      expect(info.logicalStatus).to.equal(1); // CLOSED (logical)
      expect(info.storedStatus).to.equal(0); // OPEN (still in storage)
    });

    it("calculatePayout should return correct values", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain.connect(user2).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user3).placeBet(0, 1, { value: ethers.parseEther("3") });

      // Before settling, payout should be 0
      expect(await betChain.calculatePayout(0, user1.address)).to.equal(0);

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // Total: 6 ETH, Winning pool: 3 ETH
      // user1: (6 * 2) / 3 = 4 ETH
      // user2: (6 * 1) / 3 = 2 ETH
      // user3: 0 (loser)

      expect(await betChain.calculatePayout(0, user1.address)).to.equal(ethers.parseEther("4"));
      expect(await betChain.calculatePayout(0, user2.address)).to.equal(ethers.parseEther("2"));
      expect(await betChain.calculatePayout(0, user3.address)).to.equal(0);
    });

    it("getUserBet should return correct amount", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("2") });

      expect(await betChain.getUserBet(0, 0, user1.address)).to.equal(ethers.parseEther("3"));
      expect(await betChain.getUserBet(0, 1, user1.address)).to.equal(0);
    });

    it("getUserTotalBet should return sum across all options", async function () {
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(0, 1, { value: ethers.parseEther("2") });
      await betChain.connect(user1).placeBet(0, 2, { value: ethers.parseEther("3") });

      expect(await betChain.getUserTotalBet(0, user1.address)).to.equal(ethers.parseEther("6"));
    });
  });

  describe("Edge Cases and Complex Scenarios", function () {
    it("should handle bet with many participants", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Many users", deadline, ["A", "B"]);

      const signers = await ethers.getSigners();

      // Place bets from multiple users
      for (let i = 0; i < 10; i++) {
        await betChain
          .connect(signers[i])
          .placeBet(0, i % 2, { value: ethers.parseEther("1") });
      }

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(ethers.parseEther("10"));
    });

    it("should handle bet where everyone wins", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("All winners", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user3).placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // Each gets their money back (no profit since no losers)
      expect(await betChain.calculatePayout(0, user1.address)).to.equal(ethers.parseEther("1"));
      expect(await betChain.calculatePayout(0, user2.address)).to.equal(ethers.parseEther("1"));
      expect(await betChain.calculatePayout(0, user3.address)).to.equal(ethers.parseEther("1"));
    });

    it("should handle very small bet amounts", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Small bets", deadline, ["A", "B"]);

      await betChain.connect(user1).placeBet(0, 0, { value: 1 }); // 1 wei
      await betChain.connect(user2).placeBet(0, 1, { value: 2 }); // 2 wei

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      expect(await betChain.calculatePayout(0, user1.address)).to.equal(3);
    });

    it("should handle bet with very large amounts", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Large bets", deadline, ["A", "B"]);

      const largeAmount = ethers.parseEther("1000");

      await betChain.connect(user1).placeBet(0, 0, { value: largeAmount });
      await betChain.connect(user2).placeBet(0, 1, { value: largeAmount });

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(largeAmount * 2n);
    });

    it("should handle multiple sequential bets", async function () {
      const deadline1 = (await time.latest()) + DAY;
      const deadline2 = (await time.latest()) + 2 * DAY;
      const deadline3 = (await time.latest()) + 3 * DAY;

      await betChain.createBetWithOptions("Bet 1", deadline1, ["A", "B"]);
      await betChain.createBetWithOptions("Bet 2", deadline2, ["C", "D"]);
      await betChain.createBetWithOptions("Bet 3", deadline3, ["E", "F"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("2") });
      await betChain.connect(user1).placeBet(2, 0, { value: ethers.parseEther("3") });

      expect(await betChain.getUserBet(0, 0, user1.address)).to.equal(ethers.parseEther("1"));
      expect(await betChain.getUserBet(1, 0, user1.address)).to.equal(ethers.parseEther("2"));
      expect(await betChain.getUserBet(2, 0, user1.address)).to.equal(ethers.parseEther("3"));
    });

    it("should maintain state separation between different bets", async function () {
      const deadline = (await time.latest()) + DAY;

      await betChain.createBetWithOptions("Bet A", deadline, ["X", "Y"]);
      await betChain.createBetWithOptions("Bet B", deadline + HOUR, ["Z", "W"]);

      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user1).placeBet(1, 1, { value: ethers.parseEther("2") });

      await time.increaseTo(deadline + 1);

      // Bet 0 can be closed
      expect(await betChain.canClose(0)).to.be.true;
      // Bet 1 cannot be closed yet
      expect(await betChain.canClose(1)).to.be.false;

      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // Bet 0 is settled, Bet 1 is still open
      const bet0 = await betChain.bets(0);
      const bet1 = await betChain.bets(1);

      expect(bet0.status).to.equal(2); // SETTLED
      expect(bet1.status).to.equal(0); // OPEN
    });

    it("should handle rounding in payout calculations", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Rounding test", deadline, ["A", "B"]);

      // Create scenario where division doesn't result in whole numbers
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(0, 0, { value: ethers.parseEther("2") });
      await betChain.connect(user3).placeBet(0, 1, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      // Total: 4 ETH, Winning pool: 3 ETH
      // user1: (4 * 1) / 3 = 1.333... ETH (integer division)
      // user2: (4 * 2) / 3 = 2.666... ETH (integer division)

      const payout1 = await betChain.calculatePayout(0, user1.address);
      const payout2 = await betChain.calculatePayout(0, user2.address);

      // Verify integer division
      expect(payout1).to.equal((ethers.parseEther("4") * ethers.parseEther("1")) / ethers.parseEther("3"));
      expect(payout2).to.equal((ethers.parseEther("4") * ethers.parseEther("2")) / ethers.parseEther("3"));
    });
  });

  describe("Bet Lifecycle - Complete Flow", function () {
    it("should complete full lifecycle successfully", async function () {
      // 1. Create bet
      const deadline = (await time.latest()) + DAY;
      await betChain.createBetWithOptions("Full lifecycle", deadline, ["Team A", "Team B", "Draw"]);

      expect(await betChain.isOpen(0)).to.be.true;

      // 2. Multiple users place bets
      await betChain.connect(user1).placeBet(0, 0, { value: ethers.parseEther("3") });
      await betChain.connect(user2).placeBet(0, 1, { value: ethers.parseEther("2") });
      await betChain.connect(user3).placeBet(0, 0, { value: ethers.parseEther("1") });

      const betAfterBets = await betChain.bets(0);
      expect(betAfterBets.totalPool).to.equal(ethers.parseEther("6"));
      expect(betAfterBets.optionsLocked).to.be.true;

      // 3. Wait for deadline
      await time.increaseTo(deadline + 1);
      expect(await betChain.isExpired(0)).to.be.true;
      expect(await betChain.canClose(0)).to.be.true;

      // 4. Close bet
      await betChain.closeBet(0);
      const betAfterClose = await betChain.bets(0);
      expect(betAfterClose.status).to.equal(1); // CLOSED

      // 5. Settle bet (Team A wins - option 0)
      await betChain.settleBet(0, 0);
      const betAfterSettle = await betChain.bets(0);
      expect(betAfterSettle.status).to.equal(2); // SETTLED
      expect(betAfterSettle.winningOption).to.equal(0);

      // 6. Winners withdraw
      // user1 bet 3 ETH on winning option (total winning pool: 4 ETH)
      // user1 payout: (6 * 3) / 4 = 4.5 ETH
      const user1Payout = await betChain.calculatePayout(0, user1.address);
      expect(user1Payout).to.equal(ethers.parseEther("4.5"));

      await betChain.connect(user1).withdraw(0);

      // user3 bet 1 ETH on winning option
      // user3 payout: (6 * 1) / 4 = 1.5 ETH
      const user3Payout = await betChain.calculatePayout(0, user3.address);
      expect(user3Payout).to.equal(ethers.parseEther("1.5"));

      await betChain.connect(user3).withdraw(0);

      // user2 bet on losing option - cannot withdraw
      await expect(
        betChain.connect(user2).withdraw(0)
      ).to.be.revertedWithCustomError(betChain, "NothingToWithdraw");
    });
  });
});