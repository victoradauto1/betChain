"use client";

import { ethers } from "ethers";
import Link from "next/link";
import { useEffect, useState } from "react";

import PageHeaderActions from "../components/PageHeaderActions";
import BetCard from "../components/BetCard";
import { getReadOnlyProvider } from "../utils/web3Provider";
import { getBetMetadata } from "../services/metadataService";
import BetChainABI from "../abi/BetChain.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS");
}

export default function Home() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLastBets() {
      try {
        const provider = await getReadOnlyProvider();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          BetChainABI,
          provider
        );

        const total = Number(await contract.betCount());
        if (total === 0) return;

        const fromId = Math.max(0, total - 3);
        const ids = [];

        for (let i = total - 1; i >= fromId; i--) {
          ids.push(i);
        }

        const results = await Promise.all(
          ids.map(async (id) => {
            const betInfo = await contract.getBetInfo(id);
            const options = await contract.getOptions(id);
            const metadata = await getBetMetadata(id.toString());

            const [, , logicalStatus, deadline] = betInfo;
            const deadlineNum = Number(deadline);
            const now = Math.floor(Date.now() / 1000);
            const isExpired = now >= deadlineNum;
            const status = Number(logicalStatus);

            return {
              id,
              title: metadata?.title || betInfo[0],
              image: metadata?.image || null,
              totalPool: betInfo[5],
              deadline: deadlineNum,
              optionsCount: options.length,
              isOpen: status === 0 && !isExpired,
              isClosed: status === 1 || (status === 0 && isExpired),
              isSettled: status === 2,
            };
          })
        );

        if (isMounted) setBets(results);
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLastBets();
    return () => (isMounted = false);
  }, []);

  return (
    <div className="min-h-screen text-white flex flex-col items-center px-4 md:px-6 py-6 md:py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-950">
        <div className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale" />
        <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <PageHeaderActions title="Last Bets" isHome />

        {loading ? (
          <div className="mt-10">Loading bets...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
              {bets.map((bet) => (
                <BetCard key={bet.id} bet={bet} />
              ))}
            </div>

            <div className="mt-8">
              <Link
                href="/allBets"
                className="px-6 py-2 rounded-xl text-sm font-semibold border border-indigo-400 text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
              >
                View All
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
