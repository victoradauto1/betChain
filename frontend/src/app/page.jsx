"use client";

/**
 * Home
 *
 * Displays the 3 most recent bets created on the BetChain contract.
 *
 * This page is READ-ONLY and does NOT depend on wallet connection
 * or BetChainContext.
 *
 * Data flow:
 * - Fetch total number of bets from `betCount`
 * - Retrieve summarized bet info via `getBetInfo`
 * - Consume logical status directly from the contract
 *   (deadline-sovereign, no client-side derivation)
 * - Render the last 3 bets in reverse order (most recent first)
 */

import { ethers } from "ethers";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import PageHeaderActions from "../components/PageHeaderActions";
import { getReadOnlyProvider } from "../utils/web3Provider";
import BetChainABI from "../abi/BetChain.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS");
}

export default function Home() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function loadLastBets() {
      try {
        const provider = await getReadOnlyProvider();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          BetChainABI,
          provider
        );

        const total = Number(await contract.betCount());

        if (total === 0) {
          if (isMounted) setBets([]);
          return;
        }

        const fromId = Math.max(0, total - 3);
        const ids = [];

        for (let i = total - 1; i >= fromId; i--) {
          ids.push(i);
        }

        const results = await Promise.all(
          ids.map((id) => contract.getBetInfo(id))
        );

        const parsed = results.map((bet, index) => {
          const [
            title,
            storedStatus,
            logicalStatus,
            deadline,
            winningOption,
            totalPool,
            optionsLocked,
            expired,
          ] = bet;

          return {
            id: ids[index],
            title,
            totalPool,
            logicalStatus,
            deadline: Number(deadline),
          };
        });

        if (isMounted) {
          setBets(parsed);
        }
      } catch (error) {
        console.error("Error loading bets:", error);
        if (isMounted) setBets([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLastBets();

    return () => {
      isMounted = false;
    };
  }, []);

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
              {bets.map((bet) => (
                <div
                  key={bet.id}
                  className="bg-gray-900/70 backdrop-blur-sm p-5 rounded-2xl shadow-md hover:shadow-indigo-600/30 transition cursor-pointer"
                  onClick={() => router.push(`/betDetails/${bet.id}`)}
                >
                  <h3 className="text-lg font-semibold mb-2">
                    {bet.title}
                  </h3>

                  <div className="flex justify-between items-center mt-4 text-sm text-gray-300">
                    <span>
                      {bet.logicalStatus === 0 ? "🟢 Active" : "🔴 Closed"}
                    </span>

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