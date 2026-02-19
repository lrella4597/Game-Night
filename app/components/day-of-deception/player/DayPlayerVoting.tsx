"use client";

import React from "react";
import ChalkboardBackground from "../shared/ChalkboardBackground";
import ChalkText from "../shared/ChalkText";

interface DayPlayerVotingProps {
  players: { id: string; displayName: string; avatarColor: string }[];
  myPlayerId: string;
  selectedTarget: string | null;
  onSelectTarget: (id: string) => void;
  onSubmit: () => void;
  submitted: boolean;
  timerRemaining: number;
  timerRunning: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LockIcon({ className }: { className?: string }) {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

const chalkStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.85)",
  textShadow:
    "1px 1px 2px rgba(255, 255, 255, 0.1), 0 0 10px rgba(255, 255, 255, 0.05)",
};

export default function DayPlayerVoting({
  players,
  myPlayerId,
  selectedTarget,
  onSelectTarget,
  onSubmit,
  submitted,
  timerRemaining,
  timerRunning,
}: DayPlayerVotingProps) {
  const votablePlayers = players.filter((p) => p.id !== myPlayerId);
  const isLowTime = timerRemaining <= 30;

  return (
    <ChalkboardBackground className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center px-4 py-8 max-w-sm mx-auto w-full">
        {/* Header */}
        <ChalkText as="h1" size="2xl" className="mb-2 text-center">
          Cast Your Vote
        </ChalkText>

        {/* Timer */}
        <div className="mb-6">
          <span
            className={`font-[family-name:var(--font-chalk)] text-2xl tabular-nums ${
              isLowTime ? "text-red-300" : ""
            } ${!timerRunning ? "opacity-50" : ""}`}
            style={{
              ...chalkStyle,
              color: isLowTime ? "rgba(252, 165, 165, 0.85)" : chalkStyle.color,
            }}
          >
            {formatTime(timerRemaining)}
          </span>
          {!timerRunning && (
            <span
              className="ml-2 font-[family-name:var(--font-chalk)] text-sm"
              style={{ ...chalkStyle, opacity: 0.4 }}
            >
              paused
            </span>
          )}
        </div>

        {/* Submitted state */}
        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <LockIcon className="w-10 h-10 text-white/60 mb-4" />
            <ChalkText as="p" size="lg" className="mb-2 text-center">
              Vote Locked In
            </ChalkText>
            <ChalkText as="p" size="sm" className="opacity-50 text-center">
              Waiting for all votes...
            </ChalkText>
          </div>
        ) : (
          <>
            {/* Chalk divider */}
            <div
              className="w-full h-px mb-6 opacity-20"
              style={{
                background:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 4px, transparent 4px, transparent 8px)",
              }}
            />

            {/* Player list */}
            <div className="w-full space-y-2 mb-8">
              {votablePlayers.map((player) => {
                const isSelected = selectedTarget === player.id;
                return (
                  <button
                    key={player.id}
                    onClick={() => onSelectTarget(player.id)}
                    disabled={submitted}
                    className={`w-full text-left px-4 py-4 rounded-lg transition-all duration-200
                      font-[family-name:var(--font-chalk)] border-2 active:scale-[0.98]
                      ${
                        isSelected
                          ? "border-white/60 bg-white/15"
                          : "border-white/15 bg-white/5 hover:bg-white/8"
                      }
                    `}
                    style={chalkStyle}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all
                          ${
                            isSelected
                              ? "border-white/80 bg-white/20"
                              : "border-white/30 bg-transparent"
                          }
                        `}
                      >
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          isSelected ? "opacity-100" : "opacity-60"
                        }`}
                        style={{ backgroundColor: player.avatarColor }}
                      />
                      <span
                        className={`text-lg ${
                          isSelected ? "opacity-100" : "opacity-70"
                        }`}
                      >
                        {player.displayName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Submit button */}
            <button
              onClick={onSubmit}
              disabled={!selectedTarget || submitted}
              className={`w-full py-3 rounded-md font-[family-name:var(--font-chalk)] text-lg
                border transition-all duration-200
                ${
                  selectedTarget
                    ? "border-white/40 bg-white/5 hover:bg-white/10 hover:border-white/60 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] cursor-pointer"
                    : "border-white/10 bg-transparent opacity-30 cursor-not-allowed"
                }
              `}
              style={chalkStyle}
            >
              Submit Vote
            </button>
          </>
        )}
      </div>
    </ChalkboardBackground>
  );
}
