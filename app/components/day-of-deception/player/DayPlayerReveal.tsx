"use client";

import React, { useState } from "react";
import { Button, Card, Emblem, Eyebrow, Screen, Title, display } from "../ui";

export interface RevealState {
  step: "boards" | "tie" | "banished" | "role" | "endgame";
  myVote: string | null;
  accusedId: string | null;
  accusedName: string | null;
  accusedRole: string | null;
  tally: { name: string; votes: number }[];
  votes: { voterName: string; targetName: string }[];
  iAmAccused: boolean;
}

interface DayPlayerRevealProps {
  reveal: RevealState | null;
  myRole: "traitor" | "faithful" | null;
  onRevealRole: () => Promise<void>;
  // The endgame: end it, or banish again. Null for players who are out.
  endgameVote?: { mine: string | null; voted: number; voters: number } | null;
  onEndgameVote?: (vote: "end" | "banish") => Promise<void>;
}

/**
 * The reveal, run like the show:
 *   1. boards    your vote, big, to hold up when it's your turn
 *   2. banished  who's going, and everyone's votes. Their role stays hidden
 *   3. role      the banished player revealed it themselves
 */
export default function DayPlayerReveal({ reveal, onRevealRole, endgameVote, onEndgameVote }: DayPlayerRevealProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function vote(v: "end" | "banish") {
    if (!onEndgameVote) return;
    setBusy(true);
    setError(null);
    try {
      await onEndgameVote(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  if (!reveal) {
    return (
      <Screen center>
        <p className="text-center text-sm text-white/40">Loading the reveal</p>
      </Screen>
    );
  }

  if (reveal.step === "boards") {
    return (
      <Screen center>
        <div className="text-center">
          <Eyebrow>When it&apos;s your turn, hold this up</Eyebrow>
          <div className="mx-auto mt-6 rounded-3xl border-4 border-[#3b3428] bg-[#1d2a22] px-6 py-14 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">I voted for</p>
            <p className={`${display} mt-4 break-words text-6xl leading-none text-white/90`} style={{ fontStyle: "italic" }}>
              {reveal.myVote ?? "No one"}
            </p>
          </div>
          <p className="mt-6 text-[15px] text-white/50">Say who, and why. The host counts once everyone has gone.</p>
        </div>
      </Screen>
    );
  }

  if (reveal.step === "endgame") {
    return (
      <Screen center>
        <div className="text-center">
          <Eyebrow>The endgame</Eyebrow>
          <Title className="mt-3">End it here, or banish again?</Title>
          <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-white/55">
            If everyone votes to end and a Traitor is still among you, the Traitors win. One vote to banish and you go
            again.
          </p>
          {!endgameVote ? (
            <p className="mt-10 text-sm text-white/40">You&apos;re out. Watch them decide.</p>
          ) : endgameVote.mine ? (
            <p className="mt-10 text-[15px] text-white/70">
              You voted to {endgameVote.mine === "end" ? "end the game" : "banish again"}. {endgameVote.voted} of{" "}
              {endgameVote.voters} in.
            </p>
          ) : (
            <div className="mt-10 space-y-2">
              <Button size="lg" full disabled={busy} onClick={() => vote("end")}>
                End the game
              </Button>
              <Button size="lg" full variant="secondary" disabled={busy} onClick={() => vote("banish")}>
                Banish again
              </Button>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        </div>
      </Screen>
    );
  }

  if (reveal.step === "tie") {
    return (
      <Screen center>
        <div className="text-center">
          <Emblem tone="gold" icon="vote" size="lg" />
          <Title className="mt-6">It&apos;s a tie.</Title>
          <p className="mt-2 text-[15px] text-white/50">Talk it out. The host will call a revote.</p>
          <TallyList tally={reveal.tally} />
        </div>
      </Screen>
    );
  }

  if (reveal.step === "banished" && reveal.iAmAccused) {
    return (
      <Screen center>
        <div className="text-center">
          <Eyebrow className="!text-rose-300/80">You&apos;ve been banished</Eyebrow>
          <Title className="mt-3">Say your piece.</Title>
          <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-white/55">
            Stand up. When you&apos;re ready, tell everyone who you really are, then tap to show it on every phone.
          </p>
          {!confirming ? (
            <Button size="lg" full className="mt-10" onClick={() => setConfirming(true)}>
              Reveal who I am
            </Button>
          ) : (
            <div className="mt-10 space-y-2">
              <Button
                size="lg"
                full
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await onRevealRole();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Try again");
                    setBusy(false);
                  }
                }}
              >
                Show everyone now
              </Button>
              <Button full variant="ghost" onClick={() => setConfirming(false)}>
                Not yet
              </Button>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        </div>
      </Screen>
    );
  }

  if (reveal.step === "banished") {
    return (
      <Screen center>
        <div className="text-center">
          <Eyebrow>Banished</Eyebrow>
          <Title size="xl" className="mt-3">
            {reveal.accusedName}
          </Title>
          <p className="mt-3 text-[15px] text-white/50">Bring them up. Traitor or Faithful? They&apos;ll reveal it.</p>
        </div>
        <TallyList tally={reveal.tally} />
        <VoteList votes={reveal.votes} />
      </Screen>
    );
  }

  const wasTraitor = reveal.accusedRole === "traitor";
  return (
    <Screen center tone={wasTraitor ? "deceiver" : "loyal"}>
      <div className="text-center">
        <Emblem tone={wasTraitor ? "deceiver" : "loyal"} icon={wasTraitor ? "dagger" : "shield"} size="lg" />
        <Title size="xl" className={`mt-6 ${wasTraitor ? "text-rose-200" : "text-emerald-200"}`}>
          {reveal.accusedName} was {wasTraitor ? "a Traitor" : "Faithful"}.
        </Title>
        <p className="mt-3 text-[15px] text-white/50">
          {wasTraitor ? "One down." : "The Traitors are still among you."} The host will take it from here.
        </p>
      </div>
      <VoteList votes={reveal.votes} />
    </Screen>
  );
}

function TallyList({ tally }: { tally: { name: string; votes: number }[] }) {
  if (tally.length === 0) return null;
  return (
    <Card className="mt-8 p-4">
      <ul className="space-y-1.5">
        {tally.map((t) => (
          <li key={t.name} className="flex justify-between text-[15px] text-white/80">
            <span>{t.name}</span>
            <span className="tabular-nums text-white/50">
              {t.votes} vote{t.votes !== 1 ? "s" : ""}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function VoteList({ votes }: { votes: { voterName: string; targetName: string }[] }) {
  if (votes.length === 0) return null;
  return (
    <Card className="mt-3 p-4">
      <Eyebrow className="mb-2">Who voted for whom</Eyebrow>
      <ul className="space-y-1 text-sm text-white/60">
        {votes.map((v) => (
          <li key={v.voterName}>
            {v.voterName} → <span className="text-white/85">{v.targetName}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
