"use client";
import { useEffect, useState } from "react";
import { getTokenPrice } from "../services/priceService";
import RealTimePing from "./RealTimePing";

export default function OraclePrice() {
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null); // timestamp of last successful fetch

  useEffect(() => {
    async function loadPrice() {
      const data = await getTokenPrice("ethereum");

      setPrice(data.price ?? null);
      setChange(data.priceChange24h ?? null);
      setLastUpdate(Date.now()); // record update timestamp
    }

    loadPrice();
    const interval = setInterval(loadPrice, 25000);

    return () => clearInterval(interval);
  }, []);

  const changeColor =
    typeof change === "number"
      ? change > 0
        ? "text-green-400"
        : change < 0
        ? "text-red-400"
        : "text-gray-300"
      : "text-gray-300";

  return (
    <div className="w-fit text-sm font-semibold select-none bg-transparent flex items-center gap-3">
      
      {/* Live status indicator */}
      <RealTimePing lastUpdate={lastUpdate} />

      <span className="text-gray-400">ETH/USD:</span>

      {/* Price */}
      <span className="text-gray-200">
        {price ? `$${price.toLocaleString()}` : "Loading..."}
      </span>

      {/* Daily percentage change */}
      {typeof change === "number" && (
        <span className={changeColor}>
          {change > 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      )}
    </div>
  );
}
