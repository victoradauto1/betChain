import { expect } from "chai";
import { ethers } from "hardhat";
import { BetChain } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BetChain Contract", function () {
  let betChain: BetChain;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const BetChainFactory = await ethers.getContractFactory("BetChain");
    betChain = await BetChainFactory.deploy();
    await betChain.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct FEE", async function () {
      expect(await betChain.FEE()).to.equal(100);
    });

    it("Should start with nextId = 0", async function () {
      expect(await betChain.nextId()).to.equal(0);
    });
  });

  describe("Create Bet", function () {
    it("Should create a bet successfully", async function () {
      const tx = await betChain.createBet(
        "Test Bet",
        "Description",
        "https://image.com/test.jpg",
        ["Option A", "Option B"],
        0 // No deadline
      );

      await expect(tx)
        .to.emit(betChain, "BetCreated")
        .withArgs(1, owner.address, "Test Bet", 0);

      expect(await betChain.getTotalBets()).to.equal(1);
    });

    it("Should fail with less than 2 options", async function () {
      await expect(
        betChain.createBet("Test", "Desc", "", ["Only One"], 0)
      ).to.be.revertedWith("At least 2 options");
    });

    it("Should fail with more than 10 options", async function () {
      const options = Array(11).fill("Option");
      await expect(
        betChain.createBet("Test", "Desc", "", options, 0)
      ).to.be.revertedWith("Max 10 options");
    });

    it("Should fail with empty title", async function () {
      await expect(
        betChain.createBet("", "Desc", "", ["A", "B"], 0)
      ).to.be.revertedWith("Empty title");
    });

    it("Should fail with invalid deadline", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      await expect(
        betChain.createBet("Test", "Desc", "", ["A", "B"], pastTime)
      ).to.be.revertedWith("Invalid deadline");
    });

    it("Should create bet with future deadline", async function () {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        betChain.createBet("Test", "Desc", "", ["A", "B"], futureTime)
      ).to.not.be.reverted;
    });
  });

  describe("Place Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Test Bet", "Desc", "", ["A", "B"], 0);
    });

    it("Should place a bet successfully", async function () {
      const betAmount = ethers.parseEther("0.1");

      await expect(
        betChain.connect(user1).placeBet(1, 0, { value: betAmount })
      )
        .to.emit(betChain, "BetPlaced")
        .withArgs(1, 0, user1.address, betAmount);

      const userBet = await betChain.getUserBetAmount(1, 0, user1.address);
      expect(userBet).to.equal(betAmount);
    });

    it("Should fail with zero amount", async function () {
      await expect(
        betChain.connect(user1).placeBet(1, 0, { value: 0 })
      ).to.be.revertedWith("Zero amount");
    });

    it("Should fail with invalid option", async function () {
      await expect(
        betChain.connect(user1).placeBet(1, 5, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Invalid option");
    });

    it("Should fail on inactive bet", async function () {
      await betChain.createBet("Test 2", "Desc", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(2, 0, { value: ethers.parseEther("1") });
      await betChain.finalizeBet(2, 0);

      await expect(
        betChain.connect(user2).placeBet(2, 0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Bet inactive");
    });

    it("Should accumulate multiple bets", async function () {
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("0.5") });
      await betChain.connect(user2).placeBet(1, 1, { value: ethers.parseEther("0.3") });
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("0.2") });

      const user1Total = await betChain.getUserBetAmount(1, 0, user1.address);
      expect(user1Total).to.equal(ethers.parseEther("0.7"));

      const info = await betChain.getBetFullInfo(1);
      expect(info[4]).to.equal(ethers.parseEther("1.0")); // totalPool
    });

    it("Should fail after deadline", async function () {
      const futureTime = (await time.latest()) + 3600;
      await betChain.createBet("Deadline Test", "Desc", "", ["A", "B"], futureTime);

      // Move time past deadline
      await time.increaseTo(futureTime + 1);

      await expect(
        betChain.connect(user1).placeBet(2, 0, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Deadline passed");
    });
  });

  describe("Finalize Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Test Bet", "Desc", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("0.5") });
      await betChain.connect(user2).placeBet(1, 1, { value: ethers.parseEther("0.3") });
    });

    it("Should finalize bet successfully", async function () {
      await expect(betChain.finalizeBet(1, 0))
        .to.emit(betChain, "BetFinalized")
        .withArgs(1, 0);

      const info = await betChain.getBetFullInfo(1);
      expect(info[5]).to.equal(false); // active
      expect(info[6]).to.equal(true); // finalized
      expect(info[9]).to.equal(0); // winningOption
    });

    it("Should fail if not creator", async function () {
      await expect(
        betChain.connect(user1).finalizeBet(1, 0)
      ).to.be.revertedWith("Not creator");
    });

    it("Should fail with invalid option", async function () {
      await expect(betChain.finalizeBet(1, 5)).to.be.revertedWith("Invalid option");
    });

    it("Should fail if already finalized", async function () {
      await betChain.finalizeBet(1, 0);
      await expect(betChain.finalizeBet(1, 0)).to.be.revertedWith("Already finalized");
    });

    it("Should fail if pool too small", async function () {
      await betChain.createBet("Small Bet", "Desc", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(2, 0, { value: 50 }); // Less than FEE

      await expect(betChain.finalizeBet(2, 0)).to.be.revertedWith("Pool too small");
    });
  });

  describe("Withdraw Prize", function () {
    beforeEach(async function () {
      await betChain.createBet("Test Bet", "Desc", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("0.6") });
      await betChain.connect(user2).placeBet(1, 0, { value: ethers.parseEther("0.4") });
      await betChain.connect(user3).placeBet(1, 1, { value: ethers.parseEther("0.5") });
      await betChain.finalizeBet(1, 0); // Option 0 wins
    });

    it("Should withdraw prize correctly", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await betChain.connect(user1).withdrawPrize(1);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // Total pool = 1.5 ETH, Fee = 100 wei, Prize pool = 1.5 ETH - 100 wei
      // User1 bet 0.6 ETH out of 1.0 ETH on winning option
      // Prize = (1.5 ETH - 100 wei) * 0.6 / 1.0
      const expectedPrize = (ethers.parseEther("1.5") - 100n) * 6n / 10n;

      expect(balanceAfter + gasUsed - balanceBefore).to.be.closeTo(
        expectedPrize,
        ethers.parseEther("0.001")
      );
    });

    it("Should fail if bet not finalized", async function () {
      await betChain.createBet("Test 2", "Desc", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(2, 0, { value: ethers.parseEther("0.1") });

      await expect(
        betChain.connect(user1).withdrawPrize(2)
      ).to.be.revertedWith("Not finalized");
    });

    it("Should fail if user didn't bet on winning option", async function () {
      await expect(
        betChain.connect(user3).withdrawPrize(1)
      ).to.be.revertedWith("No winnings");
    });

    it("Should fail on double withdrawal", async function () {
      await betChain.connect(user1).withdrawPrize(1);
      await expect(
        betChain.connect(user1).withdrawPrize(1)
      ).to.be.revertedWith("No winnings");
    });
  });

  describe("Withdraw Fee", function () {
    beforeEach(async function () {
      await betChain.createBet("Test Bet", "Desc", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.finalizeBet(1, 0);
    });

    it("Should withdraw fee successfully", async function () {
      const balanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await betChain.withdrawFee(1);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter + gasUsed - balanceBefore).to.equal(100);
    });

    it("Should fail if not creator", async function () {
      await expect(
        betChain.connect(user1).withdrawFee(1)
      ).to.be.revertedWith("Not creator");
    });

    it("Should fail if already withdrawn", async function () {
      await betChain.withdrawFee(1);
      await expect(betChain.withdrawFee(1)).to.be.revertedWith("Fee already claimed");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await betChain.createBet("Bet 1", "Desc 1", "img1.jpg", ["A", "B"], 0);
      await betChain.createBet("Bet 2", "Desc 2", "img2.jpg", ["X", "Y", "Z"], 0);
    });

    it("Should get all bets with pagination", async function () {
      const result = await betChain.getAllBets(1, 2);

      expect(result[0].length).to.equal(2); // ids
      expect(result[2][0]).to.equal("Bet 1"); // titles
      expect(result[2][1]).to.equal("Bet 2");
    });

    it("Should get bet full info", async function () {
      const info = await betChain.getBetFullInfo(1);

      expect(info[1]).to.equal("Bet 1"); // title
      expect(info[2]).to.equal("Desc 1"); // description
      expect(info[7]).to.equal(2); // optionsCount
    });

    it("Should get bet options", async function () {
      const [names, totals] = await betChain.getBetOptions(2);

      expect(names.length).to.equal(3);
      expect(names[0]).to.equal("X");
      expect(names[1]).to.equal("Y");
      expect(names[2]).to.equal("Z");
    });

    it("Should get user bet amount", async function () {
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("0.5") });

      const amount = await betChain.getUserBetAmount(1, 0, user1.address);
      expect(amount).to.equal(ethers.parseEther("0.5"));
    });

    it("Should return empty arrays for invalid range", async function () {
      const result = await betChain.getAllBets(100, 10);

      expect(result[0].length).to.equal(0); // ids
      expect(result[2].length).to.equal(0); // titles
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple winners withdrawing prizes", async function () {
      await betChain.createBet("Multi Winner", "Desc", "", ["A", "B"], 0);
      
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("0.4") });
      await betChain.connect(user2).placeBet(1, 0, { value: ethers.parseEther("0.6") });
      await betChain.connect(user3).placeBet(1, 1, { value: ethers.parseEther("0.5") });
      
      await betChain.finalizeBet(1, 0);

      // Both winners should be able to withdraw
      await expect(betChain.connect(user1).withdrawPrize(1)).to.not.be.reverted;
      await expect(betChain.connect(user2).withdrawPrize(1)).to.not.be.reverted;
    });

    it("Should handle bet with 10 options", async function () {
      const options = Array(10).fill(0).map((_, i) => `Option ${i + 1}`);
      await expect(
        betChain.createBet("Max Options", "Desc", "", options, 0)
      ).to.not.be.reverted;

      const [names] = await betChain.getBetOptions(1);
      expect(names.length).to.equal(10);
    });

    it("Should handle very small bets", async function () {
      await betChain.createBet("Small Bet", "Desc", "", ["A", "B"], 0);
      
      // Bet 1 wei
      await expect(
        betChain.connect(user1).placeBet(1, 0, { value: 1 })
      ).to.not.be.reverted;
    });
  });
});