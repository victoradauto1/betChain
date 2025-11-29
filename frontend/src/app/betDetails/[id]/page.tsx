"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageTitle from "../../../components/PageTitle";
import OraclePrice from "../../../components/OraclePrice";

export default function BetDetails({ params }) {
  const { id } = params;

  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);

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
          imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",

          options: [
            { name: "Option A", amount: 3.2 },
            { name: "Option B", amount: 6.8 },
          ],
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

  const totalAmount = bet.options.reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col items-center px-4 py-10">

      {/* ORACLE PRICE */}
      <div className="mb-6">
        <OraclePrice />
      </div>

      {/* CLEAN + PROFESSIONAL BACK BUTTON */}
      <div className="w-full max-w-3xl mb-4">
        <Link
          href="/allBets"
          className="inline-block text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-white transition-all"
        >
          ← Back
        </Link>
      </div>

      <PageTitle shine>BetChain | Details {bet.id}</PageTitle>

      {/* MAIN CARD */}
      <div className="w-full max-w-3xl mt-6 bg-zinc-900/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-zinc-700">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

          {/* LEFT SIDE */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{bet.title}</h2>
              <p className="text-zinc-400">{bet.description}</p>
            </div>

            <div className="space-y-2">
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
                {bet.active ? "🟢 Active" : "🔴 Closed"}
              </p>
            </div>

            {/* OPTIONS DISTRIBUTION */}
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Bet Distribution</h3>

              {bet.options.map((opt, idx) => {
                const pct = totalAmount > 0 ? (opt.amount / totalAmount) * 100 : 0;

                return (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{opt.name}</span>
                      <span className="text-zinc-300">{pct.toFixed(1)}%</span>
                    </div>

                    <div className="w-full h-3 bg-zinc-800 rounded-lg overflow-hidden">
                      <div
                        className={`h-full rounded-lg transition-all ${
                          idx === 0 ? "bg-blue-600" : "bg-purple-600"
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE IMAGE */}
          {bet.imageUrl && (
            <div className="flex justify-center">
              <img
                src={bet.imageUrl}
                alt={bet.title}
                className="w-48 h-48 object-cover rounded-xl shadow-lg hover:scale-105 transition-transform"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
