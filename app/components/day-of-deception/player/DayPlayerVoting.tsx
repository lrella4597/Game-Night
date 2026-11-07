"use client";

import React from "react";
import { Avatar, Button, Emblem, Icon, Timer, Title } from "../ui";

interface DayPlayerVotingProps {
  players: { id: string; displayName: string; avatarColor: string }[];
  myPlayerId: string;
  selectedTarget: string | null;
  onSelectTarget: (id: string) => void;
  onSubmit: () => void;
  submitted: boolean;
  timerRemaining: number;
  timerRunning: boolean;
}

/** Voting content. The page wraps it in a Screen with the clue card below. */
export default function DayPlayerVoting({
  players,
  myPlayerId,
  selectedTarget,
  onSelectTarget,
  onSubmit,
  submitted,
  timerRemaining,
  timerRunning,
}: DayPlayerVotingProps) {
  const votable = players.filter((p) => p.id !== myPlayerId);
  const selected = votable.find((p) => p.id === selectedTarget);

  if (submitted) {
    return (
      <div className="pt-10 text-center">
        <Emblem tone="gold" icon="lock" size="lg" />
        <Title className="mt-6">Vote locked in.</Title>
        <p className="mt-2 text-[15px] text-white/50">Waiting for everyone else.</p>
        <div className="mt-8">
          <Timer seconds={timerRemaining} running={timerRunning} size="md" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <Title>Who&apos;s a Deceiver?</Title>
          <p className="mt-2 text-sm text-white/50">One vote. It can&apos;t be changed.</p>
        </div>
        <Timer seconds={timerRemaining} running={timerRunning} size="md" />
      </div>

      <ul className="mt-6 space-y-2">
        {votable.map((p) => {
          const on = selectedTarget === p.id;
          return (
            <li key={p.id}>
              <button
                onClick={() => onSelectTarget(p.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.99] ${
                  on ? "border-rose-400/60 bg-rose-500/10" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <Avatar name={p.displayName} color={p.avatarColor} />
                <span className={`flex-1 text-[16px] ${on ? "text-white font-medium" : "text-white/80"}`}>
                  {p.displayName}
                </span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                    on ? "border-rose-400 bg-rose-500 text-white" : "border-white/20"
                  }`}
                >
                  {on && <Icon name="check" className="h-3.5 w-3.5" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-4 mt-6 pb-[env(safe-area-inset-bottom)]">
        <Button variant="danger" size="lg" full disabled={!selected} onClick={onSubmit}>
          {selected ? `Vote for ${selected.displayName}` : "Pick someone"}
        </Button>
      </div>
    </>
  );
}
