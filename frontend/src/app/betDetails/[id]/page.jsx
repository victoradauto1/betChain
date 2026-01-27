"use client";

import { parseEther } from "ethers";
import { useEffect, useState } from "react";
import PageHeaderActions from "../../../components/PageHeaderActions";
import BetModal from "../../../components/BetModal";
import ProcessingOverlay from "../../../components/ProcessingOverlay";
import { useBetChain } from "../../../context/BetChainContext";
import { getBetMetadata } from "../../../services/metadataService";
import { getReadOnlyContract } from "../../../utils/web3Provider";

/**
 * BetDetails
 *
 * Displays comprehensive information for a specific bet.
 * Read operations use a standalone provider for public access.
 * Wallet connection required only for placing bets.
 *
 * Displays:
 * - Bet metadata (title, description, image)
 * - Creator address
 * - Deadline information
 * - Current status and pool
 * - Options with distribution percentages
 * - Winning option (if settled)
 */
export default function BetDetails({ params }) {
  const { id } = params;
  const betId = Number(id);

  const { account, actions, connectWallet, isReady } = useBetChain();

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [betAmount, setBetAmount] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    async function fetchBet() {
      try {
        const contract = await getReadOnlyContract();

        const betInfo = await contract.getBetInfo(betId);
        const options = await contract.getOptions(betId);

        const metadata = await getBetMetadata(betId.toString());

        const formattedOptions = options.map((opt, idx) => ({
          name: opt.name,
          amount: Number(parseEther(opt.totalAmount.toString()).toString()) / 1e18,
        }));

        const totalPool = Number(betInfo.totalPool.toString());
        const deadline = Number(betInfo.deadline);
        const now = Math.floor(Date.now() / 1000);
        const isExpired = now >= deadline;

        setBet({
          id: betId,
          title: metadata?.title || betInfo.title,
          description: metadata?.description || "",
          imageUrl: metadata?.imageUrl || "",
          totalPool: totalPool / 1e18,
          status: Number(betInfo.logicalStatus),
          deadline,
          isExpired,
          winningOption:
            betInfo.winningOption !== undefined &&
            betInfo.winningOption !== null &&
            Number(betInfo.winningOption) !== 0
              ? Number(betInfo.winningOption)
              : null,
          options: formattedOptions,
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching bet:", err);
        setBet(null);
        setLoading(false);
      }
    }

    fetchBet();
  }, [betId]);

  const handlePlaceBet = async () => {
    if (!isReady || !account) {
      try {
        await connectWallet();
        return;
      } catch (err) {
        console.error("Failed to connect wallet:", err);
        alert("Failed to connect wallet. Please try again.");
        return;
      }
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
      const amountInWei = parseEther(betAmount);

      await actions.placeBet(betId, selectedOption, amountInWei);

      alert("Bet placed successfully!");
      setShowModal(false);
      setBetAmount("");
      setSelectedOption(null);

      window.location.reload();
    } catch (err) {
      console.error("Failed to place bet:", err);

      if (err.message.includes("user rejected")) {
        alert("Transaction rejected by user.");
      } else if (err.message.includes("insufficient funds")) {
        alert("Insufficient funds in your wallet.");
      } else {
        alert(`Failed to place bet: ${err.message}`);
      }
    } finally {
      setPlacing(false);
    }
  };

  const openBetModal = (optionIndex) => {
    setSelectedOption(optionIndex);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setBetAmount("");
    setSelectedOption(null);
  };

  const formatDeadline = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (status, isExpired) => {
    if (status === 0 && !isExpired) return { text: "OPEN", color: "text-green-400" };
    if (status === 0 && isExpired) return { text: "EXPIRED", color: "text-yellow-400" };
    if (status === 1) return { text: "CLOSED", color: "text-orange-400" };
    if (status === 2) return { text: "SETTLED", color: "text-blue-400" };
    return { text: "UNKNOWN", color: "text-gray-400" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading bet details...</p>
        </div>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        <div className="text-center">
          <p className="text-2xl mb-4">Bet not found</p>
          <p className="text-sm text-gray-400">
            This bet may not exist or there was an error loading it.
          </p>
        </div>
      </div>
    );
  }

  const totalAmount = bet.options.reduce((acc, o) => acc + o.amount, 0);
  const statusInfo = getStatusLabel(bet.status, bet.isExpired);
  const isOpen = bet.status === 0 && !bet.isExpired;

  return (
    <div className="min-h-screen text-white flex flex-col items-center px-6 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-950">
        <div className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale"></div>
        <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <PageHeaderActions title={`Bet Details #${bet.id}`} action="return" />

        <div className="bg-gray-900/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-zinc-700 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{bet.title}</h2>
                {bet.description && (
                  <p className="text-gray-300 mt-2">{bet.description}</p>
                )}
              </div>

              <div className="space-y-2 text-gray-300">
                <p>
                  <span className="font-semibold text-white">Status:</span>{" "}
                  <span className={statusInfo.color}>{statusInfo.text}</span>
                </p>
                <p>
                  <span className="font-semibold text-white">Total Pool:</span>{" "}
                  {bet.totalPool.toFixed(4)} ETH
                </p>
                <p>
                  <span className="font-semibold text-white">Deadline:</span>{" "}
                  {formatDeadline(bet.deadline)}
                  {bet.isExpired && (
                    <span className="ml-2 text-yellow-400 text-sm">(Expired)</span>
                  )}
                </p>
                {bet.winningOption !== null && (
                  <p>
                    <span className="font-semibold text-white">Winner:</span>{" "}
                    <span className="text-green-400">
                      {bet.options[bet.winningOption]?.name || `Option ${bet.winningOption}`}
                    </span>
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">Bet Distribution</h3>

                {bet.options.map((opt, idx) => {
                  const pct = totalAmount > 0 ? (opt.amount / totalAmount) * 100 : 0;
                  const isWinner = bet.winningOption === idx;

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className={`font-medium ${isWinner ? "text-green-400" : ""}`}>
                              {opt.name}
                              {isWinner && " ✓"}
                            </span>
                            <span className="text-gray-300">
                              {pct.toFixed(1)}% ({opt.amount.toFixed(4)} ETH)
                            </span>
                          </div>

                          <div className="w-full h-3 bg-zinc-800 rounded-lg overflow-hidden">
                            <div
                              className={`h-full rounded-lg transition-all ${
                                isWinner
                                  ? "bg-green-600"
                                  : idx === 0
                                  ? "bg-blue-600"
                                  : "bg-purple-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>

                        {isOpen && (
                          <button
                            onClick={() => openBetModal(idx)}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Bet
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {bet.imageUrl && (
              <div className="flex justify-center">
                <img
                  src={bet.imageUrl}
                  alt={bet.title}
                  className="w-48 h-48 object-cover rounded-xl shadow-lg hover:scale-105 transition-transform"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <BetModal
        isOpen={showModal}
        onClose={closeModal}
        onConfirm={handlePlaceBet}
        selectedOption={bet?.options[selectedOption]?.name}
        betAmount={betAmount}
        setBetAmount={setBetAmount}
        isConnected={isReady && account}
        isProcessing={placing}
      />

      {placing && <ProcessingOverlay message="Processing your bet..." />}
    </div>
  );
}