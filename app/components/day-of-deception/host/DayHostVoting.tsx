"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Eyebrow, Screen, Timer, Title } from "../ui";

interface DayHostVotingProps {
  sessionId: string;
  onResolveVote: () => Promise<void>;
  timerRemaining: number;
  timerRunning: boolean;
}

export default function DayHostVoting({ sessionId, onResolveVote, timerRemaining, timerRunning }: DayHostVotingProps) {
  const [resolving, setResolving] = useState(false);
  const [status, setStatus] = useState({ votedCount: 0, totalVoters: 0 });

  const fetchVoteStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/day-of-deception/vote-status?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setStatus({ votedCount: data.votedCount ?? 0, totalVoters: data.totalVoters ?? 0 });
      }
    } catch {
      // Keep polling
    }
  }, [sessionId]);

  useEffect(() => {
    fetchVoteStatus();
    const interval = setInterval(fetchVoteStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchVoteStatus]);

  async function handleResolve() {
    setResolving(true);
    try {
      await onResolveVote();
    } catch {
      setResolving(false);
    }
  }

  const { votedCount, totalVoters } = status;
  const allVoted = totalVoters > 0 && votedCount >= totalVoters;
  const pct = totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0;

  return (
    <Screen center wide tone="deceiver">
      <div className="mx-auto max-w-lg text-center">
        <Eyebrow>The vote is open</Eyebrow>
        <Title size="xl" className="mt-3">
          Who goes?
        </Title>
        <div className="mt-8">
          <Timer seconds={timerRemaining} running={timerRunning} size="lg" />
        </div>

        <div className="mt-10">
          <p className="text-5xl font-extralight tabular-nums text-white">
            {votedCount}
            <span className="text-white/30"> / {totalVoters}</span>
          </p>
          <p className="mt-2 text-sm text-white/45">{allVoted ? "Every vote is in" : "votes in"}</p>
          <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allVoted ? "bg-[#E8C67A]" : "bg-white/50"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <Button size="lg" className="mt-10 min-w-56" onClick={handleResolve} disabled={resolving}>
          {resolving ? "Counting" : "Reveal the result"}
        </Button>
      </div>
    </Screen>
  );
}
