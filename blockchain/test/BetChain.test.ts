import { expect } from "chai";
import hre from "hardhat";
// @ts-ignore
const { ethers } = hre

describe("BetChain", function () {
  let contract: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const BetChain = await ethers.getContractFactory("BetChain");
    contract = await BetChain.deploy();
    await contract.waitForDeployment();
  });

  // ---------------- CREATE BET ----------------
  describe("Create Bet", function () {
    it("should create a valid bet", async function () {
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      const bet = await contract.getBetInfo(1);
      expect(bet[0]).to.equal(owner.address);
      expect(bet[1]).to.equal("Title");
    });

    it("should revert if less than 2 options", async function () {
      await expect(
        contract.createBet("Title", "Desc", "img", ["A"])
      ).to.be.revertedWith("Must have at least 2 options");
    });

    it("should revert if more than 10 options", async function () {
      const opts = Array(11).fill("A");
      await expect(
        contract.createBet("Title", "Desc", "img", opts)
      ).to.be.revertedWith("Maximum 10 options allowed");
    });
  });

  // ---------------- PLACE BET ----------------
  describe("Place Bet", function () {
    beforeEach(async function () {
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
    });

    it("should place a valid bet", async function () {
      await contract.connect(addr1).placeBet(1, 0, { value: 500 });
      const bet = await contract.getBetInfo(1);
      expect(bet[3]).to.equal(500);
    });

    it("should revert if bet inactive", async function () {
      await contract.createBet("Inactive", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(2, 0, { value: 200 });
      await contract.finalizeBet(2, 0); // finaliza e desativa a aposta

      await expect(
        contract.connect(addr1).placeBet(2, 0, { value: 100 })
      ).to.be.revertedWith("Bet is not active");
    });

    it("should revert if bet already finalized", async function () {
      await contract.connect(addr1).placeBet(1, 0, { value: 500 });
      await contract.finalizeBet(1, 0);
      await expect(
        contract.connect(addr2).placeBet(1, 1, { value: 100 })
      ).to.be.revertedWith("Bet is not active");
    });

    it("should revert if no value sent", async function () {
      await expect(
        contract.connect(addr1).placeBet(1, 0, { value: 0 })
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should revert if invalid option", async function () {
      await expect(
        contract.connect(addr1).placeBet(1, 5, { value: 100 })
      ).to.be.revertedWith("Invalid option");
    });
  });

  // ---------------- FINALIZE BET ----------------
  describe("Finalize Bet", function () {
    beforeEach(async function () {
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 200 });
    });

    it("should finalize a bet correctly", async function () {
      await contract.finalizeBet(1, 0);
      const bet = await contract.getBetInfo(1);
      expect(bet[5]).to.equal(true);
    });

    it("should revert if not creator", async function () {
      await expect(
        contract.connect(addr1).finalizeBet(1, 0)
      ).to.be.revertedWith("Only creator can finalize");
    });

    it("should revert if invalid winning option", async function () {
      await expect(contract.finalizeBet(1, 5)).to.be.revertedWith(
        "Invalid winning option"
      );
    });

    it("should revert if pool too small", async function () {
      await contract.createBet("Small", "D", "I", ["X", "Y"]);
      await contract.connect(addr1).placeBet(2, 0, { value: 50 });
      await expect(contract.finalizeBet(2, 0)).to.be.revertedWith(
        "Pool too small to finalize"
      );
    });

    it("should revert if is not active", async function () {
      await contract.finalizeBet(1, 0);
      await expect(contract.finalizeBet(1, 0)).to.be.revertedWith(
        "Bet is not active"
      );
    });
  });

  // ---------------- WITHDRAW PRIZE ----------------
  describe("Withdraw Prize", function () {
    beforeEach(async function () {
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 200 });
      await contract.connect(addr2).placeBet(1, 1, { value: 300 });
      await contract.finalizeBet(1, 1);
    });

    it("should allow winner to withdraw prize", async function () {
      const before = await ethers.provider.getBalance(addr2.address);
      const tx = await contract.connect(addr2).withdrawPrize(1);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice!;
      const after = await ethers.provider.getBalance(addr2.address);
      expect(after + BigInt(gas)).to.be.gt(before);
    });

    it("should revert if not finalized", async function () {
      await contract.createBet("X", "Y", "Z", ["1", "2"]);
      await expect(contract.withdrawPrize(2)).to.be.revertedWith(
        "Bet not finalized yet"
      );
    });

    it("should revert if pool <= FEE", async function () {
      await contract.createBet("Z", "Z", "Z", ["A", "B"]);
      await contract.connect(addr1).placeBet(2, 0, { value: 50 });
      await expect(contract.finalizeBet(2, 0)).to.be.revertedWith(
        "Pool too small to finalize"
      );
    });

    it("should not withdraw prize (pool < FEE)", async function () {
      await contract.createBet("Z", "Z", "Z", ["A", "B"]);
      await contract.connect(addr1).placeBet(2, 0, { value: 50 });
      await expect(contract.finalizeBet(2, 0)).to.be.revertedWith(
        "Pool too small to finalize"
      );
    });

    it("should revert if user didn’t bet on winning option", async function () {
      await expect(contract.connect(addr1).withdrawPrize(1)).to.be.revertedWith(
        "You did not bet on winning option"
      );
    });

    it("should revert if already withdrawn", async function () {
      await contract.connect(addr2).withdrawPrize(1);
      await expect(contract.connect(addr2).withdrawPrize(1)).to.be.revertedWith(
        "You did not bet on winning option"
      );
    });
  });

  // ---------------- WITHDRAW FEE ----------------
  describe("Withdraw Fee", function () {
    beforeEach(async function () {
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 200 });
      await contract.finalizeBet(1, 0);
    });

    it("should allow creator to withdraw fee", async function () {
      const before = await ethers.provider.getBalance(owner.address);
      const tx = await contract.withdrawFee(1);
      const receipt = await tx.wait();
      const gas = receipt.gasUsed * receipt.gasPrice!;
      const after = await ethers.provider.getBalance(owner.address);
      expect(after + BigInt(gas)).to.be.closeTo(before + 100n, 10_000_000_000n);
    });

    it("should revert if not finalized", async function () {
      await contract.createBet("X", "Y", "Z", ["A", "B"]);
      await expect(contract.withdrawFee(2)).to.be.revertedWith(
        "Bet not finalized yet"
      );
    });

    it("should revert if not creator", async function () {
      await expect(contract.connect(addr1).withdrawFee(1)).to.be.revertedWith(
        "Only creator can withdraw fee"
      );
    });

    it("should revert if pool < FEE", async function () {
      await contract.createBet("Z", "Z", "Z", ["A", "B"]);
      await contract.connect(addr1).placeBet(2, 0, { value: 50 });
      await expect(contract.finalizeBet(2, 0)).to.be.revertedWith(
        "Pool too small to finalize"
      );
    });
  });

  // ---------------- GETTERS ----------------
  describe("Getters", function () {
    beforeEach(async function () {
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 200 });
    });

    it("should return option info", async function () {
      const [name, total] = await contract.getOptionInfo(1, 0);
      expect(name).to.equal("A");
      expect(total).to.equal(200);
    });

    it("should revert if invalid option", async function () {
      await expect(contract.getOptionInfo(1, 9)).to.be.revertedWith(
        "Invalid option"
      );
    });

    it("should return user bet", async function () {
      const betAmount = await contract.getUserBet(1, 0, addr1.address);
      expect(betAmount).to.equal(200);
    });

    it("should revert user bet invalid option", async function () {
      await expect(contract.getUserBet(1, 5, addr1.address)).to.be.revertedWith(
        "Invalid option"
      );
    });

    it("should return bet info correctly", async function () {
      const info = await contract.getBetInfo(1);
      expect(info[0]).to.equal(owner.address);
      expect(info[1]).to.equal("Title");
      expect(info[6]).to.equal(2);
    });
  });
});
