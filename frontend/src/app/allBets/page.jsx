"use client";

import Link from "next/link";
import PageHeaderActions from "../../components/PageHeaderActions";
import { useEffect, useState } from "react";

export default function AllBets() {
  const [bets, setBets] = useState([]);

  // Load mock shared with Home
  useEffect(() => {
    setBets([
      {
        id: 1,
        title: "Champions League Winner 2025",
        description: "Who will win the UEFA Champions League this season?",
        imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
        totalPool: "1.24 ETH",
        active: true,
      },
      {
        id: 2,
        title: "UFC 300 Main Event",
        description: "Predict the winner and method of victory",
        imageUrl: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400",
        totalPool: "0.82 ETH",
        active: true,
      },
      {
        id: 3,
        title: "Formula 1 Monaco GP",
        description: "Who will stand on the podium?",
        imageUrl: "https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=400",
        totalPool: "2.15 ETH",
        active: false,
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center relative overflow-hidden">

      {/* Background */}
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

      {/* CONTENT */}
      <div className="relative z-10 w-full max-w-6xl px-6 py-10">

        {/* Return button + Title */}
       <PageHeaderActions title="All Bets" action="return"/>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {bets.map((bet) => (
            <Link key={bet.id} href={`/betDetails/${bet.id}`}>
              <div
                className="bg-gray-900/70 backdrop-blur-sm p-5 rounded-2xl shadow-md 
                           hover:shadow-indigo-600/30 transition cursor-pointer 
                           flex flex-col h-full"
              >
                {/* IMAGE */}
                {bet.imageUrl && (
                  <img
                    src={bet.imageUrl}
                    alt={bet.title}
                    className="w-full h-48 object-cover rounded-xl mb-3"
                  />
                )}

                {/* TITLE */}
                <h2 className="text-xl font-semibold mb-1">
                  {bet.title}
                </h2>

                {/* DESCRIPTION (2 lines fixed) */}
                <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                  {bet.description}
                </p>

                {/* FOOTER */}
                <div className="flex justify-between items-center mt-auto pt-3 text-sm text-gray-300">
                  <span>{bet.active ? "🟢 Active" : "🔴 Closed"}</span>
                  <span className="text-indigo-400 font-medium">
                    Pool: {bet.totalPool}
                  </span>
                </div>
              </div>
            </Link>
          ))}

        </div>
      </div>
    </div>
  );
}
