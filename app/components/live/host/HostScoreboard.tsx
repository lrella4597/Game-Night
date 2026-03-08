"use client";

import { useState } from "react";
import type { LivePlayer } from "@/lib/live/types";

interface HostScoreboardProps {
  players: LivePlayer[];
  currentAnswererId?: string | null;
  onAdjustScore?: (playerId: string, newScore: number) => void;
}

export default function HostScoreboard({ players, currentAnswererId, onAdjustScore }: HostScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startEdit(player: LivePlayer) {
    if (!onAdjustScore) return;
    setEditingId(player.id);
    setEditValue(String(player.score));
  }

  function commitEdit(player: LivePlayer) {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed) && onAdjustScore) {
      onAdjustScore(player.id, parsed);
    }
    setEditingId(null);
  }

  return (
    <div className="w-full bg-black/40 border-t border-white/10 px-4 py-4">
      <div className="flex items-center justify-center gap-5 flex-wrap">
        {sorted.map((player) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${
              player.id === currentAnswererId
                ? "bg-[#FFD700]/20 ring-2 ring-[#FFD700]"
                : "bg-white/5"
            }`}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: player.avatarColor }}
            >
              {player.displayName[0].toUpperCase()}
            </div>
            <span className="text-white text-lg font-medium truncate max-w-[120px]">
              {player.displayName}
            </span>

            {editingId === player.id ? (
              <form
                onSubmit={(e) => { e.preventDefault(); commitEdit(player); }}
                className="flex items-center gap-1"
              >
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(player)}
                  onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); }}
                  autoFocus
                  className="w-28 px-1 py-0.5 text-xl font-bold tabular-nums bg-black/60 text-white border border-[#FFD700] rounded text-center"
                />
              </form>
            ) : (
              <button
                onClick={() => startEdit(player)}
                title={onAdjustScore ? "Click to adjust score" : undefined}
                className={`text-xl font-bold tabular-nums ${
                  onAdjustScore ? "hover:underline cursor-pointer" : "cursor-default"
                } ${player.score >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                ${player.score.toLocaleString()}
              </button>
            )}
          </div>
        ))}
      </div>
      {onAdjustScore && (
        <p className="text-center text-[10px] text-white/30 mt-1">Click any score to edit</p>
      )}
    </div>
  );
}
