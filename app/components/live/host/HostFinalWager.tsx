"use client";

import type { LivePlayer } from "@/lib/live/types";
import PlayerAvatar from "@/app/components/live/shared/PlayerAvatar";

interface HostFinalWagerProps {
  players: LivePlayer[];
  wagerStatus: Record<string, boolean>; // playerId → has submitted wager
  onShowClue: () => void;
}

export default function HostFinalWager({ players, wagerStatus, onShowClue }: HostFinalWagerProps) {
  const allSubmitted = players.every((p) => wagerStatus[p.id]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 px-4">
      <h2 className="text-3xl font-bold text-[#FFD700]">Final Jeopardy - Wagers</h2>
      <p className="text-blue-200">Players are placing their wagers...</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl w-full">
        {players.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
              wagerStatus[p.id]
                ? "bg-green-500/10 border-green-500/40"
                : "bg-white/5 border-white/10 animate-pulse"
            }`}
          >
            <PlayerAvatar name={p.displayName} color={p.avatarColor} size="md" />
            <div>
              <p className="text-white font-medium text-sm">{p.displayName}</p>
              <p className={`text-xs ${wagerStatus[p.id] ? "text-green-400" : "text-yellow-300/70"}`}>
                {wagerStatus[p.id] ? "Wager locked" : "Wagering..."}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onShowClue}
        disabled={!allSubmitted}
        className="px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
      >
        {allSubmitted ? "Show the Clue" : `Waiting for wagers (${Object.values(wagerStatus).filter(Boolean).length}/${players.length})`}
      </button>
    </div>
  );
}
