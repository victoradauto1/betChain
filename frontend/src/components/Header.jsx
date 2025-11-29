"use client";

import { useBetChain } from "../context/betChainContext";
import PageTitle from "./PageTitle";

export default function Header() {
  const { account, connectWallet } = useBetChain();

  return (
    <div className="w-full flex justify-center pt-10"> {/* ⬅️ Mantém distância do topo */}
      <header className="w-full flex justify-between items-center max-w-6xl mb-10 px-6">
        {/* Same structure as Home */}
        <PageTitle shine>🏆 BetChain</PageTitle>

        {account ? (
          <div className="flex flex-col text-right bg-gray-800/70 px-4 py-2 rounded-xl backdrop-blur-sm">
            <span className="text-xs text-gray-300">Welcome</span>
            <span className="text-sm font-semibold">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Connect Wallet
          </button>
        )}
      </header>
    </div>
  );
}
