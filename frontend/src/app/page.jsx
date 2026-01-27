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
import { getBetMetadata } from "../services/metadataService";
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
          ids.map(async (id) => {
            const betInfo = await contract.getBetInfo(id);
            const options = await contract.getOptions(id);
            const metadata = await getBetMetadata(id.toString());

            const [
              title,
              storedStatus,
              logicalStatus,
              deadline,
              winningOption,
              totalPool,
              optionsLocked,
              expired,
            ] = betInfo;

            const deadlineNum = Number(deadline);
            const now = Math.floor(Date.now() / 1000);
            const isExpired = now >= deadlineNum;
            const status = Number(logicalStatus);

            const isOpen = status === 0 && !isExpired;
            const isClosed = status === 1 || (status === 0 && isExpired);
            const isSettled = status === 2;

            return {
              id,
              title: metadata?.title || title,
              imageUrl: metadata?.imageUrl || "/images/default-bet.png",
              totalPool,
              logicalStatus: status,
              deadline: deadlineNum,
              optionsCount: options.length,
              isOpen,
              isClosed,
              isSettled,
            };
          })
        );

        if (isMounted) {
          setBets(results);
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

  const formatDeadline = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "< 1h";
  };

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
                  className="bg-gray-800 border border-gray-700 p-4 rounded-xl hover:scale-[1.02] hover:border-indigo-400 transition cursor-pointer"
                  onClick={() => router.push(`/betDetails/${bet.id}`)}
                >
                  <img
                    src={bet.imageUrl}
                    alt={bet.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      e.target.src = "/images/default-bet.png";
                    }}
                  />
                  
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {bet.title}
                  </h3>

                  <div className="space-y-1 text-sm text-gray-400">
                    <p>Pool: {ethers.formatEther(bet.totalPool)} ETH</p>
                    <p>Options: {bet.optionsCount}</p>
                    <p>Ends: {formatDeadline(bet.deadline)}</p>
                  </div>

                  <p
                    className={`mt-3 text-sm font-semibold ${
                      bet.isOpen
                        ? "text-green-400"
                        : bet.isSettled
                        ? "text-blue-400"
                        : "text-orange-400"
                    }`}
                  >
                    {bet.isSettled ? "SETTLED" : bet.isClosed ? "CLOSED" : "OPEN"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/allBets"
                className="px-6 py-2 rounded-xl text-sm font-semibold border border-indigo-400 text-indigo-400 hover:bg-indigo-600 hover:text-white transition cursor-pointer"
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