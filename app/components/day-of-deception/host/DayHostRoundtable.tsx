"use client";

import { useState } from "react";
import { Button, Emblem, Eyebrow, Screen, Timer, Title } from "../ui";

interface DayHostRoundtableProps {
  timerRemaining: number;
  timerRunning: boolean;
  onStartVoting: () => Promise<void>;
}

export default function DayHostRoundtable({ timerRemaining, timerRunning, onStartVoting }: DayHostRoundtableProps) {
  const [starting, setStarting] = useState(false);

  async function handleStartVoting() {
    setStarting(true);
    try {
      await onStartVoting();
    } catch {
      setStarting(false);
    }
  }

  return (
    <Screen center wide tone="gold">
      <div className="text-center">
        <Emblem tone="gold" icon="users" />
        <Eyebrow className="mt-6">The Roundtable</Eyebrow>
        <Title size="xl" className="mt-3">
          Make your case.
        </Title>
        <p className="mx-auto mt-4 max-w-md text-[17px] text-white/55">
          Share clues, accuse, defend. Start the vote when the talking is done.
        </p>
        <div className="mt-10">
          <Timer seconds={timerRemaining} running={timerRunning} size="xl" />
        </div>
        <Button size="lg" variant="danger" className="mt-10 min-w-56" onClick={handleStartVoting} disabled={starting}>
          {starting ? "Opening the vote" : "Start the vote"}
        </Button>
      </div>
    </Screen>
  );
}
