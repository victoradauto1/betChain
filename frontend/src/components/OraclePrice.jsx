// src/components/OraclePrice.jsx
"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";

/**
 * Minimal AggregatorV3Interface ABI for latestRoundData and decimals
 */
const aggregatorV3InterfaceABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export default function OraclePrice({
  rpcUrl,               // optional: custom rpc url (fallback)
  feedAddress,          // required: address of Chainlink price feed (check docs!)
  refreshInterval = 30, // seconds
  render,               // optional render prop: ({price, decimals, updatedAt}) => JSX
}) {
  const [priceData, setPriceData] = useState({
    price: null,
    decimals: 18,
    updatedAt: null,
    error: null,
  });

  useEffect(() => {
    if (!feedAddress) {
      setPriceData((s) => ({ ...s, error: "feedAddress not provided" }));
      return;
    }

    let cancelled = false;
    let timer = null;

    async function fetchPrice() {
      try {
        // If user is connected with MetaMask, use window.ethereum; otherwise fallback to rpcUrl
        const provider = (typeof window !== "undefined" && window.ethereum)
          ? new ethers.BrowserProvider(window.ethereum)
          : rpcUrl
          ? new ethers.JsonRpcProvider(rpcUrl)
          : null;

        if (!provider) {
          setPriceData({ price: null, decimals: 18, updatedAt: null, error: "No provider available" });
          return;
        }

        const contract = new ethers.Contract(feedAddress, aggregatorV3InterfaceABI, provider);
        const [decimals, roundData] = await Promise.all([
          contract.decimals(),
          contract.latestRoundData(),
        ]);

        // roundData.answer is an int256; convert to BigInt/Number safely
        const raw = roundData.answer;
        const updatedAt = roundData.updatedAt ? Number(roundData.updatedAt) : null;

        // price as a JS number (could be large) — keep as BigInt/string if needed
        // Adjust for decimals: priceNormalized = raw / (10 ** decimals)
        const price = Number(raw) / Math.pow(10, Number(decimals));

        if (!cancelled) {
          setPriceData({ price, decimals: Number(decimals), updatedAt, error: null });
        }
      } catch (err) {
        if (!cancelled) setPriceData({ price: null, decimals: 18, updatedAt: null, error: err.message || String(err) });
      }
    }

    fetchPrice();
    timer = setInterval(fetchPrice, refreshInterval * 1000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [feedAddress, rpcUrl, refreshInterval]);

  // If render prop provided, call it
  if (render && typeof render === "function") {
    return render(priceData);
  }

  // Default UI
  return (
    <div>
      {priceData.error ? (
        <span className="text-red-400 text-sm">Oracle error: {priceData.error}</span>
      ) : priceData.price == null ? (
        <span className="text-gray-400 text-sm">Loading price…</span>
      ) : (
        <span className="text-sm">1 ETH ≈ ${priceData.price.toFixed(2)} (USD)</span>
      )}
    </div>
  );
}
