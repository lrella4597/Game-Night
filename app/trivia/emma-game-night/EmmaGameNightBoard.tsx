"use client";

import { useMemo, useState } from "react";
import type { Question } from "@/app/data/boardData";
import { EMMA_GAME_NIGHT_BOARD } from "@/lib/boards/emmaGameNight";
import {
  createEmmaGameState,
  resolveEmmaClue,
  type EmmaGameState,
  type EmmaPlayer,
} from "@/lib/boards/emmaGameNightState";

export default function EmmaGameNightBoard() {
  const [gameState, setGameState] = useState<EmmaGameState>(createEmmaGameState);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [answerVisible, setAnswerVisible] = useState(false);

  const remaining = useMemo(
    () => 30 - gameState.usedQuestionIds.length,
    [gameState.usedQuestionIds.length]
  );

  function openQuestion(question: Question) {
    if (gameState.usedQuestionIds.includes(question.id)) return;
    setActiveQuestion(question);
    setAnswerVisible(false);
  }

  function resolveQuestion(winner: EmmaPlayer | null) {
    if (!activeQuestion) return;
    setGameState((current) =>
      resolveEmmaClue(current, activeQuestion.id, winner, activeQuestion.value)
    );
    setActiveQuestion(null);
    setAnswerVisible(false);
  }

  function resetBoard() {
    if (!window.confirm("Reset scores and reopen every clue?")) return;
    setGameState(createEmmaGameState());
    setActiveQuestion(null);
    setAnswerVisible(false);
  }

  return (
    <main className="min-h-screen bg-[#050934] text-white px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#FFD700]">
              Trivia Free-for-All
            </p>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              Emma&apos;s Game Night
            </h1>
            <p className="mt-1 text-sm text-blue-100">
              Six categories. Thirty clues. Prior-board energy, zero homework vibes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["luke", "emma"] as const).map((player) => (
              <div
                key={player}
                className="min-w-32 rounded-xl border border-blue-400/40 bg-blue-950/70 px-4 py-2 text-center"
              >
                <div className="text-xs font-bold uppercase tracking-widest text-blue-200">
                  {player}
                </div>
                <div className="text-2xl font-black text-[#FFD700]">
                  {gameState.scores[player].toLocaleString()}
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-blue-400/40 bg-blue-950/70 px-4 py-2 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-blue-200">
                Clues left
              </div>
              <div className="text-2xl font-black text-white">{remaining}</div>
            </div>
            <button
              onClick={resetBoard}
              className="rounded-xl border border-white/30 px-4 py-3 text-sm font-bold hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </header>

        <div className="overflow-x-auto rounded-xl">
          <section
            aria-label="Emma game-night trivia board"
            className="grid min-w-[900px] grid-cols-6 gap-1 bg-black p-1 shadow-2xl md:min-w-0"
          >
          {EMMA_GAME_NIGHT_BOARD.columns.map((column) => (
            <div
              key={column.id}
              className="flex min-h-20 items-center justify-center bg-[#060CE9] px-2 py-3 text-center text-[10px] font-black uppercase leading-tight text-white sm:text-xs md:text-sm lg:text-base"
            >
              {column.title}
            </div>
          ))}

          {EMMA_GAME_NIGHT_BOARD.rowValues.flatMap((value) =>
            EMMA_GAME_NIGHT_BOARD.columns.map((column) => {
              const question = column.questions.find((item) => item.value === value)!;
              const used = gameState.usedQuestionIds.includes(question.id);

              return (
                <button
                  key={question.id}
                  disabled={used}
                  onClick={() => openQuestion(question)}
                  aria-label={`${column.title} for ${value}${used ? ", used" : ""}`}
                  className={`flex min-h-20 items-center justify-center border-2 border-blue-700 text-lg font-black transition md:min-h-28 md:text-3xl ${
                    used
                      ? "cursor-default bg-[#07105c] text-transparent"
                      : "bg-[#060CE9] text-[#FFD700] hover:scale-[1.02] hover:bg-[#151cff]"
                  }`}
                >
                  {used ? "•" : value}
                </button>
              );
            })
          )}
          </section>
        </div>
      </div>

      {activeQuestion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Clue for ${activeQuestion.value}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <div className="w-full max-w-4xl rounded-2xl border-4 border-[#FFD700] bg-[#060CE9] p-6 text-center shadow-2xl md:p-10">
            <div className="mb-5 text-lg font-black text-[#FFD700] md:text-2xl">
              {activeQuestion.value} POINTS
            </div>
            <div className="mx-auto flex min-h-40 max-w-3xl items-center justify-center text-2xl font-bold leading-snug md:text-4xl">
              {activeQuestion.question}
            </div>

            {!answerVisible ? (
              <button
                onClick={() => setAnswerVisible(true)}
                className="mt-8 rounded-xl bg-[#FFD700] px-8 py-4 text-lg font-black text-[#050934] hover:bg-yellow-300"
              >
                Reveal Answer
              </button>
            ) : (
              <div className="mt-8">
                <div className="rounded-xl bg-[#050934] px-5 py-5 text-2xl font-black text-white md:text-4xl">
                  {activeQuestion.answer}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <button
                    onClick={() => resolveQuestion("emma")}
                    className="rounded-xl bg-pink-500 px-5 py-4 font-black hover:bg-pink-400"
                  >
                    Emma +{activeQuestion.value}
                  </button>
                  <button
                    onClick={() => resolveQuestion(null)}
                    className="rounded-xl border border-white/40 bg-white/10 px-5 py-4 font-black hover:bg-white/20"
                  >
                    No Score
                  </button>
                  <button
                    onClick={() => resolveQuestion("luke")}
                    className="rounded-xl bg-cyan-500 px-5 py-4 font-black text-[#050934] hover:bg-cyan-400"
                  >
                    Luke +{activeQuestion.value}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setActiveQuestion(null);
                setAnswerVisible(false);
              }}
              className="mt-5 text-sm font-bold text-blue-100 underline underline-offset-4 hover:text-white"
            >
              Back to board
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
