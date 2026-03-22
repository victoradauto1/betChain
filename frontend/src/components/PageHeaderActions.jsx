"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import OraclePrice from "./OraclePrice";

export default function PageHeaderActions({
  title,
  action = "home", 
  hideOracle = false, 
}) {
  const router = useRouter();

  return (
    <div className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 px-4 gap-4 sm:gap-0">
      {/* PAGE TITLE */}
      <h2 className="text-xl sm:text-2xl font-semibold">{title}</h2>

      {/* ORACLE (only if allowed) */}
      {!hideOracle && <OraclePrice />}

      {/* ACTION BUTTONS */}
      {action === "home" && (
        <button
          onClick={() => router.push("/createBet")}
          className="bg-green-600 hover:bg-green-500 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold w-full sm:w-auto"
        >
          + Create Bet
        </button>
      )}

      {action === "return" && (
        <Link
          href="/"
          className="text-gray-300 hover:text-white text-sm font-medium hover:scale-110 transition-transform"
        >
          Return
        </Link>
      )}

      {/* ALIGNMENT FILLER (when no button is rendered) */}
      {action === "none" && <div className="w-[90px]" />}
    </div>
  );
}
