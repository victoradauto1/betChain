import { HardhatUserConfig } from "hardhat/config";

// Plugins corretos para Hardhat 3.x
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-ethers-chai-matchers";
import "@nomicfoundation/hardhat-toolbox-mocha-ethers";

import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    sepolia: {
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
      type: "http",
      chainType: "l1",
    },
  },
};

export default config;
