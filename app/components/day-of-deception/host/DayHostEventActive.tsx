"use client";

import { useState } from "react";
import { Avatar, Button, Card, Eyebrow, Icon, LoadingScreen, Screen, Timer, Title, display } from "../ui";

interface DayHostEventActiveProps {
  eventData: {
    eventName: string;
    instructions: string;
    durationMinutes: number;
  } | null;
  players: { id: string; displayName: string; avatarColor: string }[];
  onEndEvent: (winnerIds: string[]) => Promise<void>;
  timerRemaining: number;
  timerRunning: boolean;
}

export default function DayHostEventActive({ eventData, players, onEndEvent, timerRemaining, timerRunning }: DayHostEventActiveProps) {
  const [ending, setEnding] = useState(false);
  const [picking, setPicking] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);

  async function handleEndEvent() {
    setEnding(true);
    try {
      await onEndEvent(winners);
    } catch {
      setEnding(false);
    }
  }

  function toggleWinner(id: string) {
    setWinners((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  }

  if (!eventData) return <LoadingScreen label="Loading the event" />;

  if (picking) {
    return (
      <Screen wide tone="gold">
        <div className="mx-auto max-w-2xl">
          <button onClick={() => setPicking(false)} className="text-sm text-white/45 hover:text-white">
            ← Back to the event
          </button>
          <Title className="mt-4">Who won?</Title>
          <p className="mt-2 text-[15px] text-white/55">
            Each winner gets a secret clue on their phone. One other random player gets an anonymous tip.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.map((p) => {
              const on = winners.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleWinner(p.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                    on ? "border-[#E8C67A] bg-[#E8C67A]/15 ring-1 ring-[#E8C67A]/40" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
                  <span className={`flex-1 truncate text-[15px] ${on ? "text-white" : "text-white/75"}`}>
                    {p.displayName}
                  </span>
                  {on && <Icon name="trophy" className="h-4 w-4 text-[#E8C67A]" />}
                </button>
              );
            })}
          </div>

          <div className="sticky bottom-4 mt-8 flex gap-2">
            <Button size="lg" full onClick={handleEndEvent} disabled={ending}>
              {ending
                ? "Handing out clues"
                : winners.length > 0
                  ? `Finish · ${winners.length} winner${winners.length !== 1 ? "s" : ""}`
                  : "Finish with no winner"}
            </Button>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen wide tone="gold">
      <div className="text-center pt-4">
        <Eyebrow className="!text-[#E8C67A]">Live event</Eyebrow>
        <h1 className={`${display} mt-3 text-5xl md:text-7xl leading-none text-white`}>{eventData.eventName}</h1>
        <div className="mt-8">
          <Timer seconds={timerRemaining} running={timerRunning} size="xl" />
        </div>
      </div>

      <Card className="mx-auto mt-10 max-w-2xl">
        <Eyebrow>How it works</Eyebrow>
        <p className="mt-3 text-lg leading-relaxed text-white/85 whitespace-pre-wrap">{eventData.instructions}</p>
        <p className="mt-4 flex items-center gap-2 text-sm text-[#E8C67A]/90">
          <Icon name="trophy" className="h-4 w-4" /> Winners get a secret clue.
        </p>
      </Card>

      <div className="mt-10 text-center">
        <Button size="lg" className="min-w-56" onClick={() => setPicking(true)}>
          End event and pick winners
        </Button>
      </div>
    </Screen>
  );
}
