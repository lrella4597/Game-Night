"use client";

import Link from "next/link";
import { Card, Eyebrow, Icon, LoadingScreen, Screen, Title } from "../ui";

interface DayHostEndProps {
  endgameData: {
    winner: string;
    players: { id: string; displayName: string; role: string; shadowTokens: number }[];
  } | null;
}

export default function DayHostEnd({ endgameData }: DayHostEndProps) {
  if (!endgameData) return <LoadingScreen label="Loading the results" />;

  const deceivers = endgameData.players.filter((p) => p.role === "traitor");
  const loyal = endgameData.players.filter((p) => p.role !== "traitor");
  const loyalWin = endgameData.winner === "faithful";
  const totalMissions = endgameData.players.reduce((sum, p) => sum + (p.shadowTokens ?? 0), 0);

  return (
    <Screen wide tone={loyalWin ? "loyal" : "deceiver"}>
      <div className="pt-6 text-center">
        <Eyebrow>Game over</Eyebrow>
        <Title size="xl" className={`mt-3 ${loyalWin ? "text-emerald-200" : "text-rose-200"}`}>
          {loyalWin ? "The Faithful win." : "The Traitors win."}
        </Title>
        <p className="mt-4 text-white/50">
          {totalMissions} secret mission{totalMissions !== 1 ? "s" : ""} pulled off today.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
        <Card tone="deceiver">
          <Eyebrow className="!text-rose-300/80">The Traitors</Eyebrow>
          <ul className="mt-4 space-y-3">
            {deceivers.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-lg text-white">
                  <Icon name="dagger" className="h-4 w-4 text-rose-300/70" />
                  {p.displayName}
                </span>
                <span className="text-sm text-white/45">
                  {p.shadowTokens} mission{p.shadowTokens !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card tone="loyal">
          <Eyebrow className="!text-emerald-300/80">The Faithful</Eyebrow>
          <ul className="mt-4 flex flex-wrap gap-2">
            {loyal.map((p) => (
              <li key={p.id} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-sm text-white/80">
                {p.displayName}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <Link href="/day-of-deception" className="text-sm font-medium text-[#E8C67A] hover:text-[#F1D597]">
          Back to my games
        </Link>
      </div>
    </Screen>
  );
}
