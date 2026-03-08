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
                  className="w-24 px-1 py-0.5 text-sm font-bold tabular-nums bg-black/60 text-white border border-[#FFD700] rounded text-center"
                />
              </form>
            ) : (
              <button
                onClick={() => startEdit(player)}
                title={onAdjustScore ? "Click to adjust score" : undefined}
                className={`text-sm font-bold tabular-nums ${
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
