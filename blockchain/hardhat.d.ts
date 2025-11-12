import "hardhat";

declare module "hardhat/types/runtime" {
  import { ethers } from "ethers";
  interface HardhatRuntimeEnvironment {
    ethers: typeof ethers;
  }
}
