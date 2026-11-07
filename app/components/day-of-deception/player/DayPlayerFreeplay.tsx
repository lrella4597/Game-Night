"use client";

import React, { useEffect, useState } from "react";
import { Button, Card, Eyebrow, Icon, Pill, Title } from "../ui";

interface Mission {
  id: string;
  missionText: string;
  missionCategory: string;
  isCompleted: boolean;
  createdAt?: string;
}

interface DayPlayerFreeplayProps {
  role: "traitor" | "faithful" | null;
  missions: Mission[];
  onCompleteMission: (missionId: string, proof?: string) => Promise<void>;
}

// Matches MISSION_WINDOW_MS on the server
const MISSION_WINDOW_MIN = 30;

function minutesLeft(createdAt: string | undefined, now: number): number | null {
  if (!createdAt) return null;
  const left = MISSION_WINDOW_MIN - (now - new Date(createdAt).getTime()) / 60000;
  return Math.max(0, Math.ceil(left));
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function MissionCard({ mission, onComplete, now }: { mission: Mission; onComplete: () => Promise<void>; now: number }) {
  const [busy, setBusy] = useState(false);
  const left = minutesLeft(mission.createdAt, now);
  const urgent = left !== null && left <= 5;

  return (
    <Card tone="deceiver" className="p-5">
      <div className="flex items-center justify-between gap-2">
        <Pill tone="deceiver" className="capitalize">
          {mission.missionCategory}
        </Pill>
        {left !== null && (
          <Pill tone={urgent ? "deceiver" : "neutral"} className={urgent ? "animate-pulse" : ""}>
            <Icon name="clock" className="h-3 w-3" />
            {left > 0 ? `${left} min left` : "Time's up"}
          </Pill>
        )}
      </div>
      <p className="mt-4 text-[17px] leading-relaxed text-white">{mission.missionText}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-white/40">Earns 1 fake tip</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || left === 0}
          onClick={async () => {
            setBusy(true);
            try {
              await onComplete();
            } finally {
              setBusy(false);
            }
          }}
        >
          <Icon name="check" className="h-4 w-4" />
          {busy ? "Saving" : "Done it"}
        </Button>
      </div>
    </Card>
  );
}

function DeceiverView({
  missions,
  onCompleteMission,
}: {
  missions: Mission[];
  onCompleteMission: (missionId: string, proof?: string) => Promise<void>;
}) {
  const now = useNow(30000);
  const [showDone, setShowDone] = useState(false);
  const active = missions.filter((m) => !m.isCompleted);
  const done = missions.filter((m) => m.isCompleted);

  return (
    <>
      <Eyebrow className="!text-rose-300/80">Deceiver</Eyebrow>
      <Title className="mt-2">Your missions</Title>
      <p className="mt-2 text-[15px] text-white/50">
        {MISSION_WINDOW_MIN} minutes each. Miss one and everyone gets a clue. Be subtle.
      </p>

      <div className="mt-6 space-y-3">
        {active.length === 0 ? (
          <Card className="text-center py-8">
            <Icon name="bell" className="mx-auto h-6 w-6 text-white/30" />
            <p className="mt-3 text-[15px] text-white/60">No missions right now.</p>
            <p className="mt-1 text-sm text-white/35">You&apos;ll get a notification when one arrives.</p>
          </Card>
        ) : (
          active.map((m) => (
            <MissionCard key={m.id} mission={m} now={now} onComplete={() => onCompleteMission(m.id)} />
          ))
        )}
      </div>

      {done.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowDone((s) => !s)}
            className="flex w-full items-center justify-between px-1 py-2 text-sm text-white/45 hover:text-white/70"
          >
            <span>Completed ({done.length})</span>
            <span className="text-xs">{showDone ? "Hide" : "Show"}</span>
          </button>
          {showDone && (
            <ul className="mt-1 space-y-2">
              {done.map((m) => (
                <li key={m.id} className="flex gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/40">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/70" />
                  <span className="line-through decoration-white/20">{m.missionText}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

function LoyalView() {
  return (
    <>
      <Eyebrow className="!text-emerald-300/80">Loyal</Eyebrow>
      <Title className="mt-2">Keep your eyes open.</Title>
      <p className="mt-3 text-[15px] leading-relaxed text-white/55">
        Deceivers are doing secret missions all day. Notice who acts a little off, win events to earn clues,
        and remember: anonymous tips can be fake.
      </p>
    </>
  );
}

/** Day phase content. The page wraps it in a Screen with the clue card below. */
export default function DayPlayerFreeplay({ role, missions, onCompleteMission }: DayPlayerFreeplayProps) {
  return role === "traitor" ? <DeceiverView missions={missions} onCompleteMission={onCompleteMission} /> : <LoyalView />;
}
