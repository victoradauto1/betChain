"use client";

import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBetChain } from "../context/betChainContext";
import PageHeaderActions from "../components/PageHeaderActions";
import Link from "next/link";

export default function Home() {
  const { contract, account, connectWallet } = useBetChain();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadBets = async () => {
      if (!contract) return;
      setLoading(true);
      try {
        const nextId = await contract.methods.nextId().call();
        const total = Number(nextId);

        console.log("📊 NextId from contract:", total);

        const betsList = [];

        for (let i = 1; i < total; i++) {
          try {
            const bet = await contract.methods.getBetInfo(i).call();
            betsList.push({
              id: i,
              creator: bet.creator,
              title: bet.title,
              description: bet.description,
              imageUrl: bet.imageUrl,
              totalPool: bet.totalPool,
              active: bet.active,
              finalized: bet.finalized,
            });
          } catch (err) {
            console.error(`Error loading bet ${i}:`, err);
          }
        }

        if (betsList.length === 0) {
          console.log("⚠️ No bets found in contract, using mock data");
          betsList.push(
            {
              id: 1,
              creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
              title: "Champions League Winner 2025",
              description:
                "Who will win the UEFA Champions League this season?",
              imageUrl:
                "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
              totalPool: ethers.parseEther("1.24").toString(),
              active: true,
              finalized: false,
            },
            {
              id: 2,
              creator: "0x123d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
              title: "UFC 300 Main Event",
              description: "Predict the winner and method of victory",
              imageUrl:
                "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400",
              totalPool: ethers.parseEther("0.82").toString(),
              active: true,
              finalized: false,
            },
            {
              id: 3,
              creator: "0x456d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
              title: "Formula 1 Monaco GP",
              description: "Who will stand on the podium?",
              imageUrl:
                "https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=400",
              totalPool: ethers.parseEther("2.15").toString(),
              active: false,
              finalized: true,
            }
          );
        }

        setBets(betsList.reverse());
      } catch (err) {
        console.error("❌ Error loading bets:", err);

        setBets([
          {
            id: 1,
            creator: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
            title: "Champions League Winner 2025",
            description:
              "Who will win the UEFA Champions League this season?",
            imageUrl:
              "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
            totalPool: ethers.parseEther("1.24").toString(),
            active: true,
            finalized: false,
          },
        ]);
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
          className="absolute inset-0 bg-[url('/images/stadiumBet.png')]
                     bg-cover bg-center opacity-20 mix-blend-lighten grayscale"
        ></div>
        <div
          className="absolute inset-0 bg-linear-to-b
          from-black via-black/80 to-transparent"
        ></div>
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
