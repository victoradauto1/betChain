"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import contractABI from "../../abi/BetChain.json";
import { getReadOnlyProvider } from "../../utils/web3Provider"; // ✅ ADDED

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

/**
 * AllBets - Full list of bets
 *
 * Uses getAllBets(), which returns 9 parallel arrays.
 * More efficient than fetching bets one by one (single contract call).
 */
export default function AllBets() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllBets = async () => {
    try {
      const provider = getReadOnlyProvider(); // ✅ CHANGED (was: new ethers.BrowserProvider(window.ethereum))
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      const totalBets = await contract.getTotalBets();
      const total = Number(totalBets);

      if (total === 0) {
        setBets([]);
        setLoading(false);
        return;
      }

      const result = await contract.getAllBets(0, total);
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
      ] = result;

      const formatted = ids.map((id, index) => ({
        id: Number(id),
        title: titles[index],
        imageUrl: imageUrls[index],
        creator: creators[index],
        totalPool: ethers.formatEther(pools[index]),
        isActive: actives[index],
        isFinalized: finals[index],
        optionsCount: Number(optionsCounts[index]),
        deadline: Number(deadlines[index]),
      }));

      setBets(formatted);
    } catch (err) {
      console.error("Error fetching bets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBets();
  }, []);

  return (
    <div className="w-full px-6 py-10">
      <h1 className="text-4xl font-bold text-center mb-10">All Bets</h1>

      {loading ? (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-center text-gray-300">Loading bets...</p>
        </div>
      ) : bets.length === 0 ? (
        <p className="text-center text-gray-400">No bets found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bets.map((bet) => (
            <Link key={bet.id} href={`/betDetails/${bet.id}`}>
              <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl cursor-pointer hover:scale-[1.02] hover:border-indigo-400 transition">
                <img
                  src={bet.imageUrl}
                  alt="Bet Image"
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <h2 className="text-xl font-semibold mb-2">{bet.title}</h2>
                <p className="text-sm text-gray-400">
                  Creator: {bet.creator.slice(0, 6)}...{bet.creator.slice(-4)}
                </p>
                <p
                  className={`mt-2 text-sm font-semibold ${
                    bet.isActive ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {bet.isActive ? "ACTIVE" : "FINISHED"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}