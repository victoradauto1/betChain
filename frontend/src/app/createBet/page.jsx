"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBetChain } from "../../context/BetChainContext";
import { saveBetMetadata } from "../../services/metadataService";

/**
 * CreateBet
 *
 * FINAL VERSION
 *
 * Responsibilities:
 * - Collect bet metadata (title, description, image URL)
 * - Validate deadline and options
 * - Create bet on-chain (ONLY title + deadline)
 * - Register options on-chain
 * - Persist off-chain metadata indexed by betId
 */
export default function CreateBet() {
  const router = useRouter();
  const { actions, isReady } = useBetChain();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isReady || !actions) {
      alert("Wallet not connected.");
      return;
    }

    const filteredOptions = options.filter((o) => o.trim() !== "");
    if (filteredOptions.length < 2) {
      alert("You must provide at least 2 options.");
      return;
    }

    let deadlineTimestamp = 0;
    if (deadline) {
      const ts = Math.floor(new Date(deadline).getTime() / 1000);
      if (ts <= Math.floor(Date.now() / 1000)) {
        alert("Deadline must be a future date.");
        return;
      }
      deadlineTimestamp = ts;
    }

    setIsProcessing(true);

    try {
      // 1️⃣ Create bet ON-CHAIN (title + deadline only)
      const receipt = await actions.createBet(title, deadlineTimestamp);

      // 2️⃣ Extract betId from emitted event
      const event = receipt.logs?.[0];
      const betId = event?.args?.betId;

      if (betId === undefined || betId === null) {
        throw new Error("Failed to retrieve betId from transaction.");
      }

      // 3️⃣ Register options ON-CHAIN
      for (const option of filteredOptions) {
        await actions.addOption(betId, option);
      }

      // 4️⃣ Persist OFF-CHAIN metadata (mock IPFS / Fleek)
      await saveBetMetadata(betId, {
        title,
        description,
        imageUrl,
      });

      alert("Bet created successfully! 🎉");
      router.push("/allBets");
    } catch (err) {
      console.error("CreateBet error:", err);
      alert(err.message || "Transaction failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full text-white flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gray-950">
        <div className="absolute inset-0 bg-[url('/images/stadiumBet.png')] bg-cover bg-center opacity-20 mix-blend-lighten grayscale"></div>
        <div className="absolute inset-0 bg-linear-to-b from-black via-black/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl px-4 py-10">
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <h2 className="text-2xl font-semibold">Create a Bet</h2>
          <Link
            href="/"
            className="text-gray-300 hover:text-white text-sm font-medium hover:scale-110 transition-transform"
          >
            Return
          </Link>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-8 rounded-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Bet Title"
              placeholder="e.g. Champions League Winner"
              value={title}
              onChange={setTitle}
              required
            />

            <Input
              label="Image URL (optional)"
              placeholder="https://example.com/banner.jpg"
              value={imageUrl}
              onChange={setImageUrl}
            />

            <Input
              label="Description (optional)"
              placeholder="Describe the bet context..."
              value={description}
              onChange={setDescription}
            />

            <Input
              label="Deadline (optional)"
              type="datetime-local"
              value={deadline}
              onChange={setDeadline}
              helpText="Leave empty for no deadline. Must be a future date."
            />

            <div>
              <label className="block text-white font-semibold mb-2">
                Bet Options (2–10)
              </label>
              <div className="space-y-3">
                {options.map((opt, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <input
                      type="text"
                      className="flex-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder={`Option ${index + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      required
                    />
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

              {options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold border border-white text-white hover:bg-gray-600 transition"
                >
                  + Add Option
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow transition"
            >
              {isProcessing ? "Processing..." : "Create Bet"}
            </button>
          </form>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4">
          <div className="bg-linear-to-br from-gray-900 to-gray-800 border-2 border-indigo-500 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-3">
              Processing Transaction
            </h3>
            <p className="text-gray-300">
              Please confirm the transaction in MetaMask...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required = false, helpText }) {
  return (
    <div>
      <label className="block text-white font-semibold mb-1">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {helpText && <p className="text-xs text-gray-400 mt-1">{helpText}</p>}
    </div>
  );
}
