"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useBetChain } from "../context/betChainContext";
import PageTitle from "./PageTitle";

export default function Header() {
  const { account, connectWallet, disconnectWallet } = useBetChain();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full flex justify-center pt-10"> {/* keeps top spacing identical */}
      <header className="w-full flex justify-between items-center max-w-6xl mb-10 px-6">
        {/* Title: clickable, links to home */}
        <Link href="/" className="hover:opacity-90 transition">
          <PageTitle shine>🏆 BetChain</PageTitle>
        </Link>

        {/* Wallet / Welcome block (interactive) */}
        {account ? (
          <div className="relative" ref={menuRef}>
            {/* Visible block (keeps the exact classes you had) */}
            <div
              onClick={() => setMenuOpen((s) => !s)}
              className="flex flex-col text-right bg-gray-800/70 px-4 py-2 rounded-xl backdrop-blur-sm cursor-pointer"
            >
              <span className="text-xs text-gray-300">Welcome</span>
              <span className="text-sm font-semibold">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-gray-700 rounded-xl p-2 shadow-lg z-50">
                <button
                  onClick={() => {
                    // call disconnect if provided by context
                    if (typeof disconnectWallet === "function") {
                      disconnectWallet();
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                >
                  Disconnect Wallet
                </button>

                <button
                  onClick={() => {
                    // copy address quick action (nice to have)
                    try {
                      navigator.clipboard.writeText(account);
                    } catch (e) {
                      /* ignore */ 
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition text-sm mt-1"
                >
                  Copy Address
                </button>
              </div>
            )}
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
