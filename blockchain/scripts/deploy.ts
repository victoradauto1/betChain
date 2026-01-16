import { ethers } from "hardhat";

async function main() {
  const BetChain = await ethers.getContractFactory("BetChain");

  const betChain = await BetChain.deploy({
    gasLimit: 3_000_000,
  });

  await betChain.waitForDeployment();

  console.log("BetChain deployed at:", await betChain.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
