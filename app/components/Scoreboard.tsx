"use client";

import { useState } from "react";
import type { Team } from "../data/teams";

interface ScoreboardProps {
  teams: Team[];
  activeQuestionValue?: number;
  onScoreDelta: (teamId: string, delta: number) => void;
  onScoreSet: (teamId: string, score: number) => void;
}

export default function Scoreboard({
  teams,
  activeQuestionValue,
  onScoreDelta,
  onScoreSet,
}: ScoreboardProps) {
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (teams.length === 0) return null;

  const delta = activeQuestionValue ?? 100;

  function startEdit(team: Team) {
    setEditingTeamId(team.id);
    setEditValue(String(team.score));
  }

  function commitEdit(teamId: string) {
    const parsed = parseInt(editValue, 10);
    if (!isNaN(parsed)) onScoreSet(teamId, parsed);
    setEditingTeamId(null);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-center gap-0 border-t border-slate-200 bg-white min-h-[72px]">
      {teams.map((team, idx) => (
        <div
          key={team.id}
          className={`flex flex-col items-center justify-center px-3 py-2 flex-1 max-w-[200px] ${
            idx > 0 ? "border-l border-slate-200" : ""
          }`}
        >
          {/* Team name */}
          <span
            className="text-xs font-bold tracking-tight uppercase truncate w-full text-center"
            style={{ color: team.color }}
          >
            {team.name}
          </span>

          {/* Score + edit */}
          <div className="flex items-center gap-1 my-0.5">
            <button
              onClick={() => onScoreDelta(team.id, -delta)}
              className="w-6 h-6 rounded font-bold text-xs transition-all hover:bg-red-50 flex items-center justify-center text-red-600"
              title={`-${delta}`}
            >
              −
            </button>

            {editingTeamId === team.id ? (
              <input
                autoFocus
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitEdit(team.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit(team.id);
                  if (e.key === "Escape") setEditingTeamId(null);
                }}
                className="w-20 text-center font-black text-lg text-slate-900 bg-transparent border-b-2 focus:outline-none"
                style={{ borderColor: team.color }}
              />
            ) : (
              <button
                onClick={() => startEdit(team)}
                className="font-black text-lg min-w-[3rem] text-center transition-all hover:opacity-70 text-slate-900"
                title="Click to edit score"
              >
                {team.score}
              </button>
            )}

            <button
              onClick={() => onScoreDelta(team.id, delta)}
              className="w-6 h-6 rounded font-bold text-xs transition-all hover:bg-green-50 flex items-center justify-center text-green-600"
              title={`+${delta}`}
            >
              +
            </button>
          </div>

          {/* Active delta label */}
          <span className="text-slate-400 text-xs">
            ±{delta} pts
          </span>
        </div>
      ))}
    </div>
  );
}
