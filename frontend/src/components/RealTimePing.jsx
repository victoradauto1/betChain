// Small live-status indicator used in the price oracle.
// Shows a ping animation similar to financial websites like InfoMoney.

"use client";
import { useState, useEffect } from "react";

export default function RealTimePing({ lastUpdate }) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Update the "time since last update" counter every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdate) {
        const diff = Math.floor((Date.now() - lastUpdate) / 1000);
        setSecondsAgo(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div
      className="flex items-center gap-1 text-xs text-gray-400 select-none"
      title={`Last update: ${secondsAgo}s ago`}
    >
      <div className="relative flex items-center justify-center">
        {/* Expanding ping effect */}
        <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-500 opacity-75 animate-ping"></span>

        {/* Solid center dot */}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
      </div>

      <span> Live </span>
    </div>
  );
}
