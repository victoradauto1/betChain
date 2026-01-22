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
    it("should initialize with betCount = 0", async function () {
      expect(await betChain.betCount()).to.equal(0);
    });
  });

  describe("Create Bet", function () {
    it("should create a new bet with a valid deadline", async function () {
      const futureDeadline = (await time.latest()) + DAY;

      await expect(betChain.createBet("Who wins the Cup?", futureDeadline))
        .to.emit(betChain, "BetCreated")
        .withArgs(0, "Who wins the Cup?", futureDeadline);

      const bet = await betChain.bets(0);
      expect(bet.status).to.equal(0);
      expect(bet.optionsLocked).to.be.false;
    });

    it("should revert if deadline is in the past or present", async function () {
      const now = await time.latest();

      await expect(
        betChain.createBet("Invalid", now),
      ).to.be.revertedWithCustomError(betChain, "InvalidDeadline");

      await expect(
        betChain.createBet("Invalid", now - DAY),
      ).to.be.revertedWithCustomError(betChain, "InvalidDeadline");
    });
  });

  describe("Add Options", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Who wins?", deadline);
    });

    it("should add options before any bet is placed", async function () {
      await betChain.addOption(0, "Brazil");
      await betChain.addOption(0, "Argentina");

      const options = await betChain.getOptions(0);
      expect(options.length).to.equal(2);
    });

    it("should lock options after first bet", async function () {
      await betChain.addOption(0, "Brazil");
      await betChain.addOption(0, "Argentina");

      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await expect(
        betChain.addOption(0, "France"),
      ).to.be.revertedWithCustomError(betChain, "OptionsLocked");
    });
  });

  describe("Place Bet", function () {
    let deadline: number;

    beforeEach(async function () {
      deadline = (await time.latest()) + DAY;
      await betChain.createBet("Who wins?", deadline);
      await betChain.addOption(0, "Brazil");
      await betChain.addOption(0, "Argentina");
    });

    it("should place bets and update pools correctly", async function () {
      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });
      await betChain
        .connect(user2)
        .placeBet(0, 1, { value: ethers.parseEther("2") });

      const bet = await betChain.bets(0);
      expect(bet.totalPool).to.equal(ethers.parseEther("3"));
    });

    it("should revert if betting after deadline", async function () {
      await time.increaseTo(deadline + 1);

      await expect(
        betChain
          .connect(user1)
          .placeBet(0, 0, { value: ethers.parseEther("1") }),
      ).to.be.revertedWithCustomError(betChain, "BetNotOpen");
    });
  });

  describe("Close Bet - Permissionless", function () {
    it("should allow anyone to close after deadline", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Close test", deadline);
      await betChain.addOption(0, "A");
      await betChain.addOption(0, "B");

      await time.increaseTo(deadline + 1);

      await expect(betChain.connect(user2).closeBet(0))
        .to.emit(betChain, "BetClosed")
        .withArgs(0);
    });
  });

  describe("Settle Bet", function () {
    it("should settle correctly with valid winning option", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Settle test", deadline);
      await betChain.addOption(0, "A");
      await betChain.addOption(0, "B");

      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);

      await expect(betChain.settleBet(0, 0))
        .to.emit(betChain, "BetSettled")
        .withArgs(0, 0);
    });
  });

  describe("Withdraw", function () {
    it("should distribute winnings proportionally", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Withdraw test", deadline);
      await betChain.addOption(0, "A");
      await betChain.addOption(0, "B");

      await betChain
        .connect(user1)
        .placeBet(0, 0, { value: ethers.parseEther("2") });
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

  describe("Security", function () {
    it("should prevent reentrancy on withdraw", async function () {
      const deadline = (await time.latest()) + DAY;
      await betChain.createBet("Reentrancy", deadline);
      await betChain.addOption(0, "A");
      await betChain.addOption(0, "B");

      const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await Attacker.deploy(await betChain.getAddress());

      await attacker.attack(0, 0, { value: ethers.parseEther("1") });

      await time.increaseTo(deadline + 1);
      await betChain.closeBet(0);
      await betChain.settleBet(0, 0);

      await expect(attacker.executeWithdraw()).to.be.reverted;
    });
  });
});
