"use client";

import Link from "next/link";
import { useRouter } from "next/navigation"; // Router for redirecting the user after success
import { useState } from "react";
import { useBetChain } from "../../context/BetChainContext";

export default function CreateBet() {
  // Next.js router for navigation
  const router = useRouter();

  // Accessing Web3, wallet and contract from global context
  const { contract, account } = useBetChain();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Bet options — minimum 2
  const [options, setOptions] = useState(["", ""]);

  // Update a single option field
  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  // Add new betting option (max 10)
  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, ""]);
  };

  // Remove option (only allowed for options beyond the first two)
  const removeOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  // Submit bet creation form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Wallet not connected
    if (!contract || !account) {
      alert("Wallet not connected.");
      return;
    }

    // Filter empty options
    const filteredOptions = options.filter((o) => o.trim() !== "");
    if (filteredOptions.length < 2) {
      alert("You must provide at least 2 options.");
      return;
    }

    try {
      // Sending transaction to blockchain
      await contract.methods
        .createBet(title, description, imageUrl, filteredOptions)
        .send({ from: account });

      alert("Bet created successfully!");

      // Redirect user after success
      router.push("/allBets");
    } catch (err) {
      console.error(err);
      alert("Error creating bet");
    }
  };

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center relative overflow-hidden">
      {/* Background Image + Overlay */}
      <div className="absolute inset-0 bg-gray-950">
        <div className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale"></div>
        <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-transparent"></div>
      </div>

      {/* Form Container */}
      <div className="relative z-10 w-full max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <h2 className="text-2xl font-semibold">Create a Bet</h2>

          <Link
            href="/"
            className="text-gray-300 hover:text-white text-sm font-medium hover:scale-110 transition-transform"
          >
            Return
          </Link>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-8 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
            <Input
              label="Bet Title"
              placeholder="e.g. Champions League Winner"
              value={title}
              onChange={setTitle}
            />

            {/* Image URL Input */}
            <Input
              label="Image URL"
              placeholder="https://example.com/banner.jpg"
              value={imageUrl}
              onChange={setImageUrl}
            />

            {/* Description Input */}
            <Input
              label="Description"
              placeholder="Describe the bet context..."
              value={description}
              onChange={setDescription}
            />

            {/* Dynamic Options */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Bet Options (2–10)
              </label>

              <div className="space-y-3">
                {options.map((opt, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <input
                      type="text"
                      className="flex-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
                      placeholder={`Option ${index + 1}`}
                      value={opt}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                    />

                    {/* Delete button for extra options */}
                    {options.length > 2 && index > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 rounded-lg hover:bg-white/10 transition"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Option Button */}
              {options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="
                    mt-3 px-4 py-2 rounded-xl text-sm font-semibold
                    border border-white text-white
                    hover:bg-gray-600 hover:text-white
                    transition
                  "
                >
                  + Add Option
                </button>
              )}
            </div>

            {/* Submit Button */}
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

/* Reusable Input Component */
function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      {/* Input Label */}
      <label className="block text-white font-semibold mb-1">{label}</label>

      {/* Input Field */}
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
