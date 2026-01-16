import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BetChainModule = buildModule("BetChainModule", (m) => {

  const betChain = m.contract("BetChain");

  return { betChain };
});

export default BetChainModule;