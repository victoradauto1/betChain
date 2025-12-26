"use client";

import { ethers } from "ethers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageHeaderActions from "../components/PageHeaderActions";
import { useBetChain } from "../context/BetChainContext";

export default function Home() {
  const { contract, account, connectWallet } = useBetChain();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadBets = async () => {
      console.log("🔍 Contract object:", contract);
      
      if (!contract) {
        console.log("⚠️ Contract not available yet");
        return;
      }

      setLoading(true);
      try {
        console.log("📡 Calling contract.methods.nextId()...");
        const nextId = await contract.methods.nextId().call();
        const total = Number(nextId);

        console.log("📊 NextId from contract:", total);
        console.log("📊 Type of total:", typeof total);

        if (total === 0) {
          console.log("⚠️ No bets found in contract");
          setBets([]);
          setLoading(false);
          return;
        }

        console.log(`🔄 Starting loop from 1 to ${total}`);

        const betsList = [];

        // ✅ Loop começa em 1 e vai até total (INCLUINDO total)
        for (let i = 1; i <= total; i++) {
          console.log(`🔄 Fetching bet #${i}...`);
          try {
            // ✅ Web3 retorna um OBJETO, não array
            const result = await contract.methods.getBetFullInfo(i).call();
            
            console.log(`📦 Raw result for bet #${i}:`, result);

            // ✅ Acessar como objeto (Web3 style)
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
              winningOption: (result.finalized || result[6]) ? Number(result.winningOption || result[9]) : null,
            });

            console.log(`✅ Loaded bet #${i}:`, result.title || result[1]);
          } catch (err) {
            console.error(`❌ Error loading bet ${i}:`, err);
          }
        }

        console.log("📦 Total bets loaded:", betsList.length);

        // ✅ Reverter para mostrar as mais recentes primeiro
        setBets(betsList.reverse());
      } catch (err) {
        console.error("❌ Error loading bets:", err);
        setBets([]);
      } finally {
        setLoading(false);
      }
    };

    loadBets();
  }, [contract]);

  return (
    <div className="min-h-screen text-white flex flex-col items-center px-6 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-950">
        <div
          className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale"
        ></div>
        <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <PageHeaderActions title="Last Bets" isHome />

        {loading ? (
          <p className="text-gray-400 mt-10">Loading bets...</p>
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
                className="
                  px-6 py-2 rounded-xl text-sm font-semibold
                  border border-indigo-400 text-indigo-400
                  hover:bg-indigo-600 hover:text-white
                  transition
                "
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