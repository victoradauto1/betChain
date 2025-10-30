import "hardhat";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    ethers: typeof import("ethers");
  }
}
