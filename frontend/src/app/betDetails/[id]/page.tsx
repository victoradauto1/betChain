"use client";

import { useEffect, useState } from "react";
import PageHeaderActions from "../../../components/PageHeaderActions";

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

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );

  if (!bet)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Bet not found.
      </div>
    );

  const totalAmount = bet.options.reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="min-h-screen text-white flex flex-col items-center px-6 py-10 relative overflow-hidden">
      {/* BACKGROUND - EXACT SAME AS HOME */}
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

      {/* PAGE CONTENT */}
      <div className="relative z-10 w-full max-w-6xl">

        {/* HEADER PADRÃO */}
        <PageHeaderActions 
          title={`Bet Details #${bet.id}`} 
          action="return" 
        />

        {/* DETAILS CARD */}
        <div className="bg-gray-900/70 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-zinc-700 mt-4">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

            {/* TEXT SIDE */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{bet.title}</h2>
                <p className="text-gray-300">{bet.description}</p>
              </div>

              <div className="space-y-1 text-gray-300">
                <p><span className="font-semibold text-white">Creator:</span> {bet.creator}</p>
                <p><span className="font-semibold text-white">Amount:</span> {bet.amount}</p>
                <p>
                  <span className="font-semibold text-white">Status:</span>{" "}
                  {bet.active ? "🟢 Active" : "🔴 Closed"}
                </p>
              </div>

              {/* DISTRIBUTION */}
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-semibold">Bet Distribution</h3>

                {bet.options.map((opt, idx) => {
                  const pct = totalAmount > 0 ? (opt.amount / totalAmount) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span>{opt.name}</span>
                        <span className="text-gray-300">{pct.toFixed(1)}%</span>
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

            {/* IMAGE SIDE */}
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
    </div>
  );
}
