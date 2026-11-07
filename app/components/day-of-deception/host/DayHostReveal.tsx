"use client";

import { useState } from "react";
import { Button, Card, Eyebrow, LoadingScreen, Screen, Title, display } from "../ui";

interface DayHostRevealProps {
  voteResult: {
    voteTally: Record<string, { name: string; votes: number; weightedVotes: number }>;
    voteDetails?: { voterName: string; targetName: string }[];
    accusedId: string | null;
    accusedName: string | null;
    accusedRole: string | null;
    tied: boolean;
    winner: string;
  } | null;
  onEndGame: () => Promise<void>;
}

export default function DayHostReveal({ voteResult, onEndGame }: DayHostRevealProps) {
  const [ending, setEnding] = useState(false);

  async function handleEndGame() {
    setEnding(true);
    try {
      await onEndGame();
    } catch {
      setEnding(false);
    }
  }

  if (!voteResult) return <LoadingScreen label="Counting votes" />;

  const { voteTally, accusedId, accusedName, accusedRole, tied, winner } = voteResult;
  const sorted = Object.entries(voteTally).sort(([, a], [, b]) => b.votes - a.votes);
  const max = sorted[0]?.[1].votes || 1;
  const loyalWin = winner === "faithful";
  const wasDeceiver = accusedRole === "traitor";

  return (
    <Screen wide tone={loyalWin ? "loyal" : "deceiver"}>
      <div className="pt-6 text-center">
        {tied ? (
          <>
            <Eyebrow>The vote was tied</Eyebrow>
            <Title size="xl" className="mt-3">
              Nobody was banished.
            </Title>
          </>
        ) : (
          <>
            <Eyebrow>The group banished</Eyebrow>
            <h1 className={`${display} mt-3 text-7xl md:text-8xl leading-none text-white`}>{accusedName}</h1>
            <p className={`${display} mt-4 text-3xl italic ${wasDeceiver ? "text-rose-300" : "text-emerald-300"}`}>
              {wasDeceiver ? "who was a Traitor." : "who was Faithful."}
            </p>
          </>
        )}
        <p className={`${display} mt-10 text-4xl ${loyalWin ? "text-emerald-200" : "text-rose-200"}`}>
          {loyalWin ? "The Faithful win." : "The Traitors win."}
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
        <Card>
          <Eyebrow className="mb-4">Votes</Eyebrow>
          <ul className="space-y-3">
            {sorted.map(([id, d]) => (
              <li key={id}>
                <div className="flex items-baseline justify-between text-[15px]">
                  <span className={id === accusedId ? "font-medium text-white" : "text-white/70"}>{d.name}</span>
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
        </Card>
        {voteResult.voteDetails && voteResult.voteDetails.length > 0 && (
          <Card>
            <Eyebrow className="mb-2">Who voted for who</Eyebrow>
            <ul className="divide-y divide-white/[0.06]">
              {voteResult.voteDetails.map((v, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-white/55">{v.voterName}</span>
                  <span className="text-white">{v.targetName}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="mt-10 text-center">
        <Button size="lg" className="min-w-56" onClick={handleEndGame} disabled={ending}>
          {ending ? "Wrapping up" : "Reveal every role"}
        </Button>
      </div>
    </Screen>
  );
}
