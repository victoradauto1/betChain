"use client";

import Link from "next/link";
import PageTitle from "../../components/PageTitle"
import { useEffect, useState } from "react";

export default function AllBets() {
  const [bets, setBets] = useState([]);

  // temporaty Mock
  useEffect(() => {
    setBets([
      {
        id: 1,
        title: "Champions League Winner",
        description: "Who wins the tournament?",
        optionsCount: 3,
        totalPool: "1.24 ETH",
        active: true,
      },
      {
        id: 2,
        title: "UFC Main Event",
        description: "Winner by KO/Sub/Decision",
        optionsCount: 4,
        totalPool: "0.82 ETH",
        active: false,
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center relative overflow-hidden">

      {/* 🔥 BACKGROUND // mesmo da home e do createBet */}
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
      <div className="relative z-10 w-full max-w-5xl px-4 py-10">

        {/* PAGE TITLE */}
        <PageTitle text="All Bets" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">

          {bets.map((bet) => (
            <Link key={bet.id} href={`/betDetails/${bet.id}`}>
              <div className="bg-green-600 bg-opacity-20 p-6 rounded-xl border border-green-700 hover:bg-opacity-30 transition cursor-pointer shadow-lg backdrop-blur-sm">

                <h2 className="text-2xl font-bold mb-2">{bet.title}</h2>

                <p className="text-white/70 text-sm mb-3">
                  {bet.description}
                </p>

                <div className="flex justify-between text-sm text-white/80 mt-4">

                  <span>
                    Options: <strong>{bet.optionsCount}</strong>
                  </span>

                  <span>
                    Pool: <strong>{bet.totalPool}</strong>
                  </span>
                </div>

                <div className="mt-4">
                  {bet.active ? (
                    <span className="text-green-300 font-semibold">Active</span>
                  ) : (
                    <span className="text-red-400 font-semibold">Closed</span>
                  )}
                </div>

              </div>
            </Link>
          ))}

        </div>
      </div>
    </div>
  );
}
