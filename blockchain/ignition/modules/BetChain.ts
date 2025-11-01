import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BetChainModule = buildModule("BetChainModule", (m) => {
  // Deploy do contrato principal
  const betChain = m.contract("BetChain");

  // Exemplo: exportar o endereço para uso em scripts ou testes
  return { betChain };
});

export default BetChainModule;
