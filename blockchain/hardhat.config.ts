import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage";
import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-ignition-ethers";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
    compilers: [
      {
        version: "0.8.28",
      },
    ],
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.SEPOLIA_PRIVATE_KEY
        ? [process.env.SEPOLIA_PRIVATE_KEY]
        : [],
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};
//@ts-ignore
config.solcover = {
  skipFiles: ["contracts/ReentrancyAttacker.sol", "ReentrancyAttacker.sol"],
};

export default config;
