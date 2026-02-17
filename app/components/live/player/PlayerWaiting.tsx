"use client";

import type { LivePlayer } from "@/lib/live/types";

interface PlayerWaitingProps {
  message: string;
  player?: LivePlayer;
}

export default function PlayerWaiting({ message, player }: PlayerWaitingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-blue-200">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        {message}
      </div>
      {player && (
        <p className="text-2xl font-bold text-[#FFD700] mt-4">
          ${player.score.toLocaleString()}
        </p>
      )}
    </div>
  );
}
