"use client";

import { useState } from "react";

interface PlayerBuzzerProps {
  buzzerOpen: boolean;
  hasBuzzed: boolean;
  onBuzz: () => void;
}

export default function PlayerBuzzer({ buzzerOpen, hasBuzzed, onBuzz }: PlayerBuzzerProps) {
  const [pressed, setPressed] = useState(false);

  function handleBuzz() {
    if (!buzzerOpen || hasBuzzed) return;
    setPressed(true);
    onBuzz();
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <button
        onClick={handleBuzz}
        disabled={!buzzerOpen || hasBuzzed}
        className={`
          w-48 h-48 rounded-full font-bold text-3xl uppercase tracking-wider transition-all shadow-2xl
          ${
            !buzzerOpen
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : hasBuzzed || pressed
              ? "bg-yellow-500 text-yellow-900 scale-95"
              : "bg-red-500 text-white hover:bg-red-400 active:scale-90 active:bg-red-600 cursor-pointer"
          }
        `}
      >
        {hasBuzzed || pressed ? "Buzzed!" : buzzerOpen ? "BUZZ" : "Wait..."}
      </button>

      {!buzzerOpen && (
        <p className="text-blue-300 text-sm">Buzzer is locked</p>
      )}
    </div>
  );
}
