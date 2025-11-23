"use client";

import PageTitle from "../../components/PageTitle";
import { useState } from "react";

export default function CreateBet() {
  const [title, setTitle] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [minBet, setMinBet] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      title,
      optionA,
      optionB,
      minBet,
      deadline,
      description,
    });
  };

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center relative overflow-hidden">
      {/* 🔥 BACK TO HOME BUTTON */}
      <div className="absolute top-6 left-6 z-20">
        <a
          href="/"
          className="
      flex items-center justify-center
      w-10 h-10
      rounded-lg 
      bg-white/20 
      text-white 
      backdrop-blur-sm
      hover:bg-white/30 
      transition 
      shadow-md
    "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 26"
            strokeWidth="2.6" // mais grosso
            stroke="currentColor"
            className="w-6 h-6"
          >
            <g transform="translate(0, 2)">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 5c0 6-6 6-6 6H5m0 0l4-4m-4 4l4 4"
              />
            </g>
          </svg>
        </a>
      </div>

      {/* 🔥 BACKGROUND EXACTLY LIKE HOME */}
      <div className="absolute inset-0 bg-gray-950">
        <div
          className="absolute inset-0 bg-[url('/images/stadiumBet.png')]
                     bg-cover bg-center opacity-20 mix-blend-lighten grayscale"
        ></div>

        <div
          className="absolute inset-0 bg-linear-to-b
                  from-black via-black/80 to-transparent"
        ></div>
      </div>

      {/* CONTENT ABOVE BACKGROUND */}
      <div className="relative z-10 w-full flex flex-col items-center px-4 py-10">
        <PageTitle shine>🏆 BetChain | Create a New Bet</PageTitle>
        {/* <h1 className="text-3xl font-bold mb-8">Create a New Bet</h1> */}

        <div className="bg-green-600 p-8 rounded-xl shadow-xl max-w-xl w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* TITLE */}
            <div>
              <label className="block text-white font-semibold mb-1">
                Bet Title
              </label>
              <input
                type="text"
                placeholder="e.g. Champions League Winner"
                className="w-full p-3 rounded-lg bg-[#eed9a8] text-black border border-[#d8c7a1] focus:outline-none focus:ring-2 focus:ring-yellow-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* OPTION A */}
            <div>
              <label className="block text-white font-semibold mb-1">
                Option A
              </label>
              <input
                type="text"
                placeholder="e.g. Option A"
                className="w-full p-3 rounded-lg bg-[#eed9a8] text-black border border-[#d8c7a1] focus:outline-none focus:ring-2 focus:ring-yellow-300"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
              />
            </div>

            {/* OPTION B */}
            <div>
              <label className="block text-white font-semibold mb-1">
                Option B
              </label>
              <input
                type="text"
                placeholder="e.g. Option B"
                className="w-full p-3 rounded-lg bg-[#eed9a8] text-black border border-[#d8c7a1] focus:outline-none focus:ring-2 focus:ring-yellow-300"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
              />
            </div>

            {/* MINIMUM BET */}
            <div>
              <label className="block text-white font-semibold mb-1">
                Minimum Bet (ETH)
              </label>
              <input
                type="number"
                placeholder="e.g. 0.01"
                className="w-full p-3 rounded-lg bg-[#eed9a8] text-black border border-[#d8c7a1] focus:outline-none focus:ring-2 focus:ring-yellow-300"
                value={minBet}
                onChange={(e) => setMinBet(e.target.value)}
              />
            </div>

            {/* DEADLINE */}
            <div>
              <label className="block text-white font-semibold mb-1">
                Deadline (date & time)
              </label>
              <input
                type="datetime-local"
                className="w-full p-3 rounded-lg bg-[#eed9a8] text-black border border-[#d8c7a1] focus:outline-none focus:ring-2 focus:ring-yellow-300"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-white font-semibold mb-1">
                Bet Description
              </label>
              <textarea
                rows="4"
                placeholder="Describe the context of the bet..."
                className="w-full p-3 rounded-lg bg-[#eed9a8] text-black border border-[#d8c7a1] focus:outline-none focus:ring-2 focus:ring-yellow-300"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-3 rounded-lg shadow transition"
            >
              Create Bet
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
