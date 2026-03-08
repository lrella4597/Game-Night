"use client";

import { useState, useEffect } from "react";
import type { LivePlayer } from "@/lib/live/types";
import PlayerAvatar from "@/app/components/live/shared/PlayerAvatar";

interface HostDailyDoubleProps {
  player: LivePlayer;
  categoryTitle: string;
  clueText: string;
  clueValue: number;
  answer: string;
  wager: number | null;
  phase: "daily_double_wager" | "daily_double_answer";
  onShowClue: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
}

export default function HostDailyDouble({
  player,
  categoryTitle,
  clueText,
  clueValue,
  answer,
  wager,
  phase,
  onShowClue,
  onCorrect,
  onIncorrect,
}: HostDailyDoubleProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  // Read the clue aloud when the answer phase begins
  useEffect(() => {
    if (phase !== "daily_double_answer" || !clueText || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clueText);
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    return () => { window.speechSynthesis.cancel(); };
  }, [phase, clueText]);

  // ── Wager phase ────────────────────────────────────────────────────────────

  if (phase === "daily_double_wager") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
        {/* Dramatic DD reveal */}
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-[#FFD700] animate-pulse mb-4">
            DAILY DOUBLE!
          </h1>
          <p className="text-blue-200 text-lg uppercase tracking-wider">{categoryTitle}</p>
          <p className="text-white/60 text-sm">${clueValue} clue</p>
        </div>

        {/* Assigned player */}
        <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4 border border-white/20">
          <PlayerAvatar name={player.displayName} color={player.avatarColor} size="lg" />
          <div>
            <p className="text-white font-bold text-xl">{player.displayName}</p>
            <p className="text-blue-300 text-sm">
              Current score: ${player.score.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Wager status */}
        {wager === null ? (
          <div className="text-center">
            <p className="text-yellow-300 text-lg animate-pulse">Waiting for wager...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-[#FFD700]/10 border border-[#FFD700]/40 rounded-xl p-6 text-center">
              <p className="text-[#FFD700] text-sm uppercase tracking-wider mb-1">Wager</p>
              <p className="text-4xl font-bold text-[#FFD700]">${wager.toLocaleString()}</p>
            </div>
            <button
              onClick={onShowClue}
              className="px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
            >
              Show Clue
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Answer phase ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
      {/* Category + value + wager context */}
      <div className="text-center">
        <p className="text-[#FFD700] text-sm uppercase tracking-wider mb-1">
          Daily Double &mdash; {categoryTitle}
        </p>
        <p className="text-white/60 text-sm">
          {player.displayName} wagered ${(wager ?? 0).toLocaleString()}
        </p>
      </div>

      {/* Clue text */}
      <div className="bg-[#060CE9] border-2 border-[#FFD700]/30 rounded-xl p-8 max-w-3xl w-full text-center">
        <p className="text-2xl md:text-3xl text-white leading-relaxed">{clueText}</p>
      </div>

      {/* Answer (host toggles) */}
      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          className="text-blue-300 hover:text-white text-sm underline transition-colors"
        >
          Show Answer
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-2xl w-full text-center">
            <p className="text-sm text-green-300 uppercase tracking-wider mb-1">Correct Response</p>
            <p className="text-2xl text-green-400 font-bold">{answer}</p>
          </div>
          <button
            onClick={() => setShowAnswer(false)}
            className="text-white/40 hover:text-white/70 text-xs underline transition-colors"
          >
            Hide Answer
          </button>
        </div>
      )}

      {/* Player being judged */}
      <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 border border-white/10">
        <PlayerAvatar name={player.displayName} color={player.avatarColor} size="md" />
        <span className="text-white font-medium">{player.displayName}</span>
      </div>

      {/* Judge buttons */}
      <div className="flex gap-4">
        <button
          onClick={onCorrect}
          className="px-8 py-4 rounded-xl font-bold text-xl bg-green-600 hover:bg-green-500 text-white transition-all shadow-lg"
        >
          Correct
        </button>
        <button
          onClick={onIncorrect}
          className="px-8 py-4 rounded-xl font-bold text-xl bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg"
        >
          Incorrect
        </button>
      </div>
    </div>
  );
}
