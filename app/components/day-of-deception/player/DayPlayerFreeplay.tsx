"use client";

import React, { useEffect, useState } from "react";
import { Button, Card, Eyebrow, Icon, Pill, Title } from "../ui";
import { eventNameFromCategory } from "@/lib/day-of-deception/clueText";

interface Mission {
  id: string;
  missionText: string;
  missionCategory: string;
  isCompleted: boolean;
  createdAt?: string;
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
  const [error, setError] = useState<string | null>(null);
  const left = minutesLeft(mission.createdAt, now);
  const urgent = left !== null && left <= 5;
  const eventName = eventNameFromCategory(mission.missionCategory);

  return (
    <Card tone="deceiver" className="p-5">
      <div className="flex items-center justify-between gap-2">
        <Pill tone="deceiver" className={eventName ? "" : "capitalize"}>
          {eventName ? `Event objective · ${eventName}` : mission.missionCategory}
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
        <span className="text-xs text-white/40">Every 3 done earns a double vote</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || left === 0}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onComplete();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't save it. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Icon name="check" className="h-4 w-4" />
          {busy ? "Saving" : "Done it"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </Card>
  );
}

/** A Traitor's missions, with Done buttons. Only ever shown inside My secret. */
export function TraitorMissions({
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
      <p className="text-[15px] text-white/50">
        {MISSION_WINDOW_MIN} minutes each. Tap Done it when you have. Miss one and everyone learns what it was.
      </p>

      <div className="mt-4 space-y-3">
        {active.length === 0 ? (
          <Card className="py-6 text-center">
            <p className="text-[15px] text-white/60">No missions right now.</p>
            <p className="mt-1 text-sm text-white/35">You&apos;ll get a notification when one arrives.</p>
          </Card>
        ) : (
          active.map((m) => <MissionCard key={m.id} mission={m} now={now} onComplete={() => onCompleteMission(m.id)} />)
        )}
      </div>

      {done.length > 0 && (
        <div className="mt-3">
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

/**
 * Day phase content. The same for every player, so a glance at someone's
 * screen gives nothing away. Roles and missions live behind My secret.
 */
export default function DayPlayerFreeplay() {
  return (
    <>
      <Eyebrow>The day</Eyebrow>
      <Title className="mt-2">Keep your eyes open.</Title>
      <p className="mt-3 text-[15px] leading-relaxed text-white/55">
        The Traitors are doing secret missions in plain sight. Your clues say what they were told to do. Watch who does it.
      </p>
    </>
  );
}
