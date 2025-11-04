import { task } from "hardhat/config";

task("coverage", "Runs solidity-coverage manually").setAction(async (_, hre) => {
  console.log("🧪 Running solidity-coverage via compatibility bridge...");
  await import("solidity-coverage");
  await hre.run("test");
});
