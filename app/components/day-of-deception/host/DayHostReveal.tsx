"use client";

import { useState } from "react";
import ChalkboardBackground from "../shared/ChalkboardBackground";
import { ROLE_DISPLAY } from "@/lib/day-of-deception/types";

interface DayHostRevealProps {
  voteResult: {
    voteTally: Record<
      string,
      { name: string; votes: number; weightedVotes: number }
    >;
    voteDetails?: { voterName: string; targetName: string }[];
    accusedId: string | null;
    accusedName: string | null;
    accusedRole: string | null;
    tied: boolean;
    winner: string;
  } | null;
  onEndGame: () => Promise<void>;
}

export default function DayHostReveal({
  voteResult,
  onEndGame,
}: DayHostRevealProps) {
  const [ending, setEnding] = useState(false);

  async function handleEndGame() {
    setEnding(true);
    try {
      await onEndGame();
    } catch {
      setEnding(false);
    }
  }

  if (!voteResult) {
    return (
      <ChalkboardBackground>
        <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4">
          <p className="text-white/40 text-lg">Calculating results...</p>
        </div>
      </ChalkboardBackground>
    );
  }

  // Sort tally entries by weighted votes descending
  const tallyEntries = Object.entries(voteResult.voteTally)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.weightedVotes - a.weightedVotes);

  const maxWeightedVotes =
    tallyEntries.length > 0 ? tallyEntries[0].weightedVotes : 1;

  const chalkStyle = {
    textShadow:
      "1px 1px 2px rgba(255,255,255,0.1), 0 0 10px rgba(255,255,255,0.05)",
  };

  return (
    <ChalkboardBackground>
      <div className="flex flex-col items-center min-h-screen py-8 px-4">
        {/* Header */}
        <h1
          className="text-3xl md:text-4xl font-bold text-green-400 mb-8 font-[family-name:var(--font-chalk)]"
          style={chalkStyle}
        >
          Vote Results
        </h1>

        {/* Vote Tally */}
        <div className="w-full max-w-lg mb-10">
          <div className="space-y-4">
            {tallyEntries.map((entry) => (
              <div key={entry.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className="text-white font-medium font-[family-name:var(--font-chalk)] text-lg"
                    style={chalkStyle}
                  >
                    {entry.name}
                  </span>
                  <span className="text-white/60 text-sm">
                    {entry.votes} vote{entry.votes !== 1 ? "s" : ""}
                    {entry.weightedVotes !== entry.votes && (
                      <span className="text-green-400 ml-1">
                        ({entry.weightedVotes} weighted)
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full h-6 bg-white/5 rounded-full border border-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      entry.id === voteResult.accusedId
                        ? "bg-red-600"
                        : "bg-green-600"
                    }`}
                    style={{
                      width:
                        maxWeightedVotes > 0
                          ? `${(entry.weightedVotes / maxWeightedVotes) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accused / Tied Result */}
        <div className="max-w-lg text-center mb-10">
          {voteResult.tied ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h2
                className="text-2xl md:text-3xl font-bold text-white/60 font-[family-name:var(--font-chalk)]"
                style={chalkStyle}
              >
                No one was accused — Deceivers win!
              </h2>
            </div>
          ) : voteResult.accusedName ? (
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  voteResult.accusedRole === "traitor"
                    ? "bg-red-600/20 border-2 border-red-500/50"
                    : "bg-green-600/20 border-2 border-green-500/50"
                }`}
              >
                <svg
                  className={`w-10 h-10 ${
                    voteResult.accusedRole === "traitor"
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <h2
                className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-chalk)]"
                style={chalkStyle}
              >
                {voteResult.accusedName} has been accused!
              </h2>
              {voteResult.accusedRole && (
                <span
                  className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                    voteResult.accusedRole === "traitor"
                      ? "bg-red-600/30 text-red-400 border border-red-500/50"
                      : "bg-green-600/30 text-green-400 border border-green-500/50"
                  }`}
                >
                  {ROLE_DISPLAY[voteResult.accusedRole] || voteResult.accusedRole}
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Winner Announcement */}
        {voteResult.winner && (
          <div className="mb-10">
            <h2
              className={`text-3xl md:text-4xl font-bold text-center font-[family-name:var(--font-chalk)] ${
                voteResult.winner === "faithful"
                  ? "text-green-400"
                  : "text-red-400"
              }`}
              style={chalkStyle}
            >
              {voteResult.winner === "faithful"
                ? "Loyal Win!"
                : "Deceivers Win!"}
            </h2>
          </div>
        )}

        {/* Vote Recap — Who voted for whom */}
        {voteResult.voteDetails && voteResult.voteDetails.length > 0 && (
          <div className="w-full max-w-lg mb-10">
            <h3
              className="text-xl font-bold text-white/70 mb-4 font-[family-name:var(--font-chalk)] text-center"
              style={chalkStyle}
            >
              Who Voted For Who
            </h3>
            <div className="space-y-2">
              {voteResult.voteDetails.map((detail, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 border border-white/10"
                >
                  <span
                    className="text-white/80 font-[family-name:var(--font-chalk)] text-base"
                    style={chalkStyle}
                  >
                    {detail.voterName}
                  </span>
                  <svg
                    className="w-5 h-5 text-white/30 mx-2 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <span
                    className="text-white font-[family-name:var(--font-chalk)] text-base font-bold"
                    style={chalkStyle}
                  >
                    {detail.targetName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* End Game Button */}
        <button
          onClick={handleEndGame}
          disabled={ending}
          className="bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-4 px-10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {ending ? "Ending..." : "End Game"}
        </button>
      </div>
    </ChalkboardBackground>
  );
}
