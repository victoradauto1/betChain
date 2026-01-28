"use client";

import React, { useEffect, useState } from "react";
import { getReadOnlyContract } from "../../utils/web3Provider";
import { getBetMetadata } from "../../services/metadataService";
import PageHeaderActions from "../../components/PageHeaderActions";
import BetCard from "../../components/BetCard";

/**
 * AllBets
 *
 * Displays a comprehensive list of all bets with metadata.
 * Uses read-only contract access for public viewing without wallet connection.
 * Fetches both on-chain data and off-chain metadata for rich display.
 */
export default function AllBets() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllBets = async () => {
    try {
      const contract = await getReadOnlyContract();

      const totalBets = await contract.betCount();
      const total = Number(totalBets);

      if (total === 0) {
        setBets([]);
        setLoading(false);
        return;
      }

      const betPromises = [];
      for (let i = 0; i < total; i++) {
        betPromises.push(fetchSingleBet(contract, i));
      }

      const allBets = await Promise.all(betPromises);
      setBets(allBets.filter(Boolean));
    } catch (err) {
      console.error("Error fetching bets:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleBet = async (contract, betId) => {
    try {
      const betInfo = await contract.getBetInfo(betId);
      const options = await contract.getOptions(betId);

      const metadata = await getBetMetadata(betId.toString());

      const totalPool = Number(betInfo.totalPool.toString()) / 1e18;
      const deadline = Number(betInfo.deadline);
      const now = Math.floor(Date.now() / 1000);
      const isExpired = now >= deadline;
      const status = Number(betInfo.logicalStatus);

      const isOpen = status === 0 && !isExpired;
      const isClosed = status === 1 || (status === 0 && isExpired);
      const isSettled = status === 2;

      return {
        id: betId,
        title: metadata?.title || betInfo.title,
        imageUrl: metadata?.imageUrl || "/images/default-bet.png",
        totalPool: totalPool.toFixed(4),
        optionsCount: options.length,
        deadline,
        isOpen,
        isClosed,
        isSettled,
        status: isSettled ? "SETTLED" : isClosed ? "CLOSED" : "OPEN",
      };
    } catch (err) {
      console.error(`Error fetching bet ${betId}:`, err);
      return null;
    }
  };

  useEffect(() => {
    fetchAllBets();
  }, []);

  return (
    <div className="min-h-screen text-white flex flex-col items-center px-6 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-950">
        <div className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale"></div>
        <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl">
        <PageHeaderActions title="All Bets" action="return" />

        {loading ? (
          <div className="flex flex-col items-center mt-10">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-center text-gray-300">Loading bets...</p>
          </div>
        ) : bets.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No bets found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-6">
            {bets.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}