"use client";

import { useState, useEffect, useCallback } from "react";

interface DayHostVotingProps {
  sessionId: string;
  onResolveVote: () => Promise<void>;
  timerRemaining: number;
  timerRunning: boolean;
}

interface VoteStatus {
  votedCount: number;
  totalVoters: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DayHostVoting({
  sessionId,
  onResolveVote,
  timerRemaining,
  timerRunning,
}: DayHostVotingProps) {
  const [resolving, setResolving] = useState(false);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>({
    votedCount: 0,
    totalVoters: 0,
  });

  const fetchVoteStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/day-of-deception/vote-status?sessionId=${sessionId}`
      );
      if (res.ok) {
        const data = await res.json();
        setVoteStatus({
          votedCount: data.votedCount ?? 0,
          totalVoters: data.totalVoters ?? 0,
        });
      }
    } catch {
      // Silently handle polling errors
    }
  }, [sessionId]);

  // Poll vote status every 3 seconds
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

  const isLowTime = timerRemaining <= 15 && timerRunning;
  const allVoted =
    voteStatus.totalVoters > 0 &&
    voteStatus.votedCount >= voteStatus.totalVoters;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#1a1f14]">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <svg
          className="w-16 h-16 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
          />
        </svg>
        <h1 className="text-3xl text-green-400 font-bold">
          Voting in Progress
        </h1>
      </div>

      {/* Timer */}
      <div className="mb-8 flex flex-col items-center">
        <div
          className={`text-6xl font-mono font-bold ${
            isLowTime ? "text-red-400 animate-pulse" : "text-white"
          }`}
        >
          {formatTime(timerRemaining)}
        </div>
        {!timerRunning && timerRemaining > 0 && (
          <p className="text-white/30 text-sm mt-2">Timer paused</p>
        )}
      </div>

      {/* Vote Progress */}
      <div className="mb-10 bg-white/5 rounded-xl border border-green-900/30 px-8 py-5 text-center">
        <p className="text-white text-lg font-semibold">
          <span className="text-green-400 text-3xl font-bold">
            {voteStatus.votedCount}
          </span>
          <span className="text-white/40 mx-2">/</span>
          <span className="text-white/60 text-3xl">
            {voteStatus.totalVoters}
          </span>
        </p>
        <p className="text-white/40 text-sm mt-2">votes submitted</p>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-white/5 rounded-full border border-white/10 overflow-hidden mt-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allVoted ? "bg-green-500" : "bg-green-600"
            }`}
            style={{
              width:
                voteStatus.totalVoters > 0
                  ? `${(voteStatus.votedCount / voteStatus.totalVoters) * 100}%`
                  : "0%",
            }}
          />
        </div>

        {allVoted && (
          <p className="text-green-400 text-sm font-medium mt-3">
            All votes are in!
          </p>
        )}
      </div>

      {/* Reveal Votes Button */}
      <button
        onClick={handleResolve}
        disabled={resolving}
        className="bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-4 px-10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
      >
        {resolving ? "Revealing..." : "Reveal Votes"}
      </button>
    </div>
  );
}
