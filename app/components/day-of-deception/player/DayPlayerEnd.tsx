"use client";

import React, { useEffect, useState } from "react";
import { formatClueText } from "@/lib/day-of-deception/clueText";
import Link from "next/link";
import { Card, Eyebrow, Icon, LoadingScreen, Pill, Screen, Title } from "../ui";

interface DayPlayerEndProps {
  endgameData: {
    winner: string;
    players: { id: string; displayName: string; role: string; shadowTokens: number }[];
  } | null;
  myRole: "traitor" | "faithful" | null;
  // Query string for /api/day-of-deception/recap
  recapQuery?: string;
}

export default function DayPlayerEnd({ endgameData, myRole, recapQuery }: DayPlayerEndProps) {
  const [recap, setRecap] = useState<{ at: string; text: string }[] | null>(null);
  useEffect(() => {
    if (!recapQuery) return;
    fetch(`/api/day-of-deception/recap?${recapQuery}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setRecap(d.items ?? []))
      .catch(() => setRecap([]));
  }, [recapQuery]);

  if (!endgameData) return <LoadingScreen label="Loading the results" />;

  const { winner, players } = endgameData;
  const loyalWin = winner === "faithful";
  const iWon = (myRole === "faithful" && loyalWin) || (myRole === "traitor" && !loyalWin);
  const deceivers = players.filter((p) => p.role === "traitor");
  const loyal = players.filter((p) => p.role !== "traitor");

  return (
    <Screen tone={loyalWin ? "loyal" : "deceiver"}>
      <div className="pt-4 text-center">
        <Eyebrow>Game over</Eyebrow>
        <Title size="xl" className={`mt-3 ${loyalWin ? "text-emerald-200" : "text-rose-200"}`}>
          {loyalWin ? "The Faithful win" : "The Traitors win"}
        </Title>
        {myRole && (
          <Pill tone={iWon ? "gold" : "neutral"} className="mt-4">
            {iWon ? "You won" : "You lost"}
          </Pill>
        )}
      </div>

      <Card tone="deceiver" className="mt-10">
        <Eyebrow className="!text-rose-300/80">The Traitors</Eyebrow>
        <ul className="mt-3 space-y-2.5">
          {deceivers.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-[15px]">
              <span className="flex items-center gap-2.5 text-white">
                <Icon name="dagger" className="h-4 w-4 text-rose-300/70" />
                {p.displayName}
              </span>
              <span className="text-xs text-white/40">
                {p.shadowTokens} mission{p.shadowTokens !== 1 ? "s" : ""} done
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card tone="loyal" className="mt-3">
        <Eyebrow className="!text-emerald-300/80">The Faithful</Eyebrow>
        <ul className="mt-3 flex flex-wrap gap-2">
          {loyal.map((p) => (
            <li key={p.id} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-sm text-white/80">
              {p.displayName}
            </li>
          ))}
        </ul>
      </Card>

      {recap && recap.length > 0 && (
        <Card className="mt-3">
          <Eyebrow>What really happened</Eyebrow>
          <ol className="mt-4 space-y-3 border-l border-white/10 pl-4">
            {recap.map((r, i) => (
              <li key={i} className="text-sm leading-snug text-white/75">
                <span className="mr-2 text-xs tabular-nums text-white/35">
                  {new Date(r.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
                {formatClueText(r.text)}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="mt-10 text-center">
        <p className="text-sm text-white/40">Thanks for playing.</p>
        <Link href="/day-of-deception" className="mt-3 inline-block text-sm font-medium text-[#E8C67A] hover:text-[#F1D597]">
          Back to my games
        </Link>
      </div>
    </Screen>
  );
}
