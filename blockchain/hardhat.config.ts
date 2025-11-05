import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "solidity-coverage";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhatMainnet: { type: "edr-simulated", chainType: "l1" },
    hardhatOp: { type: "edr-simulated", chainType: "op" },
    // sepolia: {
    //   type: "http",
    //   chainType: "l1",
    //   url: process.env.SEPOLIA_RPC_URL || "",
    //   accounts:
    //     process.env.SEPOLIA_PRIVATE_KEY !== undefined
    //       ? [process.env.SEPOLIA_PRIVATE_KEY]
    //       : [],
    // },
  }
};

export default config;
