"use client";

import { useEffect } from "react";

export type ToastData = {
  message: string;
  type: "success" | "error";
};

interface ToastProps extends ToastData {
  onDismiss: () => void;
}

export default function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isSuccess = type === "success";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3 shadow-xl text-sm font-semibold ${
        isSuccess
          ? "bg-white border border-green-200 text-green-700"
          : "bg-white border border-red-200 text-red-700"
      }`}
      style={{
        animation: "slideUp 0.2s ease-out",
        maxWidth: "360px",
      }}
      role="status"
    >
      <span style={{ fontSize: "1.1rem" }}>{isSuccess ? "✓" : "✕"}</span>
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 opacity-50 hover:opacity-100 text-lg leading-none text-slate-400"
        aria-label="Dismiss"
      >
        ×
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
