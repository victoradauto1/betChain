"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBetChain } from "../../context/BetChainContext";

export default function CreateBet() {
  const router = useRouter();
  const { contract, account } = useBetChain();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deadline, setDeadline] = useState(""); // ✅ NOVO: campo de deadline
  const [isProcessing, setIsProcessing] = useState(false); // ✅ Loading state

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

    setIsProcessing(true); // ✅ Ativa loading

    try {
      // ✅ Converter deadline para timestamp Unix (ou 0 se não houver)
      let deadlineTimestamp = 0;
      
      if (deadline) {
        const deadlineDate = new Date(deadline);
        deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
        
        // Validar se a deadline é futura
        if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
          alert("Deadline must be in the future!");
          setIsProcessing(false);
          return;
        }
      }

      console.log("📤 Sending transaction with params:", {
        title,
        description,
        imageUrl,
        options: filteredOptions,
        deadline: deadlineTimestamp,
      });

      // ✅ Sending transaction to blockchain com todos os 5 parâmetros
      await contract.methods
        .createBet(
          title,
          description,
          imageUrl,
          filteredOptions,
          deadlineTimestamp // ✅ 5º parâmetro obrigatório
        )
        .send({ from: account });

      // ✅ Pequeno delay para garantir que a transação foi minerada
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert("Bet created successfully! 🎉");
      router.push("/allBets");
    } catch (err) {
      console.error("Error creating bet:", err);
      alert(`Error creating bet: ${err.message}`);
      setIsProcessing(false); // ✅ Desativa loading em caso de erro
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
              required
            />

            {/* Image URL Input */}
            <Input
              label="Image URL (optional)"
              placeholder="https://example.com/banner.jpg"
              value={imageUrl}
              onChange={setImageUrl}
            />

            {/* Description Input */}
            <Input
              label="Description (optional)"
              placeholder="Describe the bet context..."
              value={description}
              onChange={setDescription}
            />

            {/* ✅ NOVO: Deadline Input */}
            <Input
              label="Deadline (optional)"
              type="datetime-local"
              value={deadline}
              onChange={setDeadline}
              placeholder=""
              helpText="Leave empty for no deadline. Must be a future date."
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
                      className="flex-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      placeholder={`Option ${index + 1}`}
                      value={opt}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      required
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
              disabled={isProcessing}
              className="
                w-full bg-indigo-600 hover:bg-indigo-700
                disabled:bg-gray-600 disabled:cursor-not-allowed
                text-white font-bold py-3 rounded-lg
                shadow transition
              "
            >
              {isProcessing ? "Processing..." : "Create Bet"}
            </button>
          </form>
        </div>
      </div>

      {/* ✅ MODAL DE LOADING BLOCKCHAIN */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4">
          <div className="bg-linear-to-br from-gray-900 to-gray-800 border-2 border-indigo-500 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            {/* Spinner animado */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-indigo-500/30 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
              </div>
            </div>

            {/* Texto */}
            <h3 className="text-2xl font-bold text-white mb-3">
              Processing Transaction
            </h3>
            <p className="text-gray-300 mb-2">
              Your bet is being recorded on the blockchain.
            </p>
            <p className="text-sm text-gray-400">
              Please confirm the transaction in MetaMask and wait for confirmation...
            </p>

            {/* Indicador de etapas */}
            <div className="mt-6 space-y-2 text-left">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-300">Awaiting wallet confirmation</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-gray-300">Broadcasting to network</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-400">Mining transaction...</span>
              </div>
            </div>

            {/* Info adicional */}
            <div className="mt-6 p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
              <p className="text-xs text-gray-400">
                ⏱️ This process usually takes 10-15 seconds on Sepolia testnet
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Reusable Input Component */
function Input({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = "text", 
  required = false,
  helpText 
}) {
  return (
    <div>
      {/* Input Label */}
      <label className="block text-white font-semibold mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

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
        required={required}
      />

      {/* Help Text */}
      {helpText && (
        <p className="text-xs text-gray-400 mt-1">{helpText}</p>
      )}
    </div>
  );
}