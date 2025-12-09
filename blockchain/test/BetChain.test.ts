import { expect } from "chai";
import hre from "hardhat";


describe("BetChain", function () {
  async function deploy() {
    const [owner, user1, user2] = await hre.ethers.getSigners();

    const BetChain = await hre.ethers.getContractFactory("BetChain");
    const contract = await BetChain.deploy();
    await contract.waitForDeployment();

    return { contract, owner, user1, user2 };
  }