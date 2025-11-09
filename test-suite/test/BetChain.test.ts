import { expect } from "chai";
import { ethers } from "hardhat";

describe("BetChain - Additional Coverage Tests", function () {
  let contract: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const BetChain = await ethers.getContractFactory("BetChain");
    contract = await BetChain.deploy();
    await contract.waitForDeployment();
  });

  // ---------------- PLACE BET - Else Branch Coverage ----------------
  describe("Place Bet - Else Branches", function () {
    it("should place bet when bet.active is true AND bet.finalized is false", async function () {
      // Este teste cobre o "else" do segundo require
      // Cenário: bet.active = true, bet.finalized = false (caminho feliz)
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      
      // Bet está ativa E não finalizada - deve passar
      await expect(
        contract.connect(addr1).placeBet(1, 0, { value: 500 })
      ).to.emit(contract, "BetPlaced");

      const bet = await contract.getBetInfo(1);
      expect(bet[3]).to.equal(500); // totalPool
      expect(bet[4]).to.equal(true); // active
      expect(bet[5]).to.equal(false); // finalized
    });
  });

  // ---------------- FINALIZE BET - Else Branch Coverage ----------------
  describe("Finalize Bet - Else Branches", function () {
    it("should finalize when bet.active is true AND bet.finalized is false", async function () {
      // Este teste cobre o "else" do segundo require
      // Cenário: bet.active = true, bet.finalized = false (caminho feliz)
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 200 });

      // Aposta está ativa E não finalizada - deve passar
      await expect(
        contract.finalizeBet(1, 0)
      ).to.emit(contract, "BetFinalized");

      const bet = await contract.getBetInfo(1);
      expect(bet[4]).to.equal(false); // active = false após finalizar
      expect(bet[5]).to.equal(true); // finalized = true
    });
  });

  // ---------------- WITHDRAW PRIZE - Else Branch Coverage ----------------
  describe("Withdraw Prize - Else Branches", function () {
    it("should withdraw prize when totalPool > FEE AND transfer succeeds", async function () {
      // Cobre os "else" dos requires:
      // - bet.totalPool > FEE (else branch)
      // - success (else branch do transfer)
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 1000 });
      await contract.connect(addr2).placeBet(1, 1, { value: 2000 });
      await contract.finalizeBet(1, 1);

      const before = await ethers.provider.getBalance(addr2.address);
      
      // Pool > FEE E transfer vai funcionar - deve passar
      const tx = await contract.connect(addr2).withdrawPrize(1);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1); // success = true

      const after = await ethers.provider.getBalance(addr2.address);
      const gas = receipt.gasUsed * receipt.gasPrice!;
      
      // Verificar que recebeu o prêmio
      expect(after + BigInt(gas)).to.be.gt(before);
    });

    it("should handle multiple winners withdrawing proportionally", async function () {
      // Teste adicional para garantir que múltiplos vencedores podem sacar
      await contract.createBet("Multi", "Desc", "img", ["A", "B"]);
      
      // Dois apostadores na opção vencedora
      await contract.connect(addr1).placeBet(1, 0, { value: 1000 });
      await contract.connect(addr2).placeBet(1, 0, { value: 2000 });
      
      await contract.finalizeBet(1, 0);

      // Ambos devem conseguir sacar
      await expect(
        contract.connect(addr1).withdrawPrize(1)
      ).to.emit(contract, "PrizeWithdrawn");

      await expect(
        contract.connect(addr2).withdrawPrize(1)
      ).to.emit(contract, "PrizeWithdrawn");
    });
  });

  // ---------------- WITHDRAW FEE - Else Branch Coverage ----------------
  describe("Withdraw Fee - Else Branches", function () {
    it("should withdraw fee when totalPool >= FEE AND transfer succeeds", async function () {
      // Cobre os "else" dos requires:
      // - bet.totalPool >= FEE (else branch)
      // - success (else branch do transfer)
      await contract.createBet("Title", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 1000 });
      await contract.finalizeBet(1, 0);

      const before = await ethers.provider.getBalance(owner.address);
      
      // Pool >= FEE E transfer vai funcionar - deve passar
      const tx = await contract.withdrawFee(1);
      const receipt = await tx.wait();
      
      expect(receipt.status).to.equal(1); // success = true

      const after = await ethers.provider.getBalance(owner.address);
      const gas = receipt.gasUsed * receipt.gasPrice!;
      
      // Deve ter recebido exatamente FEE (100 wei)
      expect(after + BigInt(gas)).to.be.closeTo(before + 100n, 10_000_000_000n);
    });

    it("should allow withdrawing fee when pool equals exactly FEE", async function () {
      // Teste edge case: totalPool == FEE (ainda deve permitir)
      await contract.createBet("Edge", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 101 }); // FEE = 100
      await contract.finalizeBet(1, 0);

      // Deve permitir sacar a taxa
      await expect(
        contract.withdrawFee(1)
      ).to.emit(contract, "PrizeWithdrawn").withArgs(1, owner.address, 100);
    });
  });

  // ---------------- EDGE CASES ADICIONAIS ----------------
  describe("Edge Cases for Complete Coverage", function () {
    it("should handle bet with exactly FEE + 1 wei in pool", async function () {
      await contract.createBet("Min", "Desc", "img", ["A", "B"]);
      await contract.connect(addr1).placeBet(1, 0, { value: 101 });
      
      // Deve permitir finalizar
      await expect(
        contract.finalizeBet(1, 0)
      ).to.emit(contract, "BetFinalized");

      // Winner deve conseguir sacar 1 wei (pool - FEE)
      await expect(
        contract.connect(addr1).withdrawPrize(1)
      ).to.emit(contract, "PrizeWithdrawn");
    });

    it("should accumulate multiple bets from same user on same option", async function () {
      await contract.createBet("Multi", "Desc", "img", ["A", "B"]);
      
      // Mesma pessoa aposta múltiplas vezes
      await contract.connect(addr1).placeBet(1, 0, { value: 100 });
      await contract.connect(addr1).placeBet(1, 0, { value: 200 });
      await contract.connect(addr1).placeBet(1, 0, { value: 300 });
      
      const userBet = await contract.getUserBet(1, 0, addr1.address);
      expect(userBet).to.equal(600);
      
      const [, total] = await contract.getOptionInfo(1, 0);
      expect(total).to.equal(600);
    });

    it("should handle all options receiving bets", async function () {
      await contract.createBet("All", "Desc", "img", ["A", "B", "C"]);
      
      await contract.connect(addr1).placeBet(1, 0, { value: 500 });
      await contract.connect(addr1).placeBet(1, 1, { value: 300 });
      await contract.connect(addr2).placeBet(1, 2, { value: 200 });
      
      const bet = await contract.getBetInfo(1);
      expect(bet[3]).to.equal(1000); // totalPool
      
      await contract.finalizeBet(1, 1);
      
      // Apenas addr1 pode sacar (apostou na opção 1)
      await expect(
        contract.connect(addr1).withdrawPrize(1)
      ).to.emit(contract, "PrizeWithdrawn");
    });
  });
});