"use client";

/**
 * CreateBet
 *
 * Responsibilities:
 * - Collect bet metadata (title, description, image URL)
 * - Enforce a mandatory deadline (core business rule)
 * - Create a bet on-chain with all options in a single transaction
 * - Persist off-chain metadata indexed by betId
 *
 * Performance:
 * - Uses createBetWithOptions() to create the bet and register all options atomically
 * - Reduces gas usage and wallet confirmations to a single transaction
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useBetChain } from "../../context/BetChainContext";
import { saveBetMetadata } from "../../services/metadataService";

import ConfirmModal from "../../components/ConfirmModal";
import ProcessingOverlay from "../../components/ProcessingOverlay";

export default function CreateBet() {
  const router = useRouter();
  const { actions, isReady, connectWallet } = useBetChain();
  const isExecutingRef = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deadline, setDeadline] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletMissing, setWalletMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const validateDeadline = () => {
    if (!deadline) {
      throw new Error("Deadline is mandatory.");
    }

    const timestamp = Math.floor(new Date(deadline).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);

    if (isNaN(timestamp) || timestamp <= now) {
      throw new Error("Deadline must be a valid future date.");
    }

    return timestamp;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageUrl("");
    setDeadline("");
    setOptions(["", ""]);
    setErrorMessage("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    const filteredOptions = options.map(o => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      setErrorMessage("At least two options are required.");
      return;
    }

    try {
      validateDeadline();
    } catch (err) {
      setErrorMessage(err.message);
      return;
    }

    if (!isReady || !actions) {
      setWalletMissing(true);
      setShowConfirmModal(true);
      return;
    }

    setWalletMissing(false);
    setShowConfirmModal(true);
  };

  const executeCreateBet = async () => {
    if (isExecutingRef.current) return;

    if (walletMissing) {
      setShowConfirmModal(false);
      setIsProcessing(true);

      try {
        await connectWallet();
        setWalletMissing(false);
        setShowConfirmModal(true);
      } catch {
        setErrorMessage("Failed to connect wallet. Please try again.");
      } finally {
        setIsProcessing(false);
      }

      return;
    }

    let deadlineTimestamp;
    try {
      deadlineTimestamp = validateDeadline();
    } catch (err) {
      setErrorMessage(err.message);
      setShowConfirmModal(false);
      return;
    }

    const filteredOptions = options.map(o => o.trim()).filter(Boolean);

    isExecutingRef.current = true;
    setIsProcessing(true);
    setShowConfirmModal(false);

    try {
      const receipt = await actions.createBetWithOptions(
        title,
        deadlineTimestamp,
        filteredOptions
      );

      const event = receipt.logs?.find(
        log => log.fragment?.name === "BetCreated"
      );

      const betId = event?.args?.betId;

      if (betId === undefined || betId === null) {
        throw new Error("Failed to retrieve betId from transaction.");
      }

      await saveBetMetadata({
        betId: betId.toString(),
        title,
        description,
        imageUrl,
      });

      resetForm();
      router.push("/allBets");
    } catch (err) {
      setErrorMessage(err.message || "Failed to create bet.");
      setShowConfirmModal(false);
    } finally {
      setIsProcessing(false);
      isExecutingRef.current = false;
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
          <h2 className="text-2xl font-semibold">Create Bet</h2>
          <Link href="/" className="text-gray-300 hover:text-white text-sm font-medium">
            Return
          </Link>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-8 rounded-2xl shadow-xl">
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-200">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label="Bet Title" value={title} onChange={setTitle} required />

            <Input
              label="Image URL"
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="https://example.com/banner.jpg"
            />

            <Input
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Describe the bet context"
            />

            <Input
              label="Deadline"
              type="datetime-local"
              value={deadline}
              onChange={setDeadline}
              required
              helpText="Defines when the bet is closed."
            />

            <div>
              <label className="block font-semibold mb-2">
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
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      required
                    />

                    {options.length > 2 && index > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 rounded-lg hover:bg-white/10"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold border border-white hover:bg-gray-600"
                >
                  Add option
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 font-bold py-3 rounded-lg transition-colors"
            >
              {isProcessing ? "Processing..." : "Create Bet"}
            </button>
          </form>
        </div>
      </div>

      {showConfirmModal && (
        <ConfirmModal
          title={walletMissing ? "Wallet not connected" : "Confirm Bet Creation"}
          onCancel={() => {
            setShowConfirmModal(false);
            setWalletMissing(false);
          }}
          onConfirm={executeCreateBet}
          confirmText={walletMissing ? "Connect Wallet" : "Confirm & Create"}
          disabled={isProcessing}
        >
          {walletMissing ? (
            <p className="text-sm text-gray-300">
              You must connect your wallet before creating a bet.
            </p>
          ) : (
            <div className="text-sm text-gray-300 space-y-2">
              <p><strong>Title:</strong> {title}</p>
              <p><strong>Options:</strong> {options.filter(o => o.trim()).length}</p>
              <p><strong>Deadline:</strong> {deadline}</p>
            </div>
          )}
        </ConfirmModal>
      )}

      {isProcessing && <ProcessingOverlay />}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  helpText,
}) {
  return (
    <div>
      <label className="block font-semibold mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />

      {helpText && (
        <p className="text-xs text-gray-400 mt-1">{helpText}</p>
      )}
    </div>
  );
}