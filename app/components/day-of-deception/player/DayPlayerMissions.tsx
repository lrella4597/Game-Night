"use client";

import React, { useState } from "react";

interface Mission {
  id: string;
  missionText: string;
  missionCategory: string;
  isCompleted: boolean;
}

interface DayPlayerMissionsProps {
  missions: Mission[];
  onCompleteMission: (missionId: string, proof?: string) => Promise<void>;
}

const categoryColors: Record<string, { badge: string; label: string }> = {
  social: {
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    label: "Social",
  },
  conversational: {
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    label: "Conversational",
  },
  sneaky: {
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    label: "Sneaky",
  },
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
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

export default function DayPlayerMissions({
  missions,
  onCompleteMission,
}: DayPlayerMissionsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [proofText, setProofText] = useState<string>("");
  const [completingId, setCompletingId] = useState<string | null>(null);

  const activeMissions = missions.filter((m) => !m.isCompleted);
  const completedMissions = missions.filter((m) => m.isCompleted);

  const handleComplete = async (missionId: string) => {
    setCompletingId(missionId);
    try {
      const proof = expandedId === missionId && proofText.trim() ? proofText.trim() : undefined;
      await onCompleteMission(missionId, proof);
      setExpandedId(null);
      setProofText("");
    } finally {
      setCompletingId(null);
    }
  };

  const toggleExpand = (missionId: string) => {
    if (expandedId === missionId) {
      setExpandedId(null);
      setProofText("");
    } else {
      setExpandedId(missionId);
      setProofText("");
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1f14] px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-green-400 mb-1">Your Missions</h1>
        <p className="text-xs text-white/40">
          {activeMissions.length} active &middot; {completedMissions.length} completed
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-6">
        {/* Active missions */}
        {activeMissions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Active
            </p>
            {activeMissions.map((mission) => {
              const cat = categoryColors[mission.missionCategory];
              const isExpanded = expandedId === mission.id;
              return (
                <div
                  key={mission.id}
                  className="rounded-lg border border-white/20 bg-white/5 overflow-hidden"
                >
                  <div className="p-4">
                    {/* Category badge and token reward */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          cat?.badge || "bg-white/10 text-white/50 border-white/20"
                        }`}
                      >
                        {cat?.label || mission.missionCategory}
                      </span>
                      <div className="flex items-center gap-1">
                        <TokenIcon className="w-3.5 h-3.5 text-yellow-400/70" />
                        <span className="text-[10px] text-yellow-400/70 font-medium">
                          +1
                        </span>
                      </div>
                    </div>

                    {/* Mission text */}
                    <p className="text-white/80 text-sm leading-relaxed mb-3">
                      {mission.missionText}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleComplete(mission.id)}
                        disabled={completingId === mission.id}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-md border border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {completingId === mission.id
                          ? "Completing..."
                          : "Mark Complete"}
                      </button>
                      <button
                        onClick={() => toggleExpand(mission.id)}
                        className="px-3 py-2 text-xs text-white/40 rounded-md border border-white/10 hover:border-white/20 hover:text-white/60 transition-colors"
                      >
                        {isExpanded ? "Hide" : "Add Proof"}
                      </button>
                    </div>
                  </div>

                  {/* Expandable proof input */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/10 pt-3">
                      <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1.5">
                        Proof (optional)
                      </label>
                      <textarea
                        value={proofText}
                        onChange={(e) => setProofText(e.target.value)}
                        placeholder="Describe how you completed this mission..."
                        className="w-full px-3 py-2 text-xs text-white/80 bg-white/5 border border-white/10 rounded-md resize-none focus:outline-none focus:border-green-500/40 placeholder:text-white/20"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Completed missions */}
        {completedMissions.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-white/40">
              Completed
            </p>
            {completedMissions.map((mission) => {
              const cat = categoryColors[mission.missionCategory];
              return (
                <div
                  key={mission.id}
                  className="p-4 rounded-lg border border-green-900/30 bg-green-500/5"
                >
                  {/* Category badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border opacity-50 ${
                        cat?.badge || "bg-white/10 text-white/50 border-white/20"
                      }`}
                    >
                      {cat?.label || mission.missionCategory}
                    </span>
                    <CheckIcon className="w-4 h-4 text-green-400" />
                  </div>

                  {/* Mission text with strikethrough */}
                  <p className="text-white/40 text-sm line-through leading-relaxed">
                    {mission.missionText}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {missions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm">No missions assigned yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
