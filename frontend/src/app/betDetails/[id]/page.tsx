"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageTitle from "../../../components/PageTitle";
import OraclePrice from "../../../components/OraclePrice"; // ⬅️ ADD

export default function BetDetails({ params }) {
  const { id } = params;

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch bet data (placeholder for now)
  useEffect(() => {
    async function fetchBet() {
      try {
        const dummyBet = {
          id,
          title: "Example Bet Title",
          description: "Detailed description of this bet goes here.",
          creator: "0x123...abc",
          amount: "0.25 ETH",
          active: true,
        };

        setBet(dummyBet);
      } catch (error) {
        console.error("Failed to fetch bet:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBet();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-lg">
        Loading bet details...
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400 text-lg">
        Bet not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col items-center px-4 py-10">

      {/* Oracle Price ⬇️ */}
      <div className="mb-6">
        <OraclePrice />
      </div>

      <Link
        href="/allBets"
        className="text-4xl mb-6 hover:scale-110 transition-transform"
      >
        ↩
      </Link>

      <PageTitle shine>BetCain | Details {bet.id}</PageTitle>

      <div className="w-full max-w-2xl mt-6 bg-zinc-900 p-6 rounded-2xl shadow-xl border border-zinc-700">
        <h2 className="text-xl font-bold mb-3">{bet.title}</h2>
        <p className="mb-4 text-zinc-300">{bet.description}</p>

        <div className="space-y-2 text-zinc-400">
          <p>
            <span className="font-semibold text-white">Creator:</span>{" "}
            {bet.creator}
          </p>
          <p>
            <span className="font-semibold text-white">Amount:</span>{" "}
            {bet.amount}
          </p>
          <p>
            <span className="font-semibold text-white">Status:</span>{" "}
            {bet.active ? "Active" : "Closed"}
          </p>
        </div>
      </div>
    </div>
  );
}
