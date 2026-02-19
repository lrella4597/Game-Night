"use client";

import { useState } from "react";

interface DayHostRoundtableProps {
  timerRemaining: number;
  timerRunning: boolean;
  onStartVoting: () => Promise<void>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DayHostRoundtable({
  timerRemaining,
  timerRunning,
  onStartVoting,
}: DayHostRoundtableProps) {
  const [startingVote, setStartingVote] = useState(false);

  async function handleStartVoting() {
    setStartingVote(true);
    try {
      await onStartVoting();
    } catch {
      setStartingVote(false);
    }
  }

  const isLowTime = timerRemaining <= 30 && timerRunning;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#1a1f14]">
      {/* Roundtable Icon */}
      <div className="w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500/50 flex items-center justify-center mb-8">
        <svg
          className="w-10 h-10 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
          />
        </svg>
      </div>

      {/* Header */}
      <h1 className="text-3xl md:text-4xl font-bold text-green-400 mb-4 text-center">
        Roundtable Discussion
      </h1>

      {/* Instructions */}
      <p className="text-white/60 text-lg text-center max-w-md mb-8">
        Players are discussing who they think the deceivers are.
        When the discussion is over, start the voting phase.
      </p>

      {/* Timer */}
      <div className="mb-10 flex flex-col items-center">
        <div
          className={`text-7xl font-mono font-bold ${
            isLowTime ? "text-red-400 animate-pulse" : "text-white"
          }`}
        >
          {formatTime(timerRemaining)}
        </div>
        {timerRunning ? (
          <p className="text-white/30 text-sm mt-3">Discussion time remaining</p>
        ) : (
          <p className="text-white/30 text-sm mt-3">Timer paused</p>
        )}
      </div>

      {/* Start Voting Button */}
      <button
        onClick={handleStartVoting}
        disabled={startingVote}
        className="bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-4 px-10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
      >
        {startingVote ? "Starting Vote..." : "Start Voting"}
      </button>
    </div>
  );
}
