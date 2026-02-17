"use client";

import type { LivePlayer, BuzzerEntry } from "@/lib/live/types";
import PlayerAvatar from "@/app/components/live/shared/PlayerAvatar";

interface HostBuzzerPhaseProps {
  players: LivePlayer[];
  buzzerQueue: BuzzerEntry[];
  currentAnswererId: string | null;
  clueValue: number;
  onSelectAnswerer: (playerId: string) => void;
  onCorrect: () => void;
  onIncorrect: () => void;
  onSkip: () => void;
}

export default function HostBuzzerPhase({
  players,
  buzzerQueue,
  currentAnswererId,
  clueValue,
  onSelectAnswerer,
  onCorrect,
  onIncorrect,
  onSkip,
}: HostBuzzerPhaseProps) {
  const answerer = players.find((p) => p.id === currentAnswererId);

  // Sort buzzer queue by timestamp
  const sortedQueue = [...buzzerQueue].sort((a, b) => a.timestamp - b.timestamp);

  if (currentAnswererId && answerer) {
    // Someone is answering — show Correct / Incorrect
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <p className="text-blue-300 text-lg">Answering for ${clueValue}:</p>
        <div className="flex items-center gap-4">
          <PlayerAvatar name={answerer.displayName} color={answerer.avatarColor} size="lg" />
          <span className="text-white text-3xl font-bold">{answerer.displayName}</span>
        </div>
        <div className="flex gap-6 mt-4">
          <button
            onClick={onCorrect}
            className="px-10 py-5 rounded-xl font-bold text-2xl bg-green-500 text-white hover:bg-green-400 transition-all shadow-lg"
          >
            Correct
          </button>
          <button
            onClick={onIncorrect}
            className="px-10 py-5 rounded-xl font-bold text-2xl bg-red-500 text-white hover:bg-red-400 transition-all shadow-lg"
          >
            Incorrect
          </button>
        </div>
      </div>
    );
  }

  // No answerer yet — show buzzer queue or waiting
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <p className="text-[#FFD700] text-2xl font-bold">Buzzer is OPEN</p>
      <p className="text-blue-300">Waiting for players to buzz in...</p>

      {sortedQueue.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          <p className="text-sm text-blue-400">Buzz order:</p>
          {sortedQueue.map((entry, idx) => {
            const player = players.find((p) => p.id === entry.playerId);
            if (!player) return null;
            return (
              <button
                key={entry.playerId}
                onClick={() => onSelectAnswerer(entry.playerId)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
              >
                <span className="text-[#FFD700] font-bold">{idx + 1}.</span>
                <PlayerAvatar name={player.displayName} color={player.avatarColor} size="sm" />
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={onSkip}
        className="mt-8 px-6 py-3 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-all"
      >
        No One Buzzed — Skip
      </button>
    </div>
  );
}
