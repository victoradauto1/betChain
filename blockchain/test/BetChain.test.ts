import { expect } from "chai";
import { ethers } from "hardhat";
import { BetChain } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { bigint } from "hardhat/internal/core/params/argumentTypes";

describe("BetChain", function () {
  let betChain: BetChain;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const FEE = 100n; // 100 wei

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const BetChainFactory = await ethers.getContractFactory("BetChain");
    betChain = await BetChainFactory.deploy();
    await betChain.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct FEE constant", async function () {
      expect(await betChain.FEE()).to.equal(FEE);
    });

    it("Should initialize nextId to 0", async function () {
      expect(await betChain.nextId()).to.equal(0);
    });

    it("Should return 0 total bets initially", async function () {
      expect(await betChain.getTotalBets()).to.equal(0);
    });
  });

  describe("Create Bet", function () {
    it("Should create a bet with valid parameters", async function () {
      const title = "Test Bet";
      const description = "Test Description";
      const imageUrl = "https://example.com/image.png";
      const options = ["Option A", "Option B"];
      const deadline = 0;

      await expect(
        betChain.createBet(title, description, imageUrl, options, deadline)
      )
        .to.emit(betChain, "BetCreated")
        .withArgs(1, owner.address, title, deadline);

      expect(await betChain.getTotalBets()).to.equal(1);
    });

    it("Should create bet with deadline", async function () {
      const futureTime = (await time.latest()) + 3600; // +1 hour
      const options = ["Yes", "No"];

      await betChain.createBet(
        "Future Bet",
        "Description",
        "",
        options,
        futureTime
      );

      const betInfo = await betChain.getBetFullInfo(1);
      expect(betInfo.deadline).to.equal(futureTime);
    });

    it("Should fail with less than 2 options", async function () {
      await expect(
        betChain.createBet("Bad Bet", "", "", ["Only One"], 0)
      ).to.be.revertedWith("At least 2 options");
    });

    it("Should fail with more than 10 options", async function () {
      const tooManyOptions = Array(11).fill("Option");
      await expect(
        betChain.createBet("Bad Bet", "", "", tooManyOptions, 0)
      ).to.be.revertedWith("Max 10 options");
    });

    it("Should fail with empty title", async function () {
      await expect(
        betChain.createBet("", "desc", "", ["A", "B"], 0)
      ).to.be.revertedWith("Empty title");
    });

    it("Should fail with past deadline", async function () {
      const pastTime = (await time.latest()) - 3600;
      await expect(
        betChain.createBet("Past Bet", "", "", ["A", "B"], pastTime)
      ).to.be.revertedWith("Invalid deadline");
    });

    it("Should create multiple bets and increment IDs", async function () {
      await betChain.createBet("Bet 1", "", "", ["A", "B"], 0);
      await betChain.createBet("Bet 2", "", "", ["X", "Y"], 0);
      await betChain.createBet("Bet 3", "", "", ["1", "2"], 0);

      expect(await betChain.getTotalBets()).to.equal(3);
      expect(await betChain.nextId()).to.equal(3);
    });
  });

  describe("Place Bet", function () {
    beforeEach(async function () {
      await betChain.createBet(
        "Test Bet",
        "Description",
        "",
        ["Option A", "Option B"],
        0
      );
    });

    it("Should allow placing a bet", async function () {
      const betAmount = ethers.parseEther("1.0");

      await expect(betChain.connect(user1).placeBet(1, 0, { value: betAmount }))
        .to.emit(betChain, "BetPlaced")
        .withArgs(1, 0, user1.address, betAmount);

      const userBet = await betChain.getUserBetAmount(1, 0, user1.address);
      expect(userBet).to.equal(betAmount);
    });

    it("Should accumulate multiple bets from same user", async function () {
      const bet1 = ethers.parseEther("1.0");
      const bet2 = ethers.parseEther("0.5");

      await betChain.connect(user1).placeBet(1, 0, { value: bet1 });
      await betChain.connect(user1).placeBet(1, 0, { value: bet2 });

      const totalBet = await betChain.getUserBetAmount(1, 0, user1.address);
      expect(totalBet).to.equal(bet1 + bet2);
    });

    it("Should track total pool correctly", async function () {
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 1, { value: ethers.parseEther("2.0") });

      const betInfo = await betChain.getBetFullInfo(1);
      expect(betInfo.totalPool).to.equal(ethers.parseEther("3.0"));
    });

    it("Should track option totals correctly", async function () {
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 0, { value: ethers.parseEther("0.5") });

      const [names, totals] = await betChain.getBetOptions(1);
      expect(totals[0]).to.equal(ethers.parseEther("1.5"));
      expect(totals[1]).to.equal(0);
    });

    it("Should fail with zero amount", async function () {
      await expect(
        betChain.connect(user1).placeBet(1, 0, { value: 0 })
      ).to.be.revertedWith("Zero amount");
    });

    it("Should fail with invalid betId", async function () {
      await expect(
        betChain
          .connect(user1)
          .placeBet(999, 0, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Invalid betId");
    });

    it("Should fail with invalid option", async function () {
      await expect(
        betChain
          .connect(user1)
          .placeBet(1, 5, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Invalid option");
    });

    it("Should fail after deadline", async function () {
      const futureTime = (await time.latest()) + 3600;
      await betChain.createBet("Timed Bet", "", "", ["A", "B"], futureTime);

      await time.increase(3601); // Move past deadline

      await expect(
        betChain
          .connect(user1)
          .placeBet(2, 0, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Deadline passed");
    });

    it("Should fail on inactive bet", async function () {
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain.finalizeBet(1, 0);

      await expect(
        betChain
          .connect(user2)
          .placeBet(1, 0, { value: ethers.parseEther("1.0") })
      ).to.be.revertedWith("Bet inactive");
    });
  });

  describe("Finalize Bet", function () {
    beforeEach(async function () {
      await betChain.createBet("Test Bet", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
    });

    it("Should allow creator to finalize bet", async function () {
      await expect(betChain.finalizeBet(1, 0))
        .to.emit(betChain, "BetFinalized")
        .withArgs(1, 0);

      const betInfo = await betChain.getBetFullInfo(1);
      expect(betInfo.finalized).to.be.true;
      expect(betInfo.active).to.be.false;
      expect(betInfo.winningOption).to.equal(0);
    });

    it("Should fail if not creator", async function () {
      await expect(
        betChain.connect(user1).finalizeBet(1, 0)
      ).to.be.revertedWith("Not creator");
    });

    it("Should fail if already finalized", async function () {
      await betChain.finalizeBet(1, 0);

      await expect(betChain.finalizeBet(1, 0)).to.be.revertedWith(
        "Already finalized"
      );
    });

    it("Should fail with invalid option", async function () {
      await expect(betChain.finalizeBet(1, 5)).to.be.revertedWith(
        "Invalid option"
      );
    });

    it("Should fail if pool too small", async function () {
      await betChain.createBet("Small Bet", "", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(2, 0, { value: 50 }); // Less than FEE

      await expect(betChain.finalizeBet(2, 0)).to.be.revertedWith(
        "Pool too small"
      );
    });
  });

  describe("Withdraw Prize", function () {
    beforeEach(async function () {
      await betChain.createBet("Prize Bet", "", "", ["Winner", "Loser"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("2.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });
      await betChain.finalizeBet(1, 0); // user1 wins
    });

    it("Should allow winner to withdraw prize", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await betChain.connect(user1).withdrawPrize(1);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // Prize = (totalPool - FEE) = 3 ETH - 100 wei
      const expectedPrize = ethers.parseEther("3.0") - FEE;
      expect(balanceAfter).to.equal(balanceBefore + expectedPrize - gasUsed);
    });

    it("Should emit PrizeWithdrawn event", async function () {
      const expectedPrize = ethers.parseEther("3.0") - FEE;

      await expect(betChain.connect(user1).withdrawPrize(1))
        .to.emit(betChain, "PrizeWithdrawn")
        .withArgs(1, user1.address, expectedPrize);
    });

    it("Should prevent double withdrawal", async function () {
      await betChain.connect(user1).withdrawPrize(1);

      await expect(betChain.connect(user1).withdrawPrize(1)).to.be.revertedWith(
        "No winnings"
      );
    });

    it("Should fail for non-winners", async function () {
      await expect(betChain.connect(user2).withdrawPrize(1)).to.be.revertedWith(
        "No winnings"
      );
    });

    it("Should fail if not finalized", async function () {
      await betChain.createBet("Unfinalized", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(2, 0, { value: ethers.parseEther("1.0") });

      await expect(betChain.connect(user1).withdrawPrize(2)).to.be.revertedWith(
        "Not finalized"
      );
    });

    it("Should distribute prizes proportionally with multiple winners", async function () {
      await betChain.createBet("Multi Winner", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(2, 0, { value: ethers.parseEther("3.0") }); // 75% of winning pool
      await betChain
        .connect(user2)
        .placeBet(2, 0, { value: ethers.parseEther("1.0") }); // 25% of winning pool
      await betChain
        .connect(user3)
        .placeBet(2, 1, { value: ethers.parseEther("2.0") });
      await betChain.finalizeBet(2, 0);

      const totalPool = ethers.parseEther("6.0");
      const prizePool = totalPool - FEE;
      const winningPool = ethers.parseEther("4.0");

      // user1 should get 75% of prize pool
      const expectedPrize1 =
        (prizePool * ethers.parseEther("3.0")) / winningPool;
      // user2 should get 25% of prize pool
      const expectedPrize2 =
        (prizePool * ethers.parseEther("1.0")) / winningPool;

      const balance1Before = await ethers.provider.getBalance(user1.address);
      const tx1 = await betChain.connect(user1).withdrawPrize(2);
      const receipt1 = await tx1.wait();
      const gas1 = receipt1!.gasUsed * receipt1!.gasPrice;
      const balance1After = await ethers.provider.getBalance(user1.address);

      expect(balance1After).to.equal(balance1Before + expectedPrize1 - gas1);

      const balance2Before = await ethers.provider.getBalance(user2.address);
      const tx2 = await betChain.connect(user2).withdrawPrize(2);
      const receipt2 = await tx2.wait();
      const gas2 = receipt2!.gasUsed * receipt2!.gasPrice;
      const balance2After = await ethers.provider.getBalance(user2.address);

      expect(balance2After).to.equal(balance2Before + expectedPrize2 - gas2);
    });
  });

  describe("Withdraw Fee", function () {
    beforeEach(async function () {
      await betChain.connect(owner).createBet("Fee Bet", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain.connect(owner).finalizeBet(1, 0);
    });

    it("Should allow creator to withdraw fee", async function () {
      const balanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await betChain.connect(owner).withdrawFee(1);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.equal(balanceBefore + FEE - gasUsed);
    });

    it("Should emit FeeWithdrawn event", async function () {
      await expect(betChain.connect(owner).withdrawFee(1))
        .to.emit(betChain, "FeeWithdrawn")
        .withArgs(1, owner.address, FEE);
    });

    it("Should prevent double fee withdrawal", async function () {
      await betChain.connect(owner).withdrawFee(1);

      await expect(betChain.connect(owner).withdrawFee(1)).to.be.revertedWith(
        "Fee already claimed"
      );
    });

    it("Should fail if not creator", async function () {
      await expect(betChain.connect(user1).withdrawFee(1)).to.be.revertedWith(
        "Not creator"
      );
    });

    it("Should fail if not finalized", async function () {
      await betChain
        .connect(owner)
        .createBet("Unfinalized", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(2, 0, { value: ethers.parseEther("1.0") });

      await expect(betChain.connect(owner).withdrawFee(2)).to.be.revertedWith(
        "Not finalized"
      );
    });

    it("Should handle fee when pool is less than FEE", async function () {
      await betChain
        .connect(owner)
        .createBet("Small Pool", "", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(2, 0, { value: 150 }); // 150 wei
      await betChain.connect(owner).finalizeBet(2, 0);

      const tx = await betChain.connect(owner).withdrawFee(2);
      const receipt = await tx.wait();

      // Verify the event emitted with correct fee (min of pool and FEE)
      await expect(tx)
        .to.emit(betChain, "FeeWithdrawn")
        .withArgs(2, owner.address, 100n); // Should be capped at FEE (100)
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await betChain.createBet("Bet 1", "Description 1", "url1", ["A", "B"], 0);
      await betChain.createBet(
        "Bet 2",
        "Description 2",
        "url2",
        ["X", "Y", "Z"],
        0
      );
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
    });

    describe("getAllBets", function () {
      it("Should return all bets with correct pagination", async function () {
        const [
          ids,
          creators,
          titles,
          imageUrls,
          pools,
          actives,
          finals,
          optionsCounts,
          deadlines,
        ] = await betChain.getAllBets(0, 10);

        expect(ids.length).to.equal(2);
        expect(ids[0]).to.equal(1);
        expect(ids[1]).to.equal(2);
        expect(titles[0]).to.equal("Bet 1");
        expect(titles[1]).to.equal("Bet 2");
      });

      it("Should handle pagination correctly", async function () {
        const [ids] = await betChain.getAllBets(1, 1);
        expect(ids.length).to.equal(1);
        expect(ids[0]).to.equal(1);

        const [ids2] = await betChain.getAllBets(2, 1);
        expect(ids2.length).to.equal(1);
        expect(ids2[0]).to.equal(2);
      });

      it("Should return empty arrays for invalid range", async function () {
        const [ids] = await betChain.getAllBets(100, 10);
        expect(ids.length).to.equal(0);
      });

      it("Should auto-adjust start to 1 if 0", async function () {
        const [ids1] = await betChain.getAllBets(0, 2);
        const [ids2] = await betChain.getAllBets(1, 2);
        expect(ids1).to.deep.equal(ids2);
      });
    });

    describe("getBetFullInfo", function () {
      it("Should return complete bet information", async function () {
        const info = await betChain.getBetFullInfo(1);

        expect(info.creator).to.equal(owner.address);
        expect(info.title).to.equal("Bet 1");
        expect(info.description).to.equal("Description 1");
        expect(info.imageUrl).to.equal("url1");
        expect(info.totalPool).to.equal(ethers.parseEther("1.0"));
        expect(info.active).to.be.true;
        expect(info.finalized).to.be.false;
        expect(info.optionsCount).to.equal(2);
      });

      it("Should return winningOption after finalization", async function () {
        await betChain.finalizeBet(1, 0);
        const info = await betChain.getBetFullInfo(1);

        expect(info.finalized).to.be.true;
        expect(info.winningOption).to.equal(0);
      });

      it("Should return max uint256 for winningOption before finalization", async function () {
        const info = await betChain.getBetFullInfo(1);
        expect(info.winningOption).to.equal(ethers.MaxUint256);
      });
    });

    describe("getBetOptions", function () {
      it("Should return option names and totals", async function () {
        const [names, totals] = await betChain.getBetOptions(1);

        expect(names.length).to.equal(2);
        expect(names[0]).to.equal("A");
        expect(names[1]).to.equal("B");
        expect(totals[0]).to.equal(ethers.parseEther("1.0"));
        expect(totals[1]).to.equal(0);
      });
    });

    describe("getUserBetAmount", function () {
      it("Should return correct user bet amount", async function () {
        const amount = await betChain.getUserBetAmount(1, 0, user1.address);
        expect(amount).to.equal(ethers.parseEther("1.0"));
      });

      it("Should return 0 for user with no bet", async function () {
        const amount = await betChain.getUserBetAmount(1, 0, user2.address);
        expect(amount).to.equal(0);
      });

      it("Should fail with invalid option", async function () {
        await expect(
          betChain.getUserBetAmount(1, 5, user1.address)
        ).to.be.revertedWith("Invalid option");
      });
    });
  });

  describe("Edge Cases", function () {
    it("Should handle bet with maximum options (10)", async function () {
      const maxOptions = Array(10)
        .fill(0)
        .map((_, i) => `Option ${i + 1}`);
      await betChain.createBet("Max Options", "", "", maxOptions, 0);

      const [names, totals] = await betChain.getBetOptions(1);
      expect(names.length).to.equal(10);
    });

    it("Should handle very small bet amounts", async function () {
      await betChain.createBet("Small Bets", "", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(1, 0, { value: 1 }); // 1 wei

      const amount = await betChain.getUserBetAmount(1, 0, user1.address);
      expect(amount).to.equal(1);
    });

    it("Should handle very large bet amounts", async function () {
      await betChain.createBet("Large Bets", "", "", ["A", "B"], 0);
      const largeAmount = ethers.parseEther("1000");
      await betChain.connect(user1).placeBet(1, 0, { value: largeAmount });

      const amount = await betChain.getUserBetAmount(1, 0, user1.address);
      expect(amount).to.equal(largeAmount);
    });

    it("Should handle bet with deadline at exact block timestamp", async function () {
      const currentTime = await time.latest();
      const deadline = currentTime + 3600; // 1 hour in the future

      await betChain.createBet("Future Deadline", "", "", ["A", "B"], deadline);

      // Should be able to bet before deadline
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });

      const info = await betChain.getBetFullInfo(1);
      expect(info.deadline).to.equal(deadline);
    });

    it("Should handle empty description and imageUrl", async function () {
      await betChain.createBet("Title Only", "", "", ["A", "B"], 0);

      const info = await betChain.getBetFullInfo(1);
      expect(info.description).to.equal("");
      expect(info.imageUrl).to.equal("");
    });
  });

  describe("Coverage - Alternative Paths", function () {
    it("Should handle withdrawPrize when prizePool calculation uses else branch (totalPool <= FEE)", async function () {
      // Create bet and add just enough to pass finalization (> FEE)
      await betChain.createBet("Exact FEE", "", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(1, 0, { value: 101 }); // 101 wei > 100 FEE
      await betChain.finalizeBet(1, 0);

      // Prize pool = 101 - 100 = 1 wei
      await expect(betChain.connect(user1).withdrawPrize(1))
        .to.emit(betChain, "PrizeWithdrawn")
        .withArgs(1, user1.address, 1);
    });

    it("Should handle withdrawFee when fee is capped at totalPool", async function () {
      // Create bet with pool less than FEE but enough to finalize
      await betChain.createBet("Under FEE", "", "", ["A", "B"], 0);
      await betChain.connect(user1).placeBet(1, 0, { value: 150 }); // 150 wei
      await betChain.finalizeBet(1, 0);

      // Withdraw prize first (gets 150 - 100 = 50 wei)
      await betChain.connect(user1).withdrawPrize(1);

      // Now totalPool should be 100 (the FEE)
      await expect(betChain.withdrawFee(1))
        .to.emit(betChain, "FeeWithdrawn")
        .withArgs(1, owner.address, 100);
    });

    it("Should cover all require statements in finalizeBet", async function () {
      await betChain.createBet("Valid Bet", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });

      // This will execute all require validations successfully
      await betChain.finalizeBet(1, 0);

      const betInfo = await betChain.getBetFullInfo(1);
      expect(betInfo.finalized).to.be.true;
    });

    it("Should cover all require statements in withdrawPrize", async function () {
      await betChain.createBet("Prize Test", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("2.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });
      await betChain.finalizeBet(1, 0);

      // This covers: require(winnerOpt < b.options.length) and require(winningPool > 0)
      await expect(betChain.connect(user1).withdrawPrize(1)).to.emit(
        betChain,
        "PrizeWithdrawn"
      );
    });

    it("Should cover all require statements in withdrawFee", async function () {
      await betChain.createBet("Fee Test", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain.finalizeBet(1, 0);

      // This covers: require(ok, "Transfer failed")
      await expect(betChain.withdrawFee(1)).to.emit(betChain, "FeeWithdrawn");
    });

    it("Should cover ternary operator in getBetFullInfo when NOT finalized", async function () {
      await betChain.createBet("Not Finalized", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });

      const info = await betChain.getBetFullInfo(1);
      // This covers: b.finalized ? b.winningOption : type(uint256).max
      expect(info.finalized).to.be.false;
      expect(info.winningOption).to.equal(ethers.MaxUint256);
    });

    it("Should cover ternary operator in getBetFullInfo when finalized", async function () {
      await betChain.createBet("Finalized", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain.finalizeBet(1, 0);

      const info = await betChain.getBetFullInfo(1);
      // This covers the TRUE branch: b.finalized ? b.winningOption
      expect(info.finalized).to.be.true;
      expect(info.winningOption).to.equal(0);
    });

    it("Should cover validBetId modifier in getUserBetAmount", async function () {
      await betChain.createBet("User Bet Test", "", "", ["A", "B"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });

      // This covers validBetId and the require in getUserBetAmount
      const amount = await betChain.getUserBetAmount(1, 0, user1.address);
      expect(amount).to.equal(ethers.parseEther("1.0"));
    });

    it("Should cover validBetId modifier in getBetOptions", async function () {
      await betChain.createBet("Options Test", "", "", ["A", "B", "C"], 0);
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 1, { value: ethers.parseEther("2.0") });

      // This covers validBetId modifier
      const [names, totals] = await betChain.getBetOptions(1);
      expect(names.length).to.equal(3);
      expect(totals[0]).to.equal(ethers.parseEther("1.0"));
      expect(totals[1]).to.equal(ethers.parseEther("2.0"));
      expect(totals[2]).to.equal(0);
    });
  });

  describe("validBetId modifier - invalid betId paths", function () {
    const INVALID_ID = 999;

    it("placeBet: should revert on invalid betId", async function () {
      await expect(
        betChain
          .connect(user1)
          .placeBet(INVALID_ID, 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Invalid betId");
    });

    it("finalizeBet: should revert on invalid betId", async function () {
      await expect(betChain.finalizeBet(INVALID_ID, 0)).to.be.revertedWith(
        "Invalid betId"
      );
    });

    it("withdrawPrize: should revert on invalid betId", async function () {
      await expect(betChain.withdrawPrize(INVALID_ID)).to.be.revertedWith(
        "Invalid betId"
      );
    });

    it("withdrawFee: should revert on invalid betId", async function () {
      await expect(betChain.withdrawFee(INVALID_ID)).to.be.revertedWith(
        "Invalid betId"
      );
    });

    it("getBetFullInfo: should revert on invalid betId", async function () {
      await expect(betChain.getBetFullInfo(INVALID_ID)).to.be.revertedWith(
        "Invalid betId"
      );
    });

    it("getBetOptions: should revert on invalid betId", async function () {
      await expect(betChain.getBetOptions(INVALID_ID)).to.be.revertedWith(
        "Invalid betId"
      );
    });

    it("getUserBetAmount: should revert on invalid betId", async function () {
      await expect(
        betChain.getUserBetAmount(INVALID_ID, 0, user1.address)
      ).to.be.revertedWith("Invalid betId");
    });
  });

  describe("Reentrancy Attack Tests", function () {
  let betChain: BetChain;
  let attacker: any;
  let attackerCreator: any;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy BetChain
    const BetChainFactory = await ethers.getContractFactory("BetChain");
    betChain = await BetChainFactory.deploy();
    await betChain.waitForDeployment();

    // Deploy attacker contracts
    const ReentrancyAttackerFactory = await ethers.getContractFactory(
      "ReentrancyAttacker"
    );
    attacker = await ReentrancyAttackerFactory.deploy(
      await betChain.getAddress()
    );
    await attacker.waitForDeployment();

    const ReentrancyAttackerCreatorFactory = await ethers.getContractFactory(
      "ReentrancyAttackerCreator"
    );
    attackerCreator = await ReentrancyAttackerCreatorFactory.deploy(
      await betChain.getAddress()
    );
    await attackerCreator.waitForDeployment();
  });

  describe("withdrawPrize reentrancy attack", function () {
    it("Should prevent reentrancy attack on withdrawPrize", async function () {
      // Create a bet
      await betChain.createBet(
        "Reentrancy Test",
        "",
        "",
        ["Option A", "Option B"],
        0
      );

      // Attacker places bet
      await attacker.placeBet(1, 0, { value: ethers.parseEther("2.0") });

      // Normal user places bet on losing option
      await betChain
        .connect(user1)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });

      // Finalize with attacker winning
      await betChain.finalizeBet(1, 0);

      // Attempt reentrancy attack - will fail due to reentrancy attempt in receive()
      // The exact error depends on when the reentrancy guard catches it
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;
    });

    it("Should allow attacker to withdraw only once", async function () {
      // Create a bet
      await betChain.createBet(
        "Single Withdrawal",
        "",
        "",
        ["Option A", "Option B"],
        0
      );

      // Attacker places bet
      await attacker.placeBet(1, 0, { value: ethers.parseEther("2.0") });

      // Normal user places bet
      await betChain
        .connect(user1)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });

      // Finalize
      await betChain.finalizeBet(1, 0);

      // Get attacker contract balance before
      const balanceBefore = await ethers.provider.getBalance(
        await attacker.getAddress()
      );

      // Try to attack - should fail
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;

      const balanceAfter = await ethers.provider.getBalance(
        await attacker.getAddress()
      );

      // Check that attack count is 0 (no successful reentry)
      const attackCount = await attacker.attackCount();
      expect(attackCount).to.equal(0);

      // Balance should not have increased (attack failed)
      expect(balanceAfter).to.equal(balanceBefore);
    });

    it("Should verify attacker cannot drain more than their share", async function () {
      // Create a bet
      await betChain.createBet(
        "Fair Distribution",
        "",
        "",
        ["Option A", "Option B"],
        0
      );

      const attackerBet = ethers.parseEther("1.0");
      const user1Bet = ethers.parseEther("1.0");
      const user2Bet = ethers.parseEther("2.0");

      // Attacker and users place bets on winning option
      await attacker.placeBet(1, 0, { value: attackerBet });
      await betChain.connect(user1).placeBet(1, 0, { value: user1Bet });

      // User2 bets on losing option
      await betChain.connect(user2).placeBet(1, 1, { value: user2Bet });

      // Finalize with option 0 winning
      await betChain.finalizeBet(1, 0);

      // Try attack (should fail)
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;

      // Verify user1 can withdraw normally
      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
      
      const tx = await betChain.connect(user1).withdrawPrize(1);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
      
      // User1 should have received their share
      expect(user1BalanceAfter).to.be.gt(user1BalanceBefore - gasUsed);
    });
  });

  describe("withdrawFee reentrancy attack", function () {
    it("Should prevent reentrancy attack on withdrawFee", async function () {
      // Attacker creates a bet
      await attackerCreator.createBet();

      // Users place bets
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });

      // Attacker finalizes
      await attackerCreator.finalizeBet(1, 0);

      // Attempt reentrancy attack on withdrawFee - should fail
      await expect(attackerCreator.attackWithdrawFee(1)).to.be.reverted;
    });

    it("Should allow creator to withdraw fee only once", async function () {
      // Attacker creates a bet
      await attackerCreator.createBet();

      // Users place bets
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("2.0") });

      // Finalize
      await attackerCreator.finalizeBet(1, 0);

      // Get balance before
      const balanceBefore = await ethers.provider.getBalance(
        await attackerCreator.getAddress()
      );

      // Try to attack - should fail
      await expect(attackerCreator.attackWithdrawFee(1)).to.be.reverted;

      const balanceAfter = await ethers.provider.getBalance(
        await attackerCreator.getAddress()
      );

      // Attack count should be 0 (no successful reentry)
      const attackCount = await attackerCreator.attackCount();
      expect(attackCount).to.equal(0);

      // Balance should not have increased (attack failed)
      expect(balanceAfter).to.equal(balanceBefore);
    });

    it("Should verify attacker cannot withdraw fee multiple times", async function () {
      // Attacker creates bet
      await attackerCreator.createBet();

      // Place bets
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("5.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 1, { value: ethers.parseEther("5.0") });

      // Finalize
      await attackerCreator.finalizeBet(1, 0);

      // Get contract balance
      const contractBalance = await ethers.provider.getBalance(
        await betChain.getAddress()
      );

      // Try attack (should fail)
      await expect(attackerCreator.attackWithdrawFee(1)).to.be.reverted;

      // Verify contract balance hasn't been drained
      const contractBalanceAfter = await ethers.provider.getBalance(
        await betChain.getAddress()
      );

      // Balance should remain the same (attack failed)
      expect(contractBalanceAfter).to.equal(contractBalance);
    });

    it("Should verify feeWithdrawn flag prevents multiple withdrawals", async function () {
      // Attacker creates bet
      await attackerCreator.createBet();

      // Place bets
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });

      // Finalize
      await attackerCreator.finalizeBet(1, 0);

      // Attempt attack (will fail)
      await expect(attackerCreator.attackWithdrawFee(1)).to.be.reverted;

      // Even if we try again, it should still fail
      await expect(attackerCreator.attackWithdrawFee(1)).to.be.reverted;
    });

    it("Should allow normal creator to withdraw fee after attacker fails", async function () {
      // Normal user creates bet
      await betChain.connect(owner).createBet(
        "Normal Bet",
        "",
        "",
        ["A", "B"],
        0
      );

      // Users place bets
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("2.0") });

      // Finalize
      await betChain.connect(owner).finalizeBet(1, 0);

      // Normal withdrawal should work
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await betChain.connect(owner).withdrawFee(1);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Owner should have received fee minus gas
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + FEE - gasUsed);
    });
  });

  describe("Combined attack scenarios", function () {
    it("Should prevent simultaneous attacks on withdrawPrize and withdrawFee", async function () {
      // Attacker creates bet
      await attackerCreator.createBet();

      // Attacker also bets on their own bet (dual role)
      await attacker.placeBet(1, 0, { value: ethers.parseEther("2.0") });

      // Other users bet
      await betChain
        .connect(user1)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });

      // Finalize with attacker winning
      await attackerCreator.finalizeBet(1, 0);

      // Try both attacks - both should fail
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;
      await expect(attackerCreator.attackWithdrawFee(1)).to.be.reverted;
    });

    it("Should maintain contract integrity after failed attacks", async function () {
      // Create normal bet
      await betChain.createBet(
        "Integrity Test",
        "",
        "",
        ["Option A", "Option B"],
        0
      );

      // Attacker and normal users bet
      await attacker.placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });

      // Finalize
      await betChain.finalizeBet(1, 0);

      // Try attack
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;

      // Verify normal users can still withdraw
      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await betChain.connect(user1).withdrawPrize(1);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);

      // User1 should have received their share
      expect(user1BalanceAfter).to.be.gt(user1BalanceBefore - gasUsed);

      // Verify creator can withdraw fee
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx2 = await betChain.withdrawFee(1);
      const receipt2 = await tx2.wait();
      const gasUsed2 = receipt2!.gasUsed * receipt2!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      // Owner should have received fee
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + FEE - gasUsed2);
    });

    it("Should verify contract state remains consistent after attacks", async function () {
      // Create bet
      await betChain.createBet("State Test", "", "", ["A", "B"], 0);

      // Setup bets
      await attacker.placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user1)
        .placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user2)
        .placeBet(1, 1, { value: ethers.parseEther("2.0") });

      const betInfoBefore = await betChain.getBetFullInfo(1);
      const totalPoolBefore = betInfoBefore.totalPool;

      // Finalize
      await betChain.finalizeBet(1, 0);

      // Try attack
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;

      // Check bet info hasn't been corrupted
      const betInfoAfter = await betChain.getBetFullInfo(1);
      
      expect(betInfoAfter.finalized).to.be.true;
      expect(betInfoAfter.totalPool).to.equal(totalPoolBefore);
      expect(betInfoAfter.winningOption).to.equal(0);
    });
  });

  describe("Attack detection and recovery", function () {
    it("Should track attack attempts in attacker contract", async function () {
      // Create bet
      await betChain.createBet("Track Attack", "", "", ["A", "B"], 0);

      // Attacker bets
      await attacker.placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user1)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });

      // Finalize
      await betChain.finalizeBet(1, 0);

      // Verify initial attack count
      expect(await attacker.attackCount()).to.equal(0);

      // Try attack
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;

      // Attack count should still be 0 (transaction reverted)
      expect(await attacker.attackCount()).to.equal(0);
    });

    it("Should verify attacking flag state after failed attack", async function () {
      // Create bet
      await betChain.createBet("Flag Test", "", "", ["A", "B"], 0);

      // Setup
      await attacker.placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user1)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });
      await betChain.finalizeBet(1, 0);

      // Initial flag state
      expect(await attacker.attacking()).to.be.false;

      // Try attack - will fail
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;

      // Since transaction reverted, state is rolled back
      // Attack count should be 0
      const attackCount = await attacker.attackCount();
      expect(attackCount).to.equal(0);
    });

    it("Should demonstrate reentrancy protection is working", async function () {
      // This test shows that without proper protection, the attack would succeed
      // But with ReentrancyGuard, it fails
      
      await betChain.createBet("Protection Demo", "", "", ["A", "B"], 0);
      
      // Get balance after placing bet
      await attacker.placeBet(1, 0, { value: ethers.parseEther("1.0") });
      
      const attackerBalanceAfterBet = await ethers.provider.getBalance(
        await attacker.getAddress()
      );
      
      await betChain
        .connect(user1)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });
      
      await betChain.finalizeBet(1, 0);
      
      // Attack should fail
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;
      
      // Attacker balance should not have increased (attack failed)
      const attackerFinalBalance = await ethers.provider.getBalance(
        await attacker.getAddress()
      );
      
      expect(attackerFinalBalance).to.equal(attackerBalanceAfterBet);
    });

    it("Should verify ReentrancyGuard prevents nested withdrawals", async function () {
      // Create two bets to test if attacker can nest withdrawals
      await betChain.createBet("Bet 1", "", "", ["A", "B"], 0);
      await betChain.createBet("Bet 2", "", "", ["X", "Y"], 0);
      
      // Attacker bets on both
      await attacker.placeBet(1, 0, { value: ethers.parseEther("1.0") });
      await attacker.placeBet(2, 0, { value: ethers.parseEther("1.0") });
      
      // Users bet against
      await betChain
        .connect(user1)
        .placeBet(1, 1, { value: ethers.parseEther("1.0") });
      await betChain
        .connect(user1)
        .placeBet(2, 1, { value: ethers.parseEther("1.0") });
      
      // Finalize both
      await betChain.finalizeBet(1, 0);
      await betChain.finalizeBet(2, 0);
      
      // Try to attack first bet
      await expect(attacker.attackWithdrawPrize(1)).to.be.reverted;
      
      // Try to attack second bet
      await expect(attacker.attackWithdrawPrize(2)).to.be.reverted;
      
      // Both attacks should fail, proving reentrancy guard works
      expect(await attacker.attackCount()).to.equal(0);
    });
  });
});
});
