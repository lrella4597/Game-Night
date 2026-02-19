"use client";

import React from "react";

interface DayPlayerEndProps {
  endgameData: {
    winner: string;
    players: {
      id: string;
      displayName: string;
      role: string;
      shadowTokens: number;
    }[];
  } | null;
  myRole: "traitor" | "faithful" | null;
}

function ShieldIcon({ className }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function DaggerIcon({ className }: { className?: string }) {
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
      <path d="M12 2v8" />
      <path d="M8 6h8" />
      <path d="M12 10l-2 10" />
      <path d="M12 10l2 10" />
      <path d="M10 15h4" />
    </svg>
  );
}

function TokenIcon({ className }: { className?: string }) {
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
      <path d="M12 6v12" />
      <path d="M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5" />
    </svg>
  );
}

export default function DayPlayerEnd({
  endgameData,
  myRole,
}: DayPlayerEndProps) {
  if (!endgameData) {
    return (
      <div className="min-h-screen bg-[#1a1f14] flex items-center justify-center px-4">
        <p className="text-white/40 text-sm animate-pulse">
          Loading final results...
        </p>
      </div>
    );
  }

  const { winner, players } = endgameData;
  const faithfulWin = winner === "faithful";
  const iWon =
    (myRole === "faithful" && faithfulWin) ||
    (myRole === "traitor" && !faithfulWin);

  const traitors = players.filter((p) => p.role === "traitor");
  const faithful = players.filter((p) => p.role === "faithful");

  return (
    <div
      className={`min-h-screen px-4 py-8 ${
        faithfulWin
          ? "bg-gradient-to-b from-[#142a14] via-[#101f10] to-[#1a1f14]"
          : "bg-gradient-to-b from-[#2a1414] via-[#1f1010] to-[#1a1f14]"
      }`}
    >
      <div className="max-w-sm mx-auto">
        {/* Winner announcement */}
        <div className="text-center mb-8">
          <h1
            className={`text-3xl font-bold mb-2 ${
              faithfulWin ? "text-green-400" : "text-red-400"
            }`}
          >
            {faithfulWin ? "The Loyal Win!" : "The Deceivers Win!"}
          </h1>

          {/* Personal result */}
          {myRole && (
            <div
              className={`inline-block px-4 py-1.5 rounded-full border text-sm font-medium ${
                iWon
                  ? "border-green-500/40 bg-green-500/10 text-green-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}
            >
              {iWon ? "You won!" : "You lost!"}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-6" />

        {/* Role reveal: Deceivers */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <DaggerIcon className="w-4 h-4 text-red-400/70" />
            <p className="text-xs uppercase tracking-wider text-red-400/60">
              Deceivers
            </p>
          </div>
          <div className="space-y-2">
            {traitors.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-red-900/30 bg-red-500/5"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                    Deceiver
                  </span>
                  <span className="text-white/80 text-sm">
                    {player.displayName}
                  </span>
                </div>
                {player.shadowTokens > 0 && (
                  <div className="flex items-center gap-1">
                    <TokenIcon className="w-3.5 h-3.5 text-yellow-400/70" />
                    <span className="text-xs text-yellow-400/70 font-medium">
                      {player.shadowTokens}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Role reveal: Loyal */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ShieldIcon className="w-4 h-4 text-green-400/70" />
            <p className="text-xs uppercase tracking-wider text-green-400/60">
              Loyal
            </p>
          </div>
          <div className="space-y-2">
            {faithful.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-green-900/30 bg-green-500/5"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                    Loyal
                  </span>
                  <span className="text-white/80 text-sm">
                    {player.displayName}
                  </span>
                </div>
                {player.shadowTokens > 0 && (
                  <div className="flex items-center gap-1">
                    <TokenIcon className="w-3.5 h-3.5 text-yellow-400/70" />
                    <span className="text-xs text-yellow-400/70 font-medium">
                      {player.shadowTokens}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/10">
          <p className="text-white/30 text-sm">Thanks for playing!</p>
        </div>
      </div>
    </div>
  );
}
