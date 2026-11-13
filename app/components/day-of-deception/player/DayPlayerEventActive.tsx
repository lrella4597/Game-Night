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
  timerRemaining: number;
  timerRunning: boolean;
}

/** Event content. The page wraps it in a Screen with the clue card below. */
// The same for every player. A Traitor's secret objective for this event is a
// mission inside My secret.
export default function DayPlayerEventActive({ eventData, timerRemaining, timerRunning }: DayPlayerEventActiveProps) {
  if (!eventData) {
    return <p className="py-20 text-center text-sm text-white/40">Loading the event</p>;
  }

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


    </>
  );
}
