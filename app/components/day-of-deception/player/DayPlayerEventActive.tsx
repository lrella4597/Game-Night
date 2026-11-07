"use client";

import React from "react";
import { Card, Eyebrow, Icon, Timer, Title } from "../ui";

interface DayPlayerEventActiveProps {
  eventData: {
    eventName: string;
    instructions: string;
    durationMinutes: number;
    deceiverSecretMission?: string;
  } | null;
  role: "traitor" | "faithful" | null;
  timerRemaining: number;
  timerRunning: boolean;
}

/** Event content. The page wraps it in a Screen with the clue card below. */
export default function DayPlayerEventActive({ eventData, role, timerRemaining, timerRunning }: DayPlayerEventActiveProps) {
  if (!eventData) {
    return <p className="py-20 text-center text-sm text-white/40">Loading the event</p>;
  }
  const isDeceiver = role === "traitor";

  return (
    <>
      <div className="text-center">
        <Eyebrow className="!text-[#E8C67A]">Live event</Eyebrow>
        <Title className="mt-2">{eventData.eventName}</Title>
        <div className="mt-6">
          <Timer seconds={timerRemaining} running={timerRunning} label="Remaining" />
        </div>
      </div>

      <Card className="mt-8">
        <Eyebrow>How it works</Eyebrow>
        <p className="mt-2.5 text-[16px] leading-relaxed text-white/85">{eventData.instructions}</p>
        <p className="mt-4 flex items-center gap-2 text-sm text-[#E8C67A]/90">
          <Icon name="trophy" className="h-4 w-4" />
          Winners get a secret clue.
        </p>
      </Card>

      {isDeceiver && eventData.deceiverSecretMission && (
        <Card tone="deceiver" className="mt-3">
          <Eyebrow className="!text-rose-300/80">Your secret objective</Eyebrow>
          <p className="mt-2.5 text-[16px] leading-relaxed text-white">{eventData.deceiverSecretMission}</p>
        </Card>
      )}
    </>
  );
}
