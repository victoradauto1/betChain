"use client";

import { ethers } from "ethers";
import { useEffect, useState } from "react";
import PageHeaderActions from "../../../components/PageHeaderActions";
import { useBetChain } from "../../../context/BetChainContext";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3d490A5bE3da102790E59DBa4afb811941589A2b";
import BetChainABI from "../../../abi/BetChain.json";

export default function BetDetails({ params }) {
  const { id } = params;
  const betId = Number(id);

  // ✅ Só usa Context para ESCREVER (apostar)
  // Leitura usa provider independente
  const { account, web3, contract: contextContract, connectWallet } = useBetChain();

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [betAmount, setBetAmount] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    async function fetchBet() {
      try {
        if (!window.ethereum) {
          console.error("MetaMask not detected");
          setBet(null);
          setLoading(false);
          return;
        }

        // ✅ Provider independente - funciona SEM carteira conectada
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, BetChainABI, provider);

        const result = await contract.getBetFullInfo(betId);
        const optionsResult = await contract.getBetOptions(betId);

        const options = (optionsResult.names || optionsResult[0]).map((name, i) => ({
          name,
          amount: Number(ethers.formatEther((optionsResult.totals || optionsResult[1])[i])),
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
            (result.winningOption || result[9]) !== "115792089237316195423570985008687907853269984665640564039457584007913129639935"
              ? Number(result.winningOption || result[9])
              : null,
          options,
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching bet:", err);
        setBet(null);
        setLoading(false);
      }
    }

    fetchBet();
  }, [betId]); // ✅ Sem dependência de carteira

  const handlePlaceBet = async () => {
    // ✅ Se não tiver carteira, oferece conectar
    if (!account) {
      const userWantsToConnect = confirm(
        "You need to connect your wallet to place a bet. Connect now?"
      );
      
      if (userWantsToConnect) {
        await connectWallet();
        return; // Usuário precisa clicar novamente após conectar
      }
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

      await contextContract.methods
        .placeBet(betId, selectedOption)
        .send({ from: account, value: amountInWei });

      alert("Bet placed successfully! 🎉");
      setShowModal(false);
      setBetAmount("");
      setSelectedOption(null);

      // Recarrega dados da aposta
      window.location.reload();
    } catch (err) {
      console.error("Failed to place bet:", err);

      if (err.code === 4001) {
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
          <p className="text-2xl mb-4">❌ Bet not found</p>
          <p className="text-sm text-gray-400">This bet may not exist or there was an error loading it.</p>
        </div>
      </div>
    );
  }

  const totalAmount = bet.options.reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="min-h-screen text-white flex flex-col items-center px-6 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-950">
        <div className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale"></div>
        <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <PageHeaderActions title={`Bet Details #${bet.id}`} action="return" />

        <div className="bg-gray-900/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-zinc-700 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{bet.title}</h2>
                <p className="text-gray-300">{bet.description}</p>
              </div>

              <div className="space-y-1 text-gray-300">
                <p>
                  <span className="font-semibold text-white">Creator:</span> {bet.creator}
                </p>
                <p>
                  <span className="font-semibold text-white">Total Pool:</span> {bet.amount}
                </p>
                <p>
                  <span className="font-semibold text-white">Status:</span>{" "}
                  {bet.active ? "🟢 Active" : "🔴 Closed"}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">Bet Distribution</h3>

                {bet.options.map((opt, idx) => {
                  const pct = totalAmount > 0 ? (opt.amount / totalAmount) * 100 : 0;

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{opt.name}</span>
                            <span className="text-gray-300">
                              {pct.toFixed(1)}% ({opt.amount.toFixed(4)} ETH)
                            </span>
                          </div>

                          <div className="w-full h-3 bg-zinc-800 rounded-lg overflow-hidden">
                            <div
                              className={`h-full rounded-lg transition-all ${
                                idx === 0 ? "bg-blue-600" : "bg-purple-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>

                        {bet.active && (
                          <button
                            onClick={() => openBetModal(idx)}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors whitespace-nowrap"
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

      {/* MODAL DE APOSTA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Place Your Bet</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Selected Option:</label>
                <div className="px-4 py-2 bg-gray-800 rounded-lg">{bet.options[selectedOption]?.name}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Bet Amount (ETH):</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="0.01"
                  className="w-full px-4 py-2 bg-gray-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  disabled={placing}
                />
              </div>

              {!account && (
                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
                  <p className="text-yellow-400 text-sm font-semibold mb-2">
                    ⚠️ Wallet not connected
                  </p>
                  <p className="text-gray-300 text-xs">
                    Click "Confirm Bet" to connect your wallet first
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setBetAmount("");
                    setSelectedOption(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                  disabled={placing}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceBet}
                  disabled={placing}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  {placing ? "Placing..." : account ? "Confirm Bet" : "Connect & Bet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LOADING */}
      {placing && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-60 px-4">
          <div className="bg-linear-to-br from-gray-900 to-gray-800 border-2 border-green-500 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-green-500/30 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-3">Processing Your Bet</h3>
            <p className="text-gray-300 mb-2">Waiting for blockchain confirmation...</p>
            <p className="text-sm text-gray-400">Please confirm in MetaMask and do not close this window.</p>

            <div className="mt-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <p className="text-xs text-gray-400">⏱️ This usually takes 10-15 seconds</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}