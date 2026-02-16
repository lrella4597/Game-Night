"use client";

import { useState } from "react";
import type { Team, PowerUpKey } from "../data/teams";
import type { SoundEffect } from "@/lib/audio/useSoundEffects";

const POWER_UP_META: Record<PowerUpKey, { label: string; icon: string; title: string }> = {
  doubleDown:   { label: "Double Down",   icon: "⚡", title: "Double the points for this question" },
  doubleDip:    { label: "Double Dip",    icon: "🎯", title: "Get two attempts to answer" },
  phoneAFriend: { label: "Phone Friend",  icon: "📞", title: "Call for outside help" },
};

interface PowerUpsDisplayProps {
  teams: Team[];
  onUsePowerUp: (teamId: string, key: PowerUpKey) => void;
  playSound?: (sound: SoundEffect) => void;
}

export default function PowerUpsDisplay({ teams, onUsePowerUp, playSound }: PowerUpsDisplayProps) {
  const [popping, setPopping] = useState<string | null>(null); // `${teamId}-${key}`

  if (teams.length === 0) return null;

  function handleClick(teamId: string, key: PowerUpKey, alreadyUsed: boolean) {
    // Allow clicking to toggle power-ups on/off
    playSound?.("power-up");
    const uid = `${teamId}-${key}`;
    setPopping(uid);
    setTimeout(() => setPopping(null), 400);
    onUsePowerUp(teamId, key);
  }

  return (
    <div className="w-full max-w-6xl flex flex-col gap-2 mt-4 mb-24">
      <p className="text-xs font-semibold tracking-tight text-center text-slate-600">
        Power-Ups
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 bg-white border border-slate-200 min-w-[150px]"
          >
            <span
              className="text-xs font-bold tracking-tight uppercase"
              style={{ color: team.color }}
            >
              {team.name}
            </span>
            <div className="flex gap-2">
              {(Object.keys(POWER_UP_META) as PowerUpKey[]).map((key) => {
                const meta = POWER_UP_META[key];
                const used = team.powerUps[key];
                const uid = `${team.id}-${key}`;
                const isPopping = popping === uid;

                return (
                  <button
                    key={key}
                    onClick={() => handleClick(team.id, key, used)}
                    title={used ? `${meta.label} — used (click to reactivate)` : meta.title}
                    className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 transition-all cursor-pointer ${
                      used
                        ? "bg-slate-50 border border-slate-200 opacity-40 hover:opacity-70 hover:border-slate-300"
                        : "bg-accent/10 border border-accent/30 hover:bg-accent/20"
                    }`}
                    style={{
                      transform: isPopping ? "scale(1.25)" : "scale(1)",
                      transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s, background-color 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", filter: used ? "grayscale(1)" : "none" }}>
                      {meta.icon}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        used ? "text-slate-400" : "text-slate-700"
                      }`}
                      style={{ fontSize: "0.6rem" }}
                    >
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Keyframe for pop animation included via inline style */}
      <style>{`
        @keyframes puPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
