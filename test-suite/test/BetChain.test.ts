import { expect } from "chai";
import { ethers } from "hardhat";

describe("BetChain", function () {
  let betChain: any;
  let deployer: any;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeEach(async function () {
    [deployer, user1, user2, user3] = await ethers.getSigners();
    const BetChain = await ethers.getContractFactory("BetChain", deployer);
    betChain = await BetChain.deploy();
    await betChain.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should initialize with correct constants", async function () {
      expect(await betChain.FEE()).to.equal(100n);
      expect(await betChain.nextId()).to.equal(0n);
    });
  });

  describe("Create Bet", function () {
    it("Should create a valid bet", async function () {
      const options = ["A", "B"];
      await expect(
        betChain.createBet("Title", "Desc", "url", options)
      ).to.emit(betChain, "BetCreated");

      const betInfo = await betChain.getBetInfo(1);
      expect(betInfo.creator).to.equal(deployer.address);
      expect(betInfo.title).to.equal("Title");
      expect(betInfo.active).to.be.true;
    });

    it("Should revert if less than 2 options", async function () {
      await expect(
        betChain.createBet("Bad", "Desc", "url", ["A"])
      ).to.be.revertedWith("Must have at least 2 options");
    });

    it("Should revert if more than 10 options", async function () {
      const tooMany = Array(11).fill("x");
      await expect(
        betChain.createBet("Too Many", "Desc", "url", tooMany)
      ).to.be.revertedWith("Maximum 10 options allowed");
    });
  });

  describe("Place Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Bet", "Desc", "img", ["A", "B"]);
    });

    it("Should allow placing bet successfully", async function () {
      const amount = ethers.parseEther("1");
      await expect(betChain.placeBet(1, 0, { value: amount }))
        .to.emit(betChain, "BetPlaced")
        .withArgs(1, 0, deployer.address, amount);

      const userBet = await betChain.getUserBet(1, 0, deployer.address);
      expect(userBet).to.equal(amount);
    });

    it("Should revert if inactive or finalized", async function () {
      await betChain.finalizeBet(1, 0); // finalize first
      await expect(
        betChain.placeBet(1, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Bet is not active");
    });

    it("Should revert if zero value", async function () {
      await expect(
        betChain.placeBet(1, 0, { value: 0 })
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert if invalid option", async function () {
      await expect(
        betChain.placeBet(1, 5, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Invalid option");
    });
  });

  describe("Finalize Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Bet", "Desc", "img", ["A", "B"]);
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("1") });
    });

    it("Should finalize successfully", async function () {
      await expect(betChain.finalizeBet(1, 0))
        .to.emit(betChain, "BetFinalized")
        .withArgs(1, 0);

      const info = await betChain.getBetInfo(1);
      expect(info.finalized).to.be.true;
    });

    it("Should revert if not creator", async function () {
      await expect(
        betChain.connect(user1).finalizeBet(1, 0)
      ).to.be.revertedWith("Only creator can finalize");
    });

    it("Should revert if invalid winning option", async function () {
      await expect(
        betChain.finalizeBet(1, 99)
      ).to.be.revertedWith("Invalid winning option");
    });

    it("Should revert if pool too small", async function () {
      // Criar outra aposta sem pool suficiente
      await betChain.createBet("Small", "x", "url", ["A", "B"]);
      await expect(
        betChain.finalizeBet(2, 0)
      ).to.be.revertedWith("Pool too small to finalize");
    });
  });

  describe("Withdraw Prize", function () {
    beforeEach(async function () {
      await betChain.createBet("Bet", "Desc", "img", ["A", "B"]);
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.connect(user2).placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.finalizeBet(1, 0);
    });

    it("Should allow winner to withdraw prize", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await betChain.connect(user1).withdrawPrize(1);
      const receipt = await tx.wait();

      const gasUsed = receipt.gasUsed * receipt.gasPrice!;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter).to.be.greaterThan(balanceBefore - BigInt(gasUsed));
    });

    it("Should revert if not finalized", async function () {
      await betChain.createBet("New", "Desc", "url", ["A", "B"]);
      await expect(
        betChain.withdrawPrize(2)
      ).to.be.revertedWith("Bet not finalized yet");
    });

    it("Should revert if user did not bet on winning option", async function () {
      await betChain.connect(user3).placeBet(1, 1, { value: ethers.parseEther("1") });
      await betChain.finalizeBet(1, 0);
      await expect(
        betChain.connect(user3).withdrawPrize(1)
      ).to.be.revertedWith("You did not bet on winning option");
    });

    it("Should revert if no prize to withdraw", async function () {
      await betChain.createBet("Empty", "x", "url", ["A", "B"]);
      await betChain.connect(user1).placeBet(2, 0, { value: 50 });
      await betChain.finalizeBet(2, 0);
      await expect(
        betChain.connect(user1).withdrawPrize(2)
      ).to.be.revertedWith("No prize to withdraw");
    });
  });

  describe("Withdraw Fee", function () {
    beforeEach(async function () {
      await betChain.createBet("Bet", "Desc", "img", ["A", "B"]);
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.finalizeBet(1, 0);
    });

    it("Should allow creator to withdraw fee", async function () {
      const before = await ethers.provider.getBalance(deployer.address);
      await betChain.withdrawFee(1);
      const after = await ethers.provider.getBalance(deployer.address);
      expect(after).to.be.greaterThan(before);
    });

    it("Should revert if not finalized", async function () {
      await betChain.createBet("Bet2", "Desc", "img", ["A", "B"]);
      await expect(betChain.withdrawFee(2)).to.be.revertedWith(
        "Bet not finalized yet"
      );
    });

    it("Should revert if not creator", async function () {
      await expect(
        betChain.connect(user1).withdrawFee(1)
      ).to.be.revertedWith("Only creator can withdraw fee");
    });

    it("Should revert if no fee to withdraw", async function () {
      await betChain.createBet("Low", "Desc", "url", ["A", "B"]);
      await betChain.connect(user1).placeBet(2, 0, { value: 50 });
      await betChain.finalizeBet(2, 0);
      await expect(betChain.withdrawFee(2)).to.be.revertedWith(
        "No fee to withdraw"
      );
    });
  });

  describe("Getters", function () {
    beforeEach(async function () {
      await betChain.createBet("Bet", "Desc", "img", ["A", "B"]);
      await betChain.connect(user1).placeBet(1, 0, { value: ethers.parseEther("1") });
    });

    it("Should return correct option info", async function () {
      const [name, totalBets] = await betChain.getOptionInfo(1, 0);
      expect(name).to.equal("A");
      expect(totalBets).to.equal(ethers.parseEther("1"));
    });

    it("Should revert on invalid option", async function () {
      await expect(betChain.getOptionInfo(1, 99)).to.be.revertedWith("Invalid option");
    });

    it("Should return correct user bet", async function () {
      const bet = await betChain.getUserBet(1, 0, user1.address);
      expect(bet).to.equal(ethers.parseEther("1"));
    });

    it("Should revert on invalid option in getUserBet", async function () {
      await expect(
        betChain.getUserBet(1, 5, user1.address)
      ).to.be.revertedWith("Invalid option");
    });

    it("Should return bet info correctly", async function () {
      const info = await betChain.getBetInfo(1);
      expect(info.creator).to.equal(deployer.address);
      expect(info.active).to.be.true;
      expect(info.optionsCount).to.equal(2n);
    });
  });
});
