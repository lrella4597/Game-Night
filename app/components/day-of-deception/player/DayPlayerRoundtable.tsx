"use client";

import React from "react";

interface DayPlayerRoundtableProps {
  timerRemaining: number;
  timerRunning: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export default function DayPlayerRoundtable({
  timerRemaining,
  timerRunning,
}: DayPlayerRoundtableProps) {
  const isLowTime = timerRemaining <= 60;

  return (
    <div className="min-h-screen bg-[#1a1f14] flex flex-col items-center justify-center px-4 py-8">
      {/* Icon */}
      <div className="mb-6 p-4 rounded-full border border-green-500/30 bg-green-500/10">
        <UsersIcon className="w-10 h-10 text-green-400" />
      </div>

      {/* Header */}
      <h1 className="text-2xl font-bold text-green-400 mb-2 text-center">
        Roundtable Discussion
      </h1>
      <p className="text-white/50 text-sm mb-8 text-center max-w-xs">
        Discuss who you think the deceivers are!
      </p>

      {/* Timer */}
      <div className="mb-8">
        <div
          className={`text-5xl font-mono font-bold tabular-nums text-center ${
            isLowTime ? "text-red-400" : "text-green-400"
          } ${!timerRunning ? "opacity-50" : ""}`}
        >
          {formatTime(timerRemaining)}
        </div>
        {!timerRunning && (
          <p className="text-xs text-white/30 text-center mt-1">Paused</p>
        )}
      </div>

      {/* Voting indicator */}
      <div className="px-5 py-3 rounded-lg border border-green-900/30 bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400/60 animate-pulse" />
          <p className="text-white/50 text-sm">Voting will begin soon...</p>
        </div>
      </div>
    </div>
  );
}
