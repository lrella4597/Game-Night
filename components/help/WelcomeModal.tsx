"use client";

import { useState, useEffect } from "react";
import HelpContent from "./HelpContent";

const WELCOME_SEEN_KEY = "trivia_masters_welcome_seen";

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome modal before
    const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY);

    if (!hasSeenWelcome) {
      // Small delay so it doesn't appear instantly
      setTimeout(() => {
        setIsOpen(true);
      }, 500);
    }
  }, []);

  const handleClose = () => {
    // Mark welcome as seen
    localStorage.setItem(WELCOME_SEEN_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn"
        style={{
          backgroundColor: "rgba(0,0,0,0.7)",
          animation: "fadeIn 0.3s ease-out",
        }}
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col animate-slideUp"
          style={{
            padding: "2rem",
            maxHeight: "90vh",
            animation: "slideUp 0.4s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                👋 Welcome to Jeopardy Game Night!
              </h2>
              <p className="text-slate-600 mt-2">
                Let's get you started with your first game!
              </p>
            </div>

            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-900 text-3xl font-bold leading-none"
              aria-label="Close welcome"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <HelpContent />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
            >
              Got it! Let's Play! 🎮
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
