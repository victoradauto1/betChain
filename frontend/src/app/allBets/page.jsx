"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import contractABI from "../../abi/BetChain.json";

const CONTRACT_ADDRESS = "0x3d490A5bE3da102790E59DBa4afb811941589A2b";

export default function AllBets() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  // -----------------------------------------------------------
  // Fetch all bets from the blockchain
  // -----------------------------------------------------------
  const fetchAllBets = async () => {
    try {
      // Connect to the user's wallet
      if (!window.ethereum) {
        console.error("MetaMask not detected");
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      console.log("🔍 Contract address:", CONTRACT_ADDRESS);

      // Get total number of bets first
      const totalBets = await contract.getTotalBets();
      const total = Number(totalBets);

      console.log("📊 Total bets in contract:", total);

      if (total === 0) {
        console.log("⚠️ No bets found in contract");
        setBets([]);
        setLoading(false);
        return;
      }

      // ✅ Call getAllBets with pagination (start=0 will auto-adjust to 1 in contract)
      console.log("📡 Calling getAllBets(0, " + total + ")");
      const result = await contract.getAllBets(0, total);

      console.log("📦 Raw result from contract:", result);

      // ✅ Destructure the 9 arrays returned by the contract
      const [
        ids,
        creators,
        titles,
        imageUrls,
        pools,
        actives,
        finals,
        optionsCounts,
        deadlines
      ] = result;

      console.log("🔢 IDs:", ids.map(Number));
      console.log("👤 Creators:", creators);
      console.log("📝 Titles:", titles);
      console.log("✅ Actives:", actives);

      // ✅ Transform arrays into objects
      const formatted = ids.map((id, index) => ({
        id: Number(id),
        title: titles[index],
        description: "", // getAllBets não retorna description
        imageUrl: imageUrls[index],
        creator: creators[index],
        totalPool: ethers.formatEther(pools[index]),
        isActive: actives[index],
        isFinalized: finals[index],
        optionsCount: Number(optionsCounts[index]),
        deadline: Number(deadlines[index]),
      }));

      console.log("✅ Formatted bets:", formatted);

      setBets(formatted);
    } catch (err) {
      console.error("❌ Error fetching bets:", err);
      console.error("❌ Error details:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // Load bets on component mount
  // -----------------------------------------------------------
  useEffect(() => {
    fetchAllBets();
  }, []);

  return (
    <div className="w-full px-6 py-10">
      <h1 className="text-4xl font-bold text-center mb-10">All Bets</h1>

      {/* Loading feedback */}
      {loading ? (
        <p className="text-center text-gray-300">Loading bets...</p>
      ) : bets.length === 0 ? (
        <p className="text-center text-gray-400">No bets found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bets.map((bet) => (
            <Link key={bet.id} href={`/betDetails/${bet.id}`}>
              <div
                className="
                  bg-gray-800 border border-gray-700 p-4 rounded-xl cursor-pointer
                  hover:scale-[1.02] hover:border-indigo-400 transition
                "
              >
                {/* Bet image */}
                <img
                  src={bet.imageUrl}
                  alt="Bet Image"
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />

                {/* Title */}
                <h2 className="text-xl font-semibold mb-2">{bet.title}</h2>

                {/* Creator */}
                <p className="text-sm text-gray-400">
                  Creator: {bet.creator.slice(0, 6)}...{bet.creator.slice(-4)}
                </p>

                {/* Status */}
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