"use client";

import { useState } from "react";

interface DayHostEventActiveProps {
  eventData: {
    eventName: string;
    instructions: string;
    durationMinutes: number;
  } | null;
  onEndEvent: () => Promise<void>;
  timerRemaining: number;
  timerRunning: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DayHostEventActive({
  eventData,
  onEndEvent,
  timerRemaining,
  timerRunning,
}: DayHostEventActiveProps) {
  const [ending, setEnding] = useState(false);

  async function handleEndEvent() {
    setEnding(true);
    try {
      await onEndEvent();
    } catch {
      setEnding(false);
    }
  }

  if (!eventData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#1a1f14]">
        <p className="text-white/40 text-lg">No event data available.</p>
      </div>
    );
  }

  const isLowTime = timerRemaining <= 30 && timerRunning;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#1a1f14]">
      {/* Event Icon */}
      <div className="w-16 h-16 rounded-full bg-green-600/20 border-2 border-green-500/50 flex items-center justify-center mb-6">
        <svg
          className="w-8 h-8 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      </div>

      {/* Event Name */}
      <h1 className="text-3xl md:text-4xl font-bold text-green-400 mb-2 text-center">
        {eventData.eventName}
      </h1>

      {/* Duration Label */}
      <p className="text-white/40 text-sm mb-6">
        {eventData.durationMinutes} minute
        {eventData.durationMinutes !== 1 ? "s" : ""}
      </p>

      {/* Timer */}
      <div className="mb-8">
        <div
          className={`text-6xl font-mono font-bold ${
            isLowTime ? "text-red-400 animate-pulse" : "text-white"
          }`}
        >
          {formatTime(timerRemaining)}
        </div>
        {!timerRunning && timerRemaining > 0 && (
          <p className="text-white/30 text-sm text-center mt-2">
            Timer paused
          </p>
        )}
      </div>

      {/* Instructions Card */}
      <div className="w-full max-w-lg bg-white/5 rounded-xl border border-green-900/30 p-6 mb-8">
        <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3">
          Instructions
        </h3>
        <p className="text-white/80 text-base leading-relaxed whitespace-pre-wrap">
          {eventData.instructions}
        </p>
      </div>

      {/* End Event Button */}
      <button
        onClick={handleEndEvent}
        disabled={ending}
        className="bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-4 px-8 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
      >
        {ending ? "Ending..." : "End Event"}
      </button>
    </div>
  );
}
