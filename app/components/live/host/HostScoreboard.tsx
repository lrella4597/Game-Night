"use client";

import type { LivePlayer } from "@/lib/live/types";

interface HostScoreboardProps {
  players: LivePlayer[];
  currentAnswererId?: string | null;
}

export default function HostScoreboard({ players, currentAnswererId }: HostScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full bg-black/40 border-t border-white/10 px-4 py-3">
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {sorted.map((player) => (
          <div
            key={player.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              player.id === currentAnswererId
                ? "bg-[#FFD700]/20 ring-2 ring-[#FFD700]"
                : "bg-white/5"
            }`}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: player.avatarColor }}
            >
              {player.displayName[0].toUpperCase()}
            </div>
            <span className="text-white text-sm font-medium truncate max-w-[80px]">
              {player.displayName}
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                player.score >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              ${player.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
