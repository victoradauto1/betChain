"use client";

import Link from "next/link";

const FALLBACK_IMAGE = "/icon.png";

/**
 * BetCard
 *
 * Reusable card component for displaying bet information.
 * Used in both Home and AllBets pages for consistent styling.
 *
 * Deadline UX:
 * - When less than 24h remaining, the DEADLINE NUMBER pulses
 *   using a ping animation behind the text (no dot).
 */
export default function BetCard({ bet, showDeadline = true, compact = false }) {
  const getDeadlineInfo = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) {
      return {
        text: "Expired",
        color: "text-gray-500",
        pulse: false,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    let text;
    if (days > 0) text = `${days}d ${hours}h`;
    else if (hours > 0) text = `${hours}h`;
    else text = "< 1h";

    const totalHours = days * 24 + hours;

    if (totalHours < 24) {
      return { text, color: "text-red-400", pulse: true };
    }

    if (days < 7) {
      return { text, color: "text-yellow-400", pulse: false };
    }

    return { text, color: "text-green-400", pulse: false };
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

  const imageSrc =
    typeof bet.imageUrl === "string" && bet.imageUrl.trim() !== ""
      ? bet.imageUrl
      : FALLBACK_IMAGE;

  return (
    <Link href={`/betDetails/${bet.id}`}>
      <div
        className={`
          bg-gray-800 border border-gray-700 rounded-xl
          hover:scale-[1.02] hover:border-indigo-400
          transition-all cursor-pointer
          ${compact ? "p-3" : "p-4"}
        `}
      >
        <img
          src={imageSrc}
          alt={bet.title}
          className={`
            w-full object-cover rounded-lg mb-3
            ${compact ? "h-32" : "h-48"}
          `}
          onError={(e) => {
            if (e.currentTarget.src.endsWith(FALLBACK_IMAGE)) return;
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />

        <h2
          className={`
            font-semibold mb-2 text-white line-clamp-2
            ${compact ? "text-lg" : "text-xl"}
          `}
        >
          {bet.title}
        </h2>

        <div
          className={`space-y-1 ${
            compact ? "text-xs" : "text-sm"
          } text-gray-400`}
        >
          <p>
            <span className="font-medium">Pool:</span> {bet.totalPool} ETH
          </p>

          {bet.optionsCount && (
            <p>
              <span className="font-medium">Options:</span>{" "}
              {bet.optionsCount}
            </p>
          )}

          {showDeadline && bet.deadline && (() => {
            const deadlineInfo = getDeadlineInfo(bet.deadline);

            return (
              <p className="flex items-center gap-2">
                <span className="font-medium">Ends:</span>

                <span className="relative inline-flex items-center">
                  {deadlineInfo.pulse && (
                    <span
                      className="
                        absolute inset-0
                        rounded-md
                        bg-red-500
                        opacity-30
                        animate-ping
                      "
                    />
                  )}

                  <span
                    className={`${deadlineInfo.color} font-semibold relative z-10 px-1`}
                  >
                    {deadlineInfo.text}
                  </span>
                </span>
              </p>
            );
          })()}
        </div>

        <p className={`mt-3 text-sm font-semibold ${statusInfo.color}`}>
          {statusInfo.text}
        </p>
      </div>
    </Link>
  );
}