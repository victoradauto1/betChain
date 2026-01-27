"use client";

/**
 * BetModal
 *
 * Reusable modal component for placing bets.
 * Handles wallet connection, amount input, and bet confirmation.
 */

export default function BetModal({
  isOpen,
  onClose,
  onConfirm,
  selectedOption,
  betAmount,
  setBetAmount,
  isConnected,
  isProcessing,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-white">Place Your Bet</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-white">
              Selected Option:
            </label>
            <div className="px-4 py-2 bg-gray-800 rounded-lg text-white">
              {selectedOption}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-white">
              Bet Amount (ETH):
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="0.01"
              className="w-full px-4 py-2 bg-gray-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              disabled={isProcessing}
            />
          </div>

          {!isConnected && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
              <p className="text-yellow-400 text-sm font-semibold mb-2">
                Wallet not connected
              </p>
              <p className="text-gray-300 text-xs">
                Click "Confirm Bet" to connect your wallet first
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors cursor-pointer"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors cursor-pointer"
            >
              {isProcessing
                ? "Placing..."
                : isConnected
                ? "Confirm Bet"
                : "Connect & Bet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}