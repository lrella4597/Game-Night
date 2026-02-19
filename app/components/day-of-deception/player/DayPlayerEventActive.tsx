"use client";

import React from "react";

interface DayPlayerEventActiveProps {
  eventData: {
    eventName: string;
    instructions: string;
    durationMinutes: number;
    deceiverSecretMission?: string;
  } | null;
  role: "traitor" | "faithful" | null;
  timerRemaining: number;
  timerRunning: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ClockIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function DayPlayerEventActive({
  eventData,
  role,
  timerRemaining,
  timerRunning,
}: DayPlayerEventActiveProps) {
  const isDeceiver = role === "traitor";

  if (!eventData) {
    return (
      <div className="min-h-screen bg-[#1a1f14] flex items-center justify-center px-4">
        <p className="text-white/40 text-sm">Loading event...</p>
      </div>
    );
  }

  const isLowTime = timerRemaining <= 60;

  return (
    <div className="min-h-screen bg-[#1a1f14] px-4 py-8">
      <div className="max-w-sm mx-auto">
        {/* Event name */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-green-400 mb-1">
            {eventData.eventName}
          </h1>
          <p className="text-xs text-white/40">
            {eventData.durationMinutes} minute event
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <ClockIcon
            className={`w-5 h-5 ${
              isLowTime ? "text-red-400" : "text-green-400/60"
            }`}
          />
          <span
            className={`text-2xl font-mono font-bold tabular-nums ${
              isLowTime ? "text-red-400" : "text-green-400"
            } ${!timerRunning ? "opacity-50" : ""}`}
          >
            {formatTime(timerRemaining)}
          </span>
          {!timerRunning && (
            <span className="text-xs text-white/30 ml-1">paused</span>
          )}
        </div>

        {/* General instructions */}
        <div className="p-4 rounded-lg border border-green-900/30 bg-white/5 mb-4">
          <p className="text-xs uppercase tracking-wider text-white/40 mb-2">
            Instructions
          </p>
          <p className="text-white/70 text-sm leading-relaxed">
            {eventData.instructions}
          </p>
        </div>

        {/* Deceiver secret mission */}
        {isDeceiver && eventData.deceiverSecretMission && (
          <div className="p-4 rounded-lg border border-red-900/40 bg-red-500/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertIcon className="w-4 h-4 text-red-400/80" />
              <p className="text-xs uppercase tracking-wider text-red-400/60">
                Your Secret Mission
              </p>
            </div>
            <p className="text-red-300/80 text-sm leading-relaxed">
              {eventData.deceiverSecretMission}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
