"use client";

import React from "react";

export default function ConfirmModal({
  title,
  onCancel,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  disabled = false,
  children,
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>

        <div className="space-y-4">{children}</div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={disabled}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={disabled}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
