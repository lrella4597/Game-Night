"use client";

import { useState } from "react";

interface DayHostRolesRevealedProps {
  onBeginDay: () => Promise<void>;
  playerCount: number;
}

export default function DayHostRolesRevealed({
  onBeginDay,
  playerCount,
}: DayHostRolesRevealedProps) {
  const [starting, setStarting] = useState(false);

  async function handleBeginDay() {
    setStarting(true);
    try {
      await onBeginDay();
    } catch {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#1a1f14]">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500/50 flex items-center justify-center mb-8">
        <svg
          className="w-10 h-10 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      </div>

      {/* Header */}
      <h1 className="text-3xl md:text-4xl font-bold text-green-400 mb-4 text-center">
        Roles Have Been Assigned!
      </h1>

      {/* Instructions */}
      <p className="text-white/60 text-lg text-center max-w-md mb-4">
        Players are viewing their roles on their devices.
        When everyone is ready, begin the day.
      </p>

      {/* Player Count */}
      <div className="bg-white/5 rounded-xl border border-green-900/30 px-6 py-3 mb-10">
        <p className="text-white text-lg text-center">
          <span className="text-green-400 font-bold text-2xl">
            {playerCount}
          </span>
          <span className="text-white/40 ml-2">
            player{playerCount !== 1 ? "s" : ""} in game
          </span>
        </p>
      </div>

      {/* Begin Day Button */}
      <button
        onClick={handleBeginDay}
        disabled={starting}
        className="bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-4 px-10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
      >
        {starting ? "Beginning..." : "Begin the Day"}
      </button>
    </div>
  );
}
