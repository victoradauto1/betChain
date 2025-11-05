import { expect } from "chai";
import { ethers } from "hardhat";

describe("BetChain", function () {
  let betChain: any;
  let deployer: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    const BetChain = await ethers.getContractFactory("BetChain", deployer);
    betChain = await BetChain.deploy();
    await betChain.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      expect(await betChain.nextId()).to.equal(0n);
      expect(await betChain.FEE()).to.equal(100n);
    });
  });

  describe("Create Bet", function () {
    it("Should create a bet successfully with 2 options", async function () {
      const options = ["Option A", "Option B"];

      await betChain.createBet("Test Bet", "Test Description", "https://image.com/test.jpg", options);

      expect(await betChain.nextId()).to.equal(1n);

      const betInfo = await betChain.getBetInfo(1);
      expect(betInfo[1]).to.equal("Test Bet");
      expect(betInfo[2]).to.equal("Test Description");
      expect(betInfo[3]).to.equal(0n);
      expect(betInfo[4]).to.be.true;
      expect(betInfo[5]).to.be.false;
      expect(betInfo[6]).to.equal(2n);
    });

    it("Should fail to create bet with only 1 option", async function () {
      const options = ["Only Option"];
      await expect(
        betChain.createBet("Invalid Bet", "Should fail", "https://image.com/test.jpg", options)
      ).to.be.revertedWith("Must have at least 2 options");
    });
  });

  // Exemplo de teste adaptado:
  describe("Place Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Test Bet", "Description", "image.jpg", ["Option A", "Option B"]);
    });

    it("Should place a bet successfully", async function () {
      const betAmount = ethers.parseEther("1");
      await betChain.placeBet(1, 0, { value: betAmount });
      const userBet = await betChain.getUserBet(1, 0, deployer.address);
      expect(userBet).to.equal(betAmount);
    });
  });

  // O resto da sua suíte pode ser adaptado com esse mesmo padrão
});
