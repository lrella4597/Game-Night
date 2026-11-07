"use client";

import React, { useState } from "react";
import { Card, Emblem, Eyebrow, Icon, LoadingScreen, Screen, display } from "../ui";

interface DayPlayerRoleRevealProps {
  role: "traitor" | "faithful" | null;
  fellowDeceivers: { id: string; displayName: string }[];
  loading: boolean;
}

export default function DayPlayerRoleReveal({ role, fellowDeceivers, loading }: DayPlayerRoleRevealProps) {
  // Tap to reveal, so nobody glances at your screen first
  const [revealed, setRevealed] = useState(false);

  if (loading || role === null) return <LoadingScreen label="Handing out roles" />;

  const isDeceiver = role === "traitor";

  if (!revealed) {
    return (
      <Screen center>
        <button
          onClick={() => setRevealed(true)}
          className="group mx-auto flex w-full flex-col items-center rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-14 transition-colors hover:bg-white/[0.05]"
        >
          <Emblem tone="gold" icon="lock" size="lg" />
          <p className={`${display} mt-6 text-4xl text-white`}>Your role is ready</p>
          <p className="mt-2 text-sm text-white/50">Check nobody&apos;s looking, then tap to reveal.</p>
          <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#E8C67A] px-5 py-2.5 text-sm font-semibold text-[#18130A]">
            Reveal my role
          </span>
        </button>
      </Screen>
    );
  }

  return (
    <Screen tone={isDeceiver ? "deceiver" : "loyal"} center>
      <div className="text-center">
        <Emblem tone={isDeceiver ? "deceiver" : "loyal"} icon={isDeceiver ? "dagger" : "shield"} size="lg" />
        <Eyebrow className="mt-8">You are</Eyebrow>
        <h1
          className={`${display} mt-2 text-7xl leading-none ${isDeceiver ? "text-rose-300" : "text-emerald-300"}`}
        >
          {isDeceiver ? "Deceiver" : "Loyal"}
        </h1>
        <p className="mx-auto mt-5 max-w-xs text-[15px] leading-relaxed text-white/65">
          {isDeceiver
            ? "Do your secret missions within 30 minutes. Each one earns a fake tip. Survive the final vote."
            : "Win events to earn secret clues. Find the Deceivers. Vote them out at the Roundtable."}
        </p>
      </div>

      {isDeceiver && fellowDeceivers.length > 0 && (
        <Card tone="deceiver" className="mt-10">
          <Eyebrow className="!text-rose-300/70">Your fellow Deceivers</Eyebrow>
          <ul className="mt-3 space-y-2">
            {fellowDeceivers.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 text-[15px] text-white">
                <Icon name="dagger" className="h-4 w-4 text-rose-300/70" />
                {t.displayName}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!isDeceiver && (
        <p className="mt-10 text-center text-sm text-white/40">Trust no one completely.</p>
      )}

      <button
        onClick={() => setRevealed(false)}
        className="mx-auto mt-8 flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60"
      >
        <Icon name="eye" className="h-3.5 w-3.5" /> Hide
      </button>
    </Screen>
  );
}
