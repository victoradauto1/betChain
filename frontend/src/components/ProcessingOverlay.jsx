"use client";

/**
 * ProcessingOverlay
 *
 * Reusable overlay component for displaying processing states.
 * Shows loading spinner and customizable message during blockchain transactions.
 */

export default function ProcessingOverlay({ 
  message = "Processing transaction...",
  subtitle = "Waiting for blockchain confirmation..."
}) {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 px-4">
      <div className="bg-linear-to-br from-gray-900 to-gray-800 border-2 border-indigo-500 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-500/30 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">
          {message}
        </h3>
        <p className="text-gray-300 mb-2">
          {subtitle}
        </p>
        <p className="text-sm text-gray-400">
          Please confirm in your wallet and do not close this window.
        </p>

        <div className="mt-6 p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
          <p className="text-xs text-gray-400">
            This usually takes 10-15 seconds
          </p>
        </div>
      </div>
    </div>
  );
}