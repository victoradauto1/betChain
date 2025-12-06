"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import contractABI from "../../abi/BetChain.json";

// Replace with your deployed contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

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
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      // Call the smart contract method
      const allBets = await contract.getAllBets();

      // Normalize results to match card display
      const formatted = allBets.map((bet, index) => ({
        id: index,
        title: bet.title,
        description: bet.description,
        imageUrl: bet.imageUrl,
        creator: bet.creator,
        isActive: bet.isActive,
      }));

      setBets(formatted);
    } catch (err) {
      console.error("Error fetching bets:", err);
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
