"use client";

import { useState } from "react";
import type { LivePlayer } from "@/lib/live/types";
import PlayerAvatar from "@/app/components/live/shared/PlayerAvatar";

interface HostFinalRevealProps {
  players: LivePlayer[];
  revealOrder: string[];
  revealIndex: number;
  answer: string;
  onRevealNext: () => void;
  onJudge: (playerId: string, correct: boolean) => void;
  onEndGame: () => void;
}

type RevealStep = "name" | "wager" | "drawing" | "judged";

export default function HostFinalReveal({
  players,
  revealOrder,
  revealIndex,
  answer,
  onRevealNext,
  onJudge,
  onEndGame,
}: HostFinalRevealProps) {
  const [step, setStep] = useState<RevealStep>("name");
  const [judgedPlayers, setJudgedPlayers] = useState<Set<string>>(new Set());

  const currentPlayerId = revealIndex >= 0 && revealIndex < revealOrder.length ? revealOrder[revealIndex] : null;
  const currentPlayer = currentPlayerId ? players.find((p) => p.id === currentPlayerId) : null;
  const allRevealed = revealIndex >= revealOrder.length - 1 && step === "judged";

  function handleRevealWager() {
    setStep("wager");
  }

  function handleRevealDrawing() {
    setStep("drawing");
  }

  function handleJudge(correct: boolean) {
    if (!currentPlayerId || !currentPlayer) return;
    onJudge(currentPlayerId, correct);
    setJudgedPlayers((prev) => new Set([...prev, currentPlayerId]));
    setStep("judged");
  }

  function handleNext() {
    setStep("name");
    onRevealNext();
  }

  // Not started yet
  if (revealIndex < 0 || !currentPlayer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
        <h2 className="text-3xl font-bold text-[#FFD700]">Final Jeopardy - Reveal</h2>

        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 max-w-2xl w-full text-center mb-4">
          <p className="text-sm text-green-300 uppercase tracking-wider mb-2">Correct Response</p>
          <p className="text-2xl text-green-400 font-bold">{answer}</p>
        </div>

        <p className="text-blue-200">Ready to reveal player answers one by one</p>
        <button
          onClick={handleNext}
          className="px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
        >
          Begin Reveal
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
      <h2 className="text-2xl font-bold text-[#FFD700]">Final Jeopardy - Reveal</h2>

      {/* Correct answer reference */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 text-center">
        <span className="text-green-300 text-sm mr-2">Answer:</span>
        <span className="text-green-400 font-bold">{answer}</span>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2">
        {revealOrder.map((pid, idx) => (
          <div
            key={pid}
            className={`w-3 h-3 rounded-full ${
              idx < revealIndex
                ? "bg-white/50"
                : idx === revealIndex
                ? "bg-[#FFD700]"
                : "bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Current player reveal card */}
      <div className="bg-white/5 border-2 border-[#FFD700]/30 rounded-2xl p-8 max-w-lg w-full">
        {/* Always show name */}
        <div className="flex items-center gap-4 mb-6">
          <PlayerAvatar name={currentPlayer.displayName} color={currentPlayer.avatarColor} size="lg" />
          <div>
            <p className="text-2xl font-bold text-white">{currentPlayer.displayName}</p>
            <p className="text-blue-300">Score: ${currentPlayer.score.toLocaleString()}</p>
          </div>
        </div>

        {/* Wager (shown after reveal) */}
        {(step === "wager" || step === "drawing" || step === "judged") && (
          <div className="mb-4 p-4 bg-white/5 rounded-xl">
            <p className="text-sm text-blue-300 uppercase tracking-wider mb-1">Wager</p>
            <p className="text-3xl font-bold text-[#FFD700]">
              ${(currentPlayer.finalWager ?? 0).toLocaleString()}
            </p>
          </div>
        )}

        {/* Drawing (shown after reveal) */}
        {(step === "drawing" || step === "judged") && (
          <div className="mb-4">
            <p className="text-sm text-blue-300 uppercase tracking-wider mb-2">Their Answer</p>
            {currentPlayer.finalAnswerDrawing ? (
              <div className="rounded-xl overflow-hidden border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentPlayer.finalAnswerDrawing}
                  alt={`${currentPlayer.displayName}'s answer`}
                  className="w-full"
                />
              </div>
            ) : (
              <p className="text-white/50 italic">No drawing submitted</p>
            )}
            {currentPlayer.finalAnswerText && (
              <p className="text-white mt-2 text-lg text-center bg-white/5 rounded-lg p-2">
                {currentPlayer.finalAnswerText}
              </p>
            )}
          </div>
        )}

        {/* Action buttons based on step */}
        <div className="flex gap-3 mt-4">
          {step === "name" && (
            <button
              onClick={handleRevealWager}
              className="flex-1 py-3 rounded-xl font-bold bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all"
            >
              Reveal Wager
            </button>
          )}

          {step === "wager" && (
            <button
              onClick={handleRevealDrawing}
              className="flex-1 py-3 rounded-xl font-bold bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all"
            >
              Reveal Answer
            </button>
          )}

          {step === "drawing" && (
            <>
              <button
                onClick={() => handleJudge(true)}
                className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-500 text-white transition-all"
              >
                Correct
              </button>
              <button
                onClick={() => handleJudge(false)}
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                Incorrect
              </button>
            </>
          )}

          {step === "judged" && !allRevealed && (
            <button
              onClick={handleNext}
              className="flex-1 py-3 rounded-xl font-bold bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all"
            >
              Next Player
            </button>
          )}

          {allRevealed && (
            <button
              onClick={onEndGame}
              className="flex-1 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
            >
              Show Final Scores
            </button>
          )}
        </div>
      </div>

      {/* Previously revealed players */}
      {revealIndex > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          {revealOrder.slice(0, revealIndex).map((pid) => {
            const p = players.find((pl) => pl.id === pid);
            if (!p) return null;
            const wasCorrect = p.finalCorrect;
            return (
              <div
                key={pid}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  wasCorrect
                    ? "bg-green-500/10 border border-green-500/30"
                    : "bg-red-500/10 border border-red-500/30"
                }`}
              >
                <PlayerAvatar name={p.displayName} color={p.avatarColor} size="sm" />
                <span className="text-white">{p.displayName}</span>
                <span className={`font-bold ${wasCorrect ? "text-green-400" : "text-red-400"}`}>
                  ${p.score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
