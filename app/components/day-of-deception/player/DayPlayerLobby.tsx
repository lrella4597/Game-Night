"use client";

import React from "react";

interface DayPlayerLobbyProps {
  players: { id: string; displayName: string; avatarColor: string }[];
  playerName: string;
}

export default function DayPlayerLobby({
  players,
  playerName,
}: DayPlayerLobbyProps) {
  return (
    <div className="min-h-screen bg-[#1a1f14] flex flex-col items-center px-4 py-8">
      {/* Pulse indicator */}
      <div className="relative mb-6">
        <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse" />
        <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-400 animate-ping opacity-40" />
      </div>

      {/* Waiting message */}
      <h1 className="text-xl font-bold text-green-400 mb-1 text-center">
        Waiting for host to start...
      </h1>
      <p className="text-sm text-green-400/50 mb-8 text-center">
        Sit tight while everyone joins
      </p>

      {/* Player&apos;s own name highlighted */}
      <div className="mb-8 px-5 py-3 rounded-lg border border-green-500/40 bg-green-500/10">
        <p className="text-green-300 text-sm text-center">
          You joined as
        </p>
        <p className="text-green-400 font-bold text-lg text-center">
          {playerName}
        </p>
      </div>

      {/* Player list */}
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-wider text-white/40 mb-3">
          Players in lobby ({players.length})
        </p>
        <div className="space-y-2">
          {players.map((player) => {
            const isMe = player.displayName === playerName;
            return (
              <div
                key={player.id}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors ${
                  isMe
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-green-900/30 bg-white/5"
                }`}
              >
                {/* Avatar dot */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: player.avatarColor }}
                />
                <span
                  className={`text-sm ${
                    isMe ? "text-green-300 font-semibold" : "text-white/70"
                  }`}
                >
                  {player.displayName}
                  {isMe && (
                    <span className="ml-2 text-xs text-green-500/60">(you)</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animated dots */}
      <div className="mt-8 flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full bg-green-500/50 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-green-500/50 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-green-500/50 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
