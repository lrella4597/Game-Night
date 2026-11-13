"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Icon, display } from "../ui";
import type { IconName } from "../ui";
import { formatClueText } from "@/lib/day-of-deception/clueText";

export interface Clue {
  id: string;
  kind: string;
  text: string;
  source: "event" | "tip" | "public";
  sourceLabel: string | null;
  createdAt: string;
}

interface PlayerLite {
  id: string;
  displayName: string;
  avatarColor?: string;
}

interface DayPlayerCluesProps {
  sessionId: string;
  playerId: string;
  playerToken: string;
  role: "traitor" | "faithful" | null;
  players: PlayerLite[];
  // Bump to refetch (live game changes)
  refreshKey: number;
}

const KIND_ICON: Record<string, IconName> = {
  mission_live: "eye",
  mission_done: "eye",
  mission_missed: "eye",
  event_objective: "trophy",
  mission_time: "clock",
  mission_count: "search",
};

function sourceLine(c: Clue): string {
  if (c.source === "event") return c.sourceLabel ? `Won in ${c.sourceLabel}. Only you got this.` : "Won in an event. Only you got this.";
  if (c.source === "public") return `Everyone got this. ${c.sourceLabel ?? "A Traitor missed a mission"}.`;
  return "Tip to everyone after an event.";
}

/**
 * The player's clues. The same for every player. Event clues are private:
 * what you share is up to you.
 */
export default function DayPlayerClues({ sessionId, playerId, playerToken, refreshKey }: DayPlayerCluesProps) {
  const [clues, setClues] = useState<Clue[] | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sessionId, playerId, token: playerToken });
      const res = await fetch(`/api/day-of-deception/my-clues?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setClues(data.clues);
    } catch {
      // Try again on the next refresh
    }
  }, [sessionId, playerId, playerToken]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return <CluesView clues={clues} />;
}

export function CluesView({ clues }: { clues: Clue[] | null }) {
  const count = clues?.length ?? 0;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <Icon name="search" className="h-4 w-4 text-[#E8C67A]" />
          <h2 className={`${display} text-2xl text-white`}>Clues</h2>
        </div>
        {count > 0 && <span className="text-xs tabular-nums text-white/40">{count}</span>}
      </div>

      {clues === null ? (
        <Card className="py-6 text-center text-sm text-white/35">Loading</Card>
      ) : count === 0 ? (
        <Card className="py-7 text-center">
          <p className="text-[15px] text-white/60">No clues yet.</p>
          <p className="mt-1 text-sm text-white/35">
Win an event for a private clue. Everyone gets a tip after each event.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {clues.map((c, i) => (
            <li key={c.id}>
              <Card tone={i === 0 ? "gold" : "neutral"} className="p-4">
                <div className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      i === 0 ? "bg-[#E8C67A]/15 text-[#E8C67A]" : "bg-white/[0.06] text-white/50"
                    }`}
                  >
                    <Icon name={KIND_ICON[c.kind] ?? "search"} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] leading-snug text-white">{formatClueText(c.text)}</p>
                    <p className="mt-1.5 text-xs text-white/40">{sourceLine(c)}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}
