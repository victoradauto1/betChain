"use client";

import Link from "next/link";

/**
 * BetCard
 *
 * Reusable card component for displaying bet information.
 * Used in both Home and AllBets pages for consistent styling.
 *
 * Props:
 * - bet: Bet object with id, title, imageUrl, totalPool, status, etc.
 * - showDeadline: Boolean to show/hide deadline countdown (default: true)
 * - compact: Boolean for compact mode (default: false)
 */
export default function BetCard({ bet, showDeadline = true, compact = false }) {
  const formatDeadline = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return "Expired";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "< 1h";
  };

  const getStatusInfo = () => {
    if (bet.isOpen || bet.status === "OPEN") {
      return { text: "OPEN", color: "text-green-400" };
    }
    if (bet.isSettled || bet.status === "SETTLED") {
      return { text: "SETTLED", color: "text-blue-400" };
    }
    if (bet.isClosed || bet.status === "CLOSED") {
      return { text: "CLOSED", color: "text-orange-400" };
    }
    return { text: "UNKNOWN", color: "text-gray-400" };
  };

  const statusInfo = getStatusInfo();

  return (
    <Link href={`/betDetails/${bet.id}`}>
      <div 
        className={`
          bg-gray-800 border border-gray-700 rounded-xl 
          hover:scale-[1.02] hover:border-indigo-400 
          transition-all cursor-pointer
          ${compact ? 'p-3' : 'p-4'}
        `}
      >
        {/* Image */}
        <img
          src={bet.imageUrl || "/images/default-bet.png"}
          alt={bet.title}
          className={`
            w-full object-cover rounded-lg mb-3
            ${compact ? 'h-32' : 'h-48'}
          `}
          onError={(e) => {
            e.target.src = "/images/default-bet.png";
          }}
        />

        {/* Title */}
        <h2 
          className={`
            font-semibold mb-2 text-white line-clamp-2
            ${compact ? 'text-lg' : 'text-xl'}
          `}
        >
          {bet.title}
        </h2>

        {/* Info */}
        <div className={`space-y-1 ${compact ? 'text-xs' : 'text-sm'} text-gray-400`}>
          <p>
            <span className="font-medium">Pool:</span> {bet.totalPool} ETH
          </p>
          
          {bet.optionsCount && (
            <p>
              <span className="font-medium">Options:</span> {bet.optionsCount}
            </p>
          )}
          
          {showDeadline && bet.deadline && (
            <p>
              <span className="font-medium">Ends:</span> {formatDeadline(bet.deadline)}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <p className={`mt-3 text-sm font-semibold ${statusInfo.color}`}>
          {statusInfo.text}
        </p>
      </div>
    </Link>
  );
}