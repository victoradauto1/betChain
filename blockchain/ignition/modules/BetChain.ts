import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BetChainModule = buildModule("BetChainModule", (m) => {
  // Deploy o contrato BetChain
  const betChain = m.contract("BetChain");

  return { betChain };
});

export default BetChainModule;