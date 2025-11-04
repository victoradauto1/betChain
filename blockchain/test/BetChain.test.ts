import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

describe("BetChain", function () {
  let betChain: any;
  let deployer: any;
  let provider: any;

  beforeEach(async function () {
    // Get provider from Hardhat
    provider = await hre.network.connect().then(conn => conn.provider);
    
    // Get accounts
    const accounts = await provider.request({
      method: "eth_accounts",
      params: [],
    });
    deployer = accounts[0];
    
    // Deploy contract
    const BetChain = await hre.artifacts.readArtifact("BetChain");
    
    // Create wallet for deployment
    const wallet = new ethers.Wallet(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      new ethers.JsonRpcProvider("http://127.0.0.1:8545")
    );
    
    const factory = new ethers.ContractFactory(BetChain.abi, BetChain.bytecode, wallet);
    betChain = await factory.deploy();
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
      
      await betChain.createBet(
        "Test Bet",
        "Test Description",
        "https://image.com/test.jpg",
        options
      );

      expect(await betChain.nextId()).to.equal(1n);

      const betInfo = await betChain.getBetInfo(1);
      expect(betInfo[1]).to.equal("Test Bet");
      expect(betInfo[2]).to.equal("Test Description");
      expect(betInfo[3]).to.equal(0n);
      expect(betInfo[4]).to.be.true;
      expect(betInfo[5]).to.be.false;
      expect(betInfo[6]).to.equal(2n);
    });

    it("Should create a bet with multiple options (5)", async function () {
      const options = ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"];
      
      await betChain.createBet(
        "Multi Option Bet",
        "Test with 5 options",
        "https://image.com/test.jpg",
        options
      );

      const betInfo = await betChain.getBetInfo(1);
      expect(betInfo[6]).to.equal(5n);
    });

    it("Should fail to create bet with only 1 option", async function () {
      const options = ["Only Option"];
      
      try {
        await betChain.createBet(
          "Invalid Bet",
          "Should fail",
          "https://image.com/test.jpg",
          options
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Must have at least 2 options");
      }
    });

    it("Should fail to create bet with more than 10 options", async function () {
      const options = Array(11).fill("Option");
      
      try {
        await betChain.createBet(
          "Invalid Bet",
          "Should fail",
          "https://image.com/test.jpg",
          options
        );
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Maximum 10 options allowed");
      }
    });

    it("Should increment nextId correctly", async function () {
      const options = ["Option A", "Option B"];
      
      await betChain.createBet("Bet 1", "Description 1", "image1.jpg", options);
      expect(await betChain.nextId()).to.equal(1n);
      
      await betChain.createBet("Bet 2", "Description 2", "image2.jpg", options);
      expect(await betChain.nextId()).to.equal(2n);
    });
  });

  describe("Place Bet", function () {
    beforeEach(async function () {
      const options = ["Option A", "Option B"];
      await betChain.createBet("Test Bet", "Description", "image.jpg", options);
    });

    it("Should place a bet successfully", async function () {
      const betAmount = ethers.parseEther("1");
      
      await betChain.placeBet(1, 0, { value: betAmount });

      const userBet = await betChain.getUserBet(1, 0, deployer);
      expect(userBet).to.equal(betAmount);

      const optionInfo = await betChain.getOptionInfo(1, 0);
      expect(optionInfo[1]).to.equal(betAmount);
    });

    it("Should accumulate bets in pool", async function () {
      await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.placeBet(1, 1, { value: ethers.parseEther("2") });

      const betInfo = await betChain.getBetInfo(1);
      expect(betInfo[3]).to.equal(ethers.parseEther("3"));
    });

    it("Should accumulate multiple bets from same user", async function () {
      await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.placeBet(1, 0, { value: ethers.parseEther("2") });

      const userBet = await betChain.getUserBet(1, 0, deployer);
      expect(userBet).to.equal(ethers.parseEther("3"));
    });

    it("Should fail with zero value", async function () {
      try {
        await betChain.placeBet(1, 0, { value: 0 });
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Amount must be greater than 0");
      }
    });

    it("Should fail with invalid option", async function () {
      try {
        await betChain.placeBet(1, 5, { value: ethers.parseEther("1") });
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Invalid option");
      }
    });

    it("Should fail on inactive bet", async function () {
      await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.finalizeBet(1, 0);

      try {
        await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Bet is not active");
      }
    });
  });

  describe("Finalize Bet", function () {
    beforeEach(async function () {
      const options = ["Option A", "Option B"];
      await betChain.createBet("Test Bet", "Description", "image.jpg", options);
      await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });
    });

    it("Should finalize bet successfully", async function () {
      await betChain.finalizeBet(1, 0);

      const betInfo = await betChain.getBetInfo(1);
      expect(betInfo[4]).to.be.false; // active
      expect(betInfo[5]).to.be.true; // finalized
    });

    it("Should fail with invalid option", async function () {
      try {
        await betChain.finalizeBet(1, 5);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Invalid winning option");
      }
    });

    it("Should fail if already finalized", async function () {
      await betChain.finalizeBet(1, 0);

      try {
        await betChain.finalizeBet(1, 0);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Bet is not active");
      }
    });

    it("Should fail with insufficient pool", async function () {
      const options = ["Option A", "Option B"];
      await betChain.createBet("Small Bet", "Description", "image.jpg", options);

      try {
        await betChain.finalizeBet(2, 0);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Pool too small to finalize");
      }
    });
  });

  describe("Withdraw Prize", function () {
    beforeEach(async function () {
      const options = ["Option A", "Option B"];
      await betChain.createBet("Test Bet", "Description", "image.jpg", options);
    });

    it("Should withdraw prize successfully", async function () {
      await betChain.placeBet(1, 0, { value: ethers.parseEther("3") });
      await betChain.finalizeBet(1, 0);

      const balanceBefore = await provider.request({
        method: "eth_getBalance",
        params: [deployer, "latest"],
      });
      
      const tx = await betChain.withdrawPrize(1);
      const receipt = await tx.wait();
      
      const balanceAfter = await provider.request({
        method: "eth_getBalance",
        params: [deployer, "latest"],
      });
      
      const balanceChange = BigInt(balanceAfter) - BigInt(balanceBefore);
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice);
      const netChange = balanceChange + gasUsed;
      
      const expectedPrize = ethers.parseEther("3") - 100n;
      expect(netChange).to.equal(expectedPrize);
    });

    it("Should fail if not finalized", async function () {
      await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });

      try {
        await betChain.withdrawPrize(1);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Bet not finalized yet");
      }
    });

    it("Should fail on second withdrawal attempt", async function () {
      await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.finalizeBet(1, 0);

      await betChain.withdrawPrize(1);

      try {
        await betChain.withdrawPrize(1);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("You did not bet on winning option");
      }
    });

    it("Should work with small pool", async function () {
      await betChain.placeBet(1, 0, { value: 200 });
      await betChain.finalizeBet(1, 0);

      const balanceBefore = await provider.request({
        method: "eth_getBalance",
        params: [deployer, "latest"],
      });
      
      const tx = await betChain.withdrawPrize(1);
      const receipt = await tx.wait();
      
      const balanceAfter = await provider.request({
        method: "eth_getBalance",
        params: [deployer, "latest"],
      });
      
      const balanceChange = BigInt(balanceAfter) - BigInt(balanceBefore);
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice);
      const netChange = balanceChange + gasUsed;
      
      expect(netChange).to.equal(100n); // 200 - FEE
    });
  });

  describe("Withdraw Fee", function () {
    beforeEach(async function () {
      const options = ["Option A", "Option B"];
      await betChain.createBet("Test Bet", "Description", "image.jpg", options);
      await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });
      await betChain.finalizeBet(1, 0);
    });

    it("Should withdraw fee successfully", async function () {
      const balanceBefore = await provider.request({
        method: "eth_getBalance",
        params: [deployer, "latest"],
      });
      
      const tx = await betChain.withdrawFee(1);
      const receipt = await tx.wait();
      
      const balanceAfter = await provider.request({
        method: "eth_getBalance",
        params: [deployer, "latest"],
      });
      
      const balanceChange = BigInt(balanceAfter) - BigInt(balanceBefore);
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice);
      const netChange = balanceChange + gasUsed;
      
      expect(netChange).to.equal(100n);
    });

    it("Should fail if not finalized", async function () {
      const options = ["Option A", "Option B"];
      await betChain.createBet("New Bet", "Description", "image.jpg", options);

      try {
        await betChain.withdrawFee(2);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Bet not finalized yet");
      }
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const options = ["First Option", "Second Option"];
      await betChain.createBet("Test Bet", "Description", "image.jpg", options);
    });

    it("Should return correct option info", async function () {
      await betChain.placeBet(1, 0, { value: ethers.parseEther("5") });

      const optionInfo = await betChain.getOptionInfo(1, 0);
      expect(optionInfo[0]).to.equal("First Option");
      expect(optionInfo[1]).to.equal(ethers.parseEther("5"));
    });

    it("Should fail with invalid option in getOptionInfo", async function () {
      try {
        await betChain.getOptionInfo(1, 5);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Invalid option");
      }
    });

    it("Should return correct user bet", async function () {
      await betChain.placeBet(1, 1, { value: ethers.parseEther("3.5") });

      const userBet = await betChain.getUserBet(1, 1, deployer);
      expect(userBet).to.equal(ethers.parseEther("3.5"));
    });

    it("Should fail with invalid option in getUserBet", async function () {
      try {
        await betChain.getUserBet(1, 5, deployer);
        expect.fail("Should have reverted");
      } catch (error: any) {
        expect(error.message).to.include("Invalid option");
      }
    });

    it("Should return all bet info correctly", async function () {
      const options = ["Option 1", "Option 2", "Option 3"];
      await betChain.createBet(
        "Complete Test",
        "Full description",
        "image.jpg",
        options
      );

      const betInfo = await betChain.getBetInfo(2);
      expect(betInfo[1]).to.equal("Complete Test");
      expect(betInfo[2]).to.equal("Full description");
      expect(betInfo[3]).to.equal(0n);
      expect(betInfo[4]).to.be.true;
      expect(betInfo[5]).to.be.false;
      expect(betInfo[6]).to.equal(3n);
    });
  });

  describe("Complete Scenario", function () {
    it("Should execute complete betting flow", async function () {
      const options = ["Team A", "Team B"];
      await betChain.createBet(
        "Football Match",
        "Who will win?",
        "match.jpg",
        options
      );

      await betChain.placeBet(1, 0, { value: ethers.parseEther("3") });
      await betChain.placeBet(1, 1, { value: ethers.parseEther("2") });
      await betChain.placeBet(1, 0, { value: ethers.parseEther("1") });

      await betChain.finalizeBet(1, 0);

      const betInfo = await betChain.getBetInfo(1);
      expect(betInfo[3]).to.equal(ethers.parseEther("6"));
      expect(betInfo[5]).to.be.true;
    });
  });
});