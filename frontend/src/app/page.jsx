"use client";

import { ethers } from "ethers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageHeaderActions from "../components/PageHeaderActions";

/**
 * Home - Main page displaying the last 3 bets
 *
 * Flow:
 * 1. Fetch nextId from the contract (total number of created bets)
 * 2. Loop from 1 to nextId fetching data for each bet
 * 3. Display the 3 most recent bets (reversed order)
 */
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3d490A5bE3da102790E59DBa4afb811941589A2b";
import BetChainABI from "../abi/BetChain.json";

export default function Home() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadBets = async () => {
      if (!window.ethereum) {
        console.error("MetaMask not detected");
        return;
      }

      setLoading(true);
      try {
        // ✅ Provider independente - funciona SEM carteira conectada
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, BetChainABI, provider);

        const nextId = await contract.nextId();
        const total = Number(nextId);

        if (total === 0) {
          setBets([]);
          setLoading(false);
          return;
        }

        const betsList = [];

        for (let i = 1; i <= total; i++) {
          try {
            const result = await contract.getBetFullInfo(i);

            betsList.push({
              id: i,
              creator: result.creator || result[0],
              title: result.title || result[1],
              description: result.description || result[2],
              imageUrl: result.imageUrl || result[3],
              totalPool: (result.totalPool || result[4]).toString(),
              active: result.active || result[5],
              finalized: result.finalized || result[6],
              optionsCount: Number(result.optionsCount || result[7]),
              deadline: Number(result.deadline || result[8]),
              winningOption: (result.finalized || result[6])
                ? Number(result.winningOption || result[9])
                : null,
            });
          } catch (err) {
            console.error(`Error loading bet ${i}:`, err);
          }
        }

        setBets(betsList.reverse());
      } catch (err) {
        console.error("Error loading bets:", err);
        setBets([]);
      } finally {
        setLoading(false);
      }
    };

    loadBets();
  }, []); // ✅ Sem dependências - carrega independente de carteira

  return (
    <div className="min-h-screen text-white flex flex-col items-center px-6 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-950">
        <div className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale"></div>
        <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <PageHeaderActions title="Last Bets" isHome />

        {loading ? (
          <div className="flex flex-col items-center mt-10">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Loading bets...</p>
          </div>
        ) : bets.length === 0 ? (
          <p className="text-gray-400 mt-10">No bets found yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
              {bets.slice(0, 3).map((bet) => (
                <div
                  key={bet.id}
                  className="bg-gray-900/70 backdrop-blur-sm p-5 rounded-2xl shadow-md hover:shadow-indigo-600/30 transition cursor-pointer"
                  onClick={() => router.push(`/betDetails/${bet.id}`)}
                >
                  {bet.imageUrl && (
                    <img
                      src={bet.imageUrl}
                      alt={bet.title}
                      className="w-full h-40 object-cover rounded-xl mb-3"
                    />
                  )}
                  <h3 className="text-lg font-semibold mb-1">{bet.title}</h3>
                  <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                    {bet.description}
                  </p>
                  <div className="flex justify-between items-center mt-3 text-sm text-gray-300">
                    <span>{bet.active ? "🟢 Active" : "🔴 Closed"}</span>
                    <span className="text-indigo-400">
                      Pool: {ethers.formatEther(bet.totalPool)} ETH
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/allBets"
                className="px-6 py-2 rounded-xl text-sm font-semibold border border-indigo-400 text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
              >
                View All
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

