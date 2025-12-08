import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-mocha-ethers/network-helpers";

describe("BetChain", function () {

  async function deployBetChain() {
    const BetChain = await ethers.getContractFactory("BetChain");
    const betChain = await BetChain.deploy();
    await betChain.waitForDeployment();
    return betChain;
  }

  // ----------------------------------------------------------
  // TESTE 1 — Deploy
  // ----------------------------------------------------------
  it("should deploy successfully", async function () {
    const contract = await deployBetChain();
    expect(contract.target).to.properAddress;
  });

  // ----------------------------------------------------------
  // TESTE 2 — Criar aposta
  // ----------------------------------------------------------
  it("should create a new bet", async function () {
    const contract = await deployBetChain();

    const tx = await contract.createBet(
      "Quem ganha?",
      "url_da_foto_aqui"
    );
    await tx.wait();

    const bet = await contract.bets(0);

    expect(bet.title).to.equal("Quem ganha?");
    expect(bet.image).to.equal("url_da_foto_aqui");
    expect(bet.active).to.equal(true);
  });

  // ----------------------------------------------------------
  // TESTE 3 — Adicionar opção
  // ----------------------------------------------------------
  it("should allow adding options", async function () {
    const contract = await deployBetChain();

    await (await contract.createBet("Jogo", "img")).wait();
    await (await contract.addOption(0, "Flamengo")).wait();
    await (await contract.addOption(0, "Vasco")).wait();

    const option1 = await contract.getOption(0, 0);
    const option2 = await contract.getOption(0, 1);

    expect(option1.name).to.equal("Flamengo");
    expect(option2.name).to.equal("Vasco");
  });

  // ----------------------------------------------------------
  // TESTE 4 — Apostar
  // ----------------------------------------------------------
  it("should allow placing a bet", async function () {
    const contract = await deployBetChain();
    const [owner, user] = await ethers.getSigners();

    await (await contract.createBet("Luta", "img")).wait();
    await (await contract.addOption(0, "Jon Jones")).wait();

    await contract.connect(user).placeBet(0, 0, {
      value: ethers.parseEther("0.1")
    });

    const total = await contract.getOptionTotal(0, 0);
    expect(total).to.equal(ethers.parseEther("0.1"));
  });

  // ----------------------------------------------------------
  // TESTE 5 — Encerrar aposta
  // ----------------------------------------------------------
  it("should close a bet", async function () {
    const contract = await deployBetChain();

    await (await contract.createBet("Teste", "img")).wait();
    await (await contract.closeBet(0)).wait();

    const bet = await contract.bets(0);
    expect(bet.active).to.equal(false);
  });

});
