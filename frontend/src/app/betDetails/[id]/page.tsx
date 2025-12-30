"use client";

import { ethers } from "ethers";
import { useEffect, useState } from "react";
import PageHeaderActions from "../../../components/PageHeaderActions";
import { useBetChain } from "../../../context/BetChainContext";

/**
 * BetDetails - Details of a specific bet
 *
 * Features:
 * - Displays full bet information
 * - Shows bet distribution per option
 * - Allows placing a bet (interactive modal)
 * - Validates wallet connection
 */
export default function BetDetails({ params }) {
  const { id } = params;
  const betId = Number(id);

  const { contract, account, web3 } = useBetChain();

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [betAmount, setBetAmount] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    async function fetchBet() {
      if (!contract || !betId) {
        setLoading(false);
        return;
      }

      try {
        const result = await contract.methods.getBetFullInfo(betId).call();
        const optionsResult = await contract.methods.getBetOptions(betId).call();

        // Web3 may return an object or an array depending on the version
        const options = (optionsResult.names || optionsResult[0]).map((name, i) => ({
          name,
          amount: Number(
            ethers.formatEther((optionsResult.totals || optionsResult[1])[i])
          ),
        }));

        setBet({
          id: betId,
          title: result.title || result[1],
          description: result.description || result[2],
          creator: result.creator || result[0],
          amount: `${ethers.formatEther(result.totalPool || result[4])} ETH`,
          active: result.active || result[5],
          finalized: result.finalized || result[6],
          imageUrl: result.imageUrl || result[3],
          deadline: Number(result.deadline || result[8]),
          winningOption:
            (result.winningOption || result[9]) !==
            "115792089237316195423570985008687907853269984665640564039457584007913129639935"
              ? Number(result.winningOption || result[9])
              : null,
          options,
        });
      } catch (err) {
        console.error("Error fetching bet:", err);
        setBet(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBet();
  }, [contract, betId]);

  // Sends the bet transaction to the blockchain
  const handlePlaceBet = async () => {
    if (!account) {
      alert("Please connect your wallet first!");
      return;
    }

    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert("Please enter a valid bet amount!");
      return;
    }

    if (selectedOption === null) {
      alert("Please select an option!");
      return;
    }

    setPlacing(true);

    try {
      const amountInWei = web3.utils.toWei(betAmount, "ether");

      await contract.methods
        .placeBet(betId, selectedOption)
        .send({ from: account, value: amountInWei });

      alert("Bet placed successfully! 🎉");
      setShowModal(false);
      setBetAmount("");
      setSelectedOption(null);
      window.location.reload();
    } catch (err) {
      console.error("Failed to place bet:", err);
      alert("Failed to place bet. Check console for details.");
    } finally {
      setPlacing(false);
    }
  };

  const openBetModal = (optionIndex) => {
    setSelectedOption(optionIndex);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Bet not found.
      </div>
    );
  }

  const totalAmount = bet.options.reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="min-h-screen text-white flex flex-col items-center px-6 py-10 relative overflow-hidden">
      {/* background visuals omitted for brevity */}

      {/* Bet modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Place Your Bet</h2>

            {/* modal content */}
          </div>
        </div>
      )}
    </div>
  );
}
