"use client";

import React from "react";
import { Emblem, Eyebrow, Timer, Title } from "../ui";

interface DayPlayerRoundtableProps {
  timerRemaining: number;
  timerRunning: boolean;
}

/** Roundtable content. The page wraps it in a Screen with the clue card below. */
export default function DayPlayerRoundtable({ timerRemaining, timerRunning }: DayPlayerRoundtableProps) {
  return (
    <div className="text-center pt-2">
      <Emblem tone="gold" icon="users" />
      <Eyebrow className="mt-6">The Roundtable</Eyebrow>
      <Title className="mt-2">Make your case.</Title>
      <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-white/55">
        Share your clues, or keep them close. Voting opens when the host says so.
      </p>
      <div className="mt-8">
        <Timer seconds={timerRemaining} running={timerRunning} label="Discussion" />
      </div>
    </div>
  );
}
