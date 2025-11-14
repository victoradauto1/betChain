import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BetChainModule", (m) => {
  const betChain = m.contract("BetChain");
  return { betChain };
});
