"use client";

import Link from "next/link";
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
    console.log({ title, optionA, optionB, minBet, deadline, description });
  };

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gray-950">
        <div className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-transparent"></div>
      </div>

      {/* FORM WRAPPER */}
      <div className="relative z-10 w-full max-w-2xl px-4 py-10">

        {/* HEADER ALINHADO AOS CANTOS DO CARD */}
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <h2 className="text-2xl font-semibold">Create a Bet</h2>

          <Link
            href="/"
            className="text-gray-300 hover:text-white text-sm font-medium hover:scale-110 transition-transform"
          >
            Return
          </Link>
        </div>

        {/* CARD */}
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-8 rounded-2xl shadow-xl">

          <form onSubmit={handleSubmit} className="space-y-6">

            <Input
              label="Bet Title"
              placeholder="e.g. Champions League Winner"
              value={title}
              onChange={setTitle}
            />

            <Input
              label="Option A"
              placeholder="e.g. Team A"
              value={optionA}
              onChange={setOptionA}
            />

            <Input
              label="Option B"
              placeholder="e.g. Team B"
              value={optionB}
              onChange={setOptionB}
            />

            <Input
              label="Minimum Bet (ETH)"
              type="number"
              placeholder="0.01"
              value={minBet}
              onChange={setMinBet}
            />

            <Input
              label="Deadline"
              type="datetime-local"
              value={deadline}
              onChange={setDeadline}
            />

            <div>
              <label className="block text-white font-semibold mb-1">
                Bet Description
              </label>
              <textarea
                rows="4"
                className="
                  w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700
                  text-white placeholder-zinc-400
                  focus:outline-none focus:ring-2 focus:ring-indigo-400
                "
                placeholder="Describe the context of this bet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="
                w-full bg-indigo-600 hover:bg-indigo-700
                text-white font-bold py-3 rounded-lg
                shadow transition
              "
            >
              Create Bet
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

/* Input component (UNCHANGED) */
function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-white font-semibold mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="
          w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700
          text-white placeholder-zinc-400
          focus:outline-none focus:ring-2 focus:ring-indigo-400
        "
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
