"use client";
import { useEffect, useState } from "react";
import { getTokenPrice } from "../services/priceService";

export default function OraclePrice() {
  const [price, setPrice] = useState(null);
  const [change, setChange] = useState(null);

  useEffect(() => {
    async function loadPrice() {
      const data = await getTokenPrice("ethereum");

      // Se a função não retornar variacao, protege:
      setPrice(data.price ?? null);
      setChange(data.priceChange24h ?? null);
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
    <div className="w-fit text-sm font-semibold select-none bg-transparent flex items-center gap-2">
      <span className="text-gray-400">ETH/USD:</span>

      {/* Preço */}
      <span className="text-gray-200">
        {price ? `$${price.toLocaleString()}` : "Loading..."}
      </span>

      {/* Percentual */}
      {typeof change === "number" && (
        <span className={changeColor}>
          {change > 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      )}
    </div>
  );
}
