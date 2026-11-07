"use client";

import React from "react";
import { Card, Eyebrow, LoadingScreen, Pill, Screen, Title, display } from "../ui";

interface DayPlayerRevealProps {
  voteResult: {
    voteTally: Record<string, { name: string; votes: number; weightedVotes: number }>;
    voteDetails?: { voterName: string; targetName: string }[];
    accusedId: string | null;
    accusedName: string | null;
    accusedRole: string | null;
    tied: boolean;
    winner: string;
  } | null;
  myRole: "traitor" | "faithful" | null;
}

export default function DayPlayerReveal({ voteResult, myRole }: DayPlayerRevealProps) {
  if (!voteResult) return <LoadingScreen label="Counting votes" />;

  const { voteTally, accusedId, accusedName, accusedRole, tied, winner } = voteResult;
  const sorted = Object.entries(voteTally).sort(([, a], [, b]) => b.votes - a.votes);
  const max = sorted[0]?.[1].votes || 1;
  const loyalWin = winner === "faithful";
  const iWon = (myRole === "faithful" && loyalWin) || (myRole === "traitor" && !loyalWin);
  const wasDeceiver = accusedRole === "traitor";

  return (
    <Screen tone={loyalWin ? "loyal" : "deceiver"}>
      <div className="pt-4 text-center">
        {tied ? (
          <>
            <Eyebrow>The vote was tied</Eyebrow>
            <Title className="mt-3">Nobody was banished.</Title>
          </>
        ) : (
          <>
            <Eyebrow>The group banished</Eyebrow>
            <h1 className={`${display} mt-3 text-6xl leading-none text-white`}>{accusedName}</h1>
            <p className={`${display} mt-4 text-2xl italic ${wasDeceiver ? "text-rose-300" : "text-emerald-300"}`}>
              {wasDeceiver ? "who was a Deceiver." : "who was Loyal."}
            </p>
          </>
        )}
      </div>

      <Card tone={loyalWin ? "loyal" : "deceiver"} className="mt-10 text-center">
        <p className={`${display} text-3xl ${loyalWin ? "text-emerald-200" : "text-rose-200"}`}>
          {loyalWin ? "The Loyal win" : "The Deceivers win"}
        </p>
        {myRole && (
          <Pill tone={iWon ? "gold" : "neutral"} className="mt-3">
            {iWon ? "You won" : "You lost"}
          </Pill>
        )}
      </Card>

      <div className="mt-10">
        <Eyebrow className="mb-3">Votes</Eyebrow>
        <ul className="space-y-3">
          {sorted.map(([id, d]) => (
            <li key={id}>
              <div className="flex items-baseline justify-between text-[15px]">
                <span className={id === accusedId ? "text-white font-medium" : "text-white/70"}>{d.name}</span>
                <span className="tabular-nums text-white/45">{d.votes}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${id === accusedId ? "bg-[#E8C67A]" : "bg-white/25"}`}
                  style={{ width: `${(d.votes / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {voteResult.voteDetails && voteResult.voteDetails.length > 0 && (
        <div className="mt-10">
          <Eyebrow className="mb-3">Who voted for who</Eyebrow>
          <Card className="p-2">
            <ul className="divide-y divide-white/[0.06]">
              {voteResult.voteDetails.map((v, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span className="text-white/60">{v.voterName}</span>
                  <span className="text-white">{v.targetName}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </Screen>
  );
}
