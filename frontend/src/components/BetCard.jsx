"use client";

import Link from "next/link";
import resolveImageUrl from "../utils/resolveImageUrl";

export default function BetCard({ bet, showDeadline = true, compact = false }) {
  const getDeadlineInfo = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) {
      return { text: "Expired", color: "text-gray-500", pulse: false };
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
  const isOpen = bet.isOpen || bet.status === "OPEN";
  const imageSrc = resolveImageUrl(bet.image);

  return (
    <Link href={`/betDetails/${bet.id}`}>
      <div
        className={`
          bg-gray-800 border border-gray-700 rounded-xl
          hover:scale-[1.02] hover:border-indigo-400
          transition-all cursor-pointer flex flex-col
          ${compact ? "p-2.5 h-[280px]" : "p-4 h-[420px]"}
        `}
      >
        {/* IMAGE */}
        <div className={`${compact ? "h-[115px] mb-2" : "h-48 mb-3"} shrink-0`}>
          <img
            src={imageSrc}
            alt={bet.title}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              if (e.currentTarget.src.endsWith("/icon.png")) return;
              e.currentTarget.src = "/icon.png";
            }}
          />
        </div>

        {/* TITLE */}
        <h2
          className={`
            font-semibold text-white overflow-hidden shrink-0
            ${compact ? "text-base mb-1.5 leading-5 h-10" : "text-xl mb-2 leading-7 h-14"}
          `}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
          title={bet.title}
        >
          {bet.title}
        </h2>

        {/* CONTENT */}
        <div
          className={`${
            compact ? "space-y-0.5 text-xs" : "space-y-1 text-sm"
          } text-gray-400`}
        >
          <p>
            <span className="font-medium">Pool:</span> {bet.totalPool} ETH
          </p>

          {bet.optionsCount && (
            <p>
              <span className="font-medium">Options:</span> {bet.optionsCount}
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

        {/* STATUS */}
        <p
          className={`shrink-0 ${
            compact ? "mt-2 text-xs" : "mt-3 text-sm"
          } font-semibold ${statusInfo.color}`}
        >
          {statusInfo.text}
        </p>

        {/* MICRO CTA */}
<p
  className={`mt-auto pt-2 text-center ${
    compact ? "text-xs" : "text-sm"
  } text-white opacity-80`}
>
  {isOpen ? "(Click to BET!)" : "(Click to details)"}
</p>
      </div>
    </Link>
  );
}