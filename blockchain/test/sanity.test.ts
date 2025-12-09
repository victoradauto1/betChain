import hre from "hardhat";

describe("HRE sanity check", () => {
  it("should have ethers available", async () => {
    console.log(hre.ethers);
  });
});
