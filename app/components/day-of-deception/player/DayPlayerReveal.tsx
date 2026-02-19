"use client";

import React from "react";
import ChalkboardBackground from "../shared/ChalkboardBackground";
import ChalkText from "../shared/ChalkText";

interface DayPlayerRevealProps {
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
  myRole: "traitor" | "faithful" | null;
}

const chalkStyle: React.CSSProperties = {
  color: "rgba(255, 255, 255, 0.85)",
  textShadow:
    "1px 1px 2px rgba(255, 255, 255, 0.1), 0 0 10px rgba(255, 255, 255, 0.05)",
};

export default function DayPlayerReveal({
  voteResult,
  myRole,
}: DayPlayerRevealProps) {
  if (!voteResult) {
    return (
      <ChalkboardBackground className="min-h-screen flex items-center justify-center">
        <ChalkText as="p" size="md" className="opacity-50">
          Tallying votes...
        </ChalkText>
      </ChalkboardBackground>
    );
  }

  const {
    voteTally,
    accusedId,
    accusedName,
    accusedRole,
    tied,
    winner,
  } = voteResult;

  // Sort tally by weighted votes descending
  const sortedTally = Object.entries(voteTally).sort(
    ([, a], [, b]) => b.weightedVotes - a.weightedVotes
  );

  const faithfulWin = winner === "faithful";
  const iWon =
    (myRole === "faithful" && faithfulWin) ||
    (myRole === "traitor" && !faithfulWin);

  return (
    <ChalkboardBackground className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center px-4 py-8 max-w-sm mx-auto w-full">
        {/* Header */}
        <ChalkText as="h1" size="xl" className="mb-6 text-center">
          The Votes Are In
        </ChalkText>

        {/* Vote tally */}
        <div className="w-full mb-6 space-y-2">
          <ChalkText as="p" size="sm" className="opacity-40 mb-3 uppercase tracking-wider">
            Vote Tally
          </ChalkText>
          {sortedTally.map(([id, data]) => {
            const isAccused = id === accusedId;
            return (
              <div
                key={id}
                className={`flex items-center justify-between px-4 py-2.5 rounded-md ${
                  isAccused ? "bg-white/10 border-b border-white/30" : ""
                }`}
              >
                <span
                  className="font-[family-name:var(--font-chalk)] text-base"
                  style={{
                    ...chalkStyle,
                    opacity: isAccused ? 1 : 0.6,
                  }}
                >
                  {data.name}
                  {isAccused && " *"}
                </span>
                <span
                  className="font-[family-name:var(--font-chalk)] text-sm tabular-nums"
                  style={{ ...chalkStyle, opacity: 0.7 }}
                >
                  {data.votes} vote{data.votes !== 1 ? "s" : ""}
                  {data.weightedVotes !== data.votes && (
                    <span className="opacity-50">
                      {" "}
                      / {data.weightedVotes}w
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Chalk divider */}
        <div
          className="w-full h-px mb-6 opacity-20"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 4px, transparent 4px, transparent 8px)",
          }}
        />

        {/* Accused player */}
        <div className="text-center mb-6">
          {tied ? (
            <>
              <ChalkText as="p" size="lg" className="mb-2">
                No One Accused
              </ChalkText>
              <ChalkText as="p" size="sm" className="opacity-50">
                The vote was tied!
              </ChalkText>
            </>
          ) : (
            <>
              <ChalkText as="p" size="sm" className="opacity-50 mb-1">
                The accused:
              </ChalkText>
              <ChalkText as="h2" size="xl" className="mb-3">
                {accusedName}
              </ChalkText>
              {accusedRole && (
                <span
                  className={`inline-block px-4 py-1.5 rounded-full font-[family-name:var(--font-chalk)] text-base border ${
                    accusedRole === "traitor"
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-green-500/40 bg-green-500/10"
                  }`}
                  style={{
                    ...chalkStyle,
                    color:
                      accusedRole === "traitor"
                        ? "rgba(252, 165, 165, 0.9)"
                        : "rgba(134, 239, 172, 0.9)",
                  }}
                >
                  {accusedRole === "traitor"
                    ? "They were a DECEIVER!"
                    : "They were LOYAL!"}
                </span>
              )}
            </>
          )}
        </div>

        {/* Winner */}
        <div
          className={`w-full p-4 rounded-lg border text-center mb-6 ${
            faithfulWin
              ? "border-green-500/30 bg-green-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <span
            className="font-[family-name:var(--font-chalk)] text-2xl"
            style={{
              ...chalkStyle,
              color: faithfulWin
                ? "rgba(134, 239, 172, 0.9)"
                : "rgba(252, 165, 165, 0.9)",
            }}
          >
            {faithfulWin ? "The Loyal Win!" : "The Deceivers Win!"}
          </span>
        </div>

        {/* Vote Recap — Who voted for whom */}
        {voteResult.voteDetails && voteResult.voteDetails.length > 0 && (
          <div className="w-full mb-6">
            <ChalkText as="p" size="sm" className="opacity-40 mb-3 uppercase tracking-wider">
              Who Voted For Who
            </ChalkText>
            <div className="space-y-1.5">
              {voteResult.voteDetails.map((detail, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-white/5"
                >
                  <span
                    className="font-[family-name:var(--font-chalk)] text-sm"
                    style={{ ...chalkStyle, opacity: 0.7 }}
                  >
                    {detail.voterName}
                  </span>
                  <svg
                    className="w-4 h-4 text-white/25 mx-1.5 flex-shrink-0"
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
                    className="font-[family-name:var(--font-chalk)] text-sm font-bold"
                    style={{ ...chalkStyle, opacity: 0.9 }}
                  >
                    {detail.targetName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chalk divider before personal result */}
        {voteResult.voteDetails && voteResult.voteDetails.length > 0 && (
          <div
            className="w-full h-px mb-6 opacity-20"
            style={{
              background:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 4px, transparent 4px, transparent 8px)",
            }}
          />
        )}

        {/* Personal result */}
        {myRole && (
          <div
            className={`px-5 py-3 rounded-lg border ${
              iWon
                ? "border-green-500/30 bg-green-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}
          >
            <ChalkText
              as="p"
              size="lg"
              className={iWon ? "text-green-300" : "text-red-300"}
            >
              {iWon ? "You won!" : "You lost!"}
            </ChalkText>
          </div>
        )}
      </div>
    </ChalkboardBackground>
  );
}
