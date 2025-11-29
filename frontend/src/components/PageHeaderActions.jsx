"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import OraclePrice from "./OraclePrice";

export default function PageHeaderActions({ title, isHome = false }) {
  const router = useRouter();

  return (
    <div className="w-full max-w-6xl flex justify-between items-center mb-6">
      {/* TÍTULO DA PÁGINA */}
      <h2 className="text-2xl font-semibold">{title}</h2>

      {/* ORÁCULO */}
      <OraclePrice />

      {/* BOTÕES */}
      {isHome ? (
        <button
          onClick={() => router.push("/createBet")}
          className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-xl text-sm font-semibold"
        >
          + Create Bet
        </button>
      ) : (
        <Link
          href="/"
          className="text-gray-300 hover:text-white text-sm font-medium hover:scale-110 transition-transform"
        >
          Return
        </Link>
      )}
    </div>
  );
}
