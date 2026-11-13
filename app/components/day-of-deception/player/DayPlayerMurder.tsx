"use client";

import React, { useState } from "react";
import { Button, Card, Eyebrow } from "../ui";

export interface MurderState {
  status: string | null;
  victimName: string | null;
  myPick?: string | null;
  picks?: { traitorName: string; targetName: string | null }[];
  chosenName?: string | null;
}


/** Breakfast after a murder: everyone checks in, then the victim is revealed. */
export function BreakfastCard({
  title,
  breakfast,
  onCheckIn,
}: {
  title: string;
  breakfast: { checkedIn: boolean; waitingOn: number } | null;
  onCheckIn: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!breakfast) return null;
  return (
    <Card tone="gold" className="mb-6 p-5 text-center">
      <Eyebrow className="!text-[#E8C67A]">{title}</Eyebrow>
      <p className="mt-3 text-[17px] text-white">Someone was murdered. Who didn&apos;t make it?</p>
      {breakfast.checkedIn ? (
        <p className="mt-3 text-sm text-white/55">
          You&apos;re here. Waiting on {breakfast.waitingOn} more. The victim is revealed when everyone&apos;s in.
        </p>
      ) : (
        <Button
          full
          className="mt-4"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onCheckIn();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Try again");
              setBusy(false);
            }
          }}
        >
          I&apos;m here
        </Button>
      )}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </Card>
  );
}

/** Everyone: the latest murder, once the host has revealed it. */
export function MurderNews({ victimName, isMe }: { victimName: string | null; isMe: boolean }) {
  if (!victimName || isMe) return null;
  return (
    <Card className="mb-6 border-rose-400/20 p-4">
      <p className="text-[15px] text-white">
        <span className="mr-1">☠️</span>
        <span className="font-semibold">{victimName}</span> was murdered by the Traitors.
      </p>
    </Card>
  );
}

/** Shown to a player who's out: they can watch, not vote. */
export function OutBanner({ how }: { how: string | null }) {
  if (!how) return null;
  return (
    <Card tone="deceiver" className="mb-6 p-4">
      <p className="text-[15px] font-medium text-white">
        {how === "murdered" ? "You were murdered by the Traitors." : "You were banished."}
      </p>
      <p className="mt-1 text-sm text-white/55">
        You&apos;re out, so you can&apos;t vote. Stick around and watch it play out. No hints to anyone still in.
      </p>
    </Card>
  );
}

/** An event winner's dilemma: the shield for yourself, or a clue for everyone. */
export function RewardChoice({
  eventName,
  onChoose,
}: {
  eventName: string | null;
  onChoose: (choice: "shield" | "clue") => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!eventName) return null;

  async function choose(c: "shield" | "clue") {
    setBusy(true);
    setError(null);
    try {
      await onChoose(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again");
      setBusy(false);
    }
  }

  return (
    <Card tone="gold" className="mb-6 p-5">
      <Eyebrow className="!text-[#E8C67A]">You won {eventName}</Eyebrow>
      <p className="mt-3 text-[17px] leading-snug text-white">Yourself, or the team?</p>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        Everyone will know what you picked. Take the shield and people may wonder why you needed it.
      </p>
      <div className="mt-5 space-y-2">
        <Button full disabled={busy} onClick={() => choose("shield")}>
          🛡️ Take the shield
        </Button>
        <p className="px-1 text-xs text-white/45">Can&apos;t be banished or murdered until the next Roundtable is over.</p>
        <Button full variant="secondary" disabled={busy} onClick={() => choose("clue")} className="mt-2">
          📨 Give everyone a clue
        </Button>
        <p className="px-1 text-xs text-white/45">A real clue, sent to every player, with your name on it.</p>
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </Card>
  );
}

/** Who has the shield right now. Public, like the show. */
export function ShieldNews({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <p className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70">
      🛡️ <span className="text-white">{names.join(", ")}</span> {names.length === 1 ? "has" : "have"} the shield until the
      next Roundtable is over.
    </p>
  );
}
