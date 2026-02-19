"use client";

import React, { useState } from "react";

interface Mission {
  id: string;
  missionText: string;
  missionCategory: string;
  isCompleted: boolean;
}

interface DayPlayerFreeplayProps {
  role: "traitor" | "faithful" | null;
  missions: Mission[];
  onCompleteMission: (missionId: string, proof?: string) => Promise<void>;
}

const categoryColors: Record<string, string> = {
  social: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  conversational: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  sneaky: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const observationTips = [
  "Watch for suspicious behavior",
  "Pay attention to alliances",
  "Note who whispers to whom",
  "Look for players acting out of character",
  "Trust your instincts",
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function DeceiverView({
  missions,
  onCompleteMission,
}: {
  missions: Mission[];
  onCompleteMission: (missionId: string, proof?: string) => Promise<void>;
}) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleComplete = async (missionId: string) => {
    setCompletingId(missionId);
    try {
      await onCompleteMission(missionId);
    } finally {
      setCompletingId(null);
    }
  };

  const activeMissions = missions.filter((m) => !m.isCompleted);
  const completedMissions = missions.filter((m) => m.isCompleted);

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-lg border border-red-900/30 bg-red-500/5">
        <p className="text-red-300/70 text-xs text-center">
          Complete missions to earn Shadow Tokens. Be subtle.
        </p>
      </div>

      {/* Active missions */}
      {activeMissions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/40">
            Active Missions
          </p>
          {activeMissions.map((mission) => (
            <div
              key={mission.id}
              className="p-4 rounded-lg border border-white/15 bg-white/5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-white/80 text-sm leading-relaxed flex-1">
                  {mission.missionText}
                </p>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${
                    categoryColors[mission.missionCategory] ||
                    "bg-white/10 text-white/50 border-white/20"
                  }`}
                >
                  {mission.missionCategory}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-yellow-400/60">
                  +1 Shadow Token
                </span>
                <button
                  onClick={() => handleComplete(mission.id)}
                  disabled={completingId === mission.id}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {completingId === mission.id ? "Completing..." : "Mark Complete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed missions */}
      {completedMissions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-white/40">
            Completed
          </p>
          {completedMissions.map((mission) => (
            <div
              key={mission.id}
              className="p-4 rounded-lg border border-green-900/30 bg-green-500/5"
            >
              <div className="flex items-start gap-3">
                <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/40 text-sm line-through leading-relaxed">
                  {mission.missionText}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FaithfulView() {
  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-lg border border-green-900/30 bg-green-500/5">
        <p className="text-green-300/70 text-xs text-center">
          Stay alert. The deceivers are hiding in plain sight.
        </p>
      </div>

      {/* Observation tips */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-white/40">
          Tips for Observation
        </p>
        {observationTips.map((tip, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-green-900/30 bg-white/5"
          >
            <EyeIcon className="w-4 h-4 text-green-400/60 flex-shrink-0" />
            <p className="text-white/60 text-sm">{tip}</p>
          </div>
        ))}
      </div>

      {/* Encouragement */}
      <div className="mt-4 p-4 rounded-lg border border-green-900/30 bg-green-500/5 text-center">
        <p className="text-green-300/60 text-sm leading-relaxed">
          Mingle, socialize, and keep your eyes open. The roundtable discussion
          is your chance to voice your suspicions.
        </p>
      </div>
    </div>
  );
}

export default function DayPlayerFreeplay({
  role,
  missions,
  onCompleteMission,
}: DayPlayerFreeplayProps) {
  const isDeceiver = role === "traitor";

  return (
    <div className="min-h-screen bg-[#1a1f14] px-4 py-8">
      {/* Ambient header */}
      <div className="text-center mb-6">
        <p className="text-green-400/40 text-sm mb-1">Enjoy the day!</p>
        <h1 className="text-xl font-bold text-green-400">
          {isDeceiver ? "Freeplay - Deceiver" : "Freeplay"}
        </h1>
      </div>

      {/* Content based on role */}
      <div className="max-w-sm mx-auto">
        {isDeceiver ? (
          <DeceiverView missions={missions} onCompleteMission={onCompleteMission} />
        ) : (
          <FaithfulView />
        )}
      </div>
    </div>
  );
}
