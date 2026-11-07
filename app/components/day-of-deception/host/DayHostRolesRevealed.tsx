"use client";

import { useState } from "react";
import { Button, Emblem, Eyebrow, Screen, Title } from "../ui";

interface DayHostRolesRevealedProps {
  onBeginDay: () => Promise<void>;
  playerCount: number;
}

export default function DayHostRolesRevealed({ onBeginDay, playerCount }: DayHostRolesRevealedProps) {
  const [starting, setStarting] = useState(false);

  async function handleBeginDay() {
    setStarting(true);
    try {
      await onBeginDay();
    } catch {
      setStarting(false);
    }
  }

  return (
    <Screen center wide>
      <div className="mx-auto max-w-lg text-center">
        <Emblem tone="gold" icon="mask" size="lg" />
        <Eyebrow className="mt-8">{playerCount} players</Eyebrow>
        <Title size="xl" className="mt-3">
          Roles are out.
        </Title>
        <p className="mx-auto mt-5 max-w-sm text-[17px] leading-relaxed text-white/55">
          Everyone is checking their phone. When the room settles, start the day. Missions start flowing to the
          Deceivers right away.
        </p>
        <Button size="lg" className="mt-10 min-w-56" onClick={handleBeginDay} disabled={starting}>
          {starting ? "Starting" : "Begin the day"}
        </Button>
      </div>
    </Screen>
  );
}
