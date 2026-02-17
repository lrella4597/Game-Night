"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Question, Category } from "../data/boardData";
import type { Team } from "../data/teams";
import type { GameSettings } from "../data/gameSettings";
import { useFavorites } from "@/lib/data/useFavorites";
import { useFactCheckCache, type FactCheckResult } from "@/lib/data/useFactCheckCache";
import { usePlayerStats } from "@/lib/data/usePlayerStats";
import { useGenerationState } from "@/lib/data/useGenerationState";
import { pointValueToDifficulty } from "@/lib/prompts/clueGenerationPrompt";
import { apiFetch, handleApiError } from "@/lib/utils/apiErrorHandler";
import type { SoundEffect } from "@/lib/audio/useSoundEffects";

interface QuestionModalProps {
  question: Question;
  category: Category;
  onMarkUsed: (questionId: string) => void;
  onClose: () => void;
  assembledPrompt?: string;
  onRefreshQuestion?: (id: string, question: string, answer: string) => void;
  onRefreshError?: (message: string) => void;
  teams?: Team[];
  questionTimerSeconds?: number;
  stealTimerSeconds?: number;
  onAwardPoints?: (teamId: string, delta: number, playerName: string | null) => void;
  aiMode?: boolean;
  gameSettings?: GameSettings | null;
  playSound?: (sound: SoundEffect) => void;
}

type TimerPhase = "question" | "steal" | "stopped";

// ── Verdict helpers ──────────────────────────────────────────────────────────

const VERDICT_META = {
  likely_correct:   { label: "Likely Correct",   bg: "rgba(34,197,94,0.2)",  border: "#22c55e", color: "#86efac" },
  uncertain:        { label: "Uncertain",         bg: "rgba(245,158,11,0.2)", border: "#f59e0b", color: "#fcd34d" },
  likely_incorrect: { label: "Likely Incorrect",  bg: "rgba(239,68,68,0.2)",  border: "#ef4444", color: "#fca5a5" },
};

export default function QuestionModal({
  question,
  category,
  onMarkUsed,
  onClose,
  assembledPrompt,
  onRefreshQuestion,
  onRefreshError,
  teams = [],
  questionTimerSeconds = 45,
  stealTimerSeconds = 10,
  onAwardPoints,
  aiMode = true,
  gameSettings = null,
  playSound,
}: QuestionModalProps) {

  // ── Hooks ────────────────────────────────────────────────────────────────────
  const { recordPlayerAnswer } = usePlayerStats();
  const { isFavorite, addFavorite, removeFavoriteByContent } = useFavorites();
  const { getCachedFactCheck, cacheFactCheck } = useFactCheckCache();
  const { addFavorite: addFavoriteToGenState, addDislike, addToSeen } = useGenerationState();

  // ── Display state ────────────────────────────────────────────────────────────
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [displayQuestion, setDisplayQuestion] = useState(question.question);
  const [displayAnswer, setDisplayAnswer] = useState(question.answer);
  const [refreshing, setRefreshing] = useState(false);

  // ── Timer ────────────────────────────────────────────────────────────────────
  const [timerPhase, setTimerPhase] = useState<TimerPhase>("question");
  const [secondsLeft, setSecondsLeft] = useState(questionTimerSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!running || timerPhase === "stopped") { clearTimer(); return; }
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearTimer(); setRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return clearTimer;
  }, [running, timerPhase, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  function handlePausePlay() { if (timerPhase !== "stopped") setRunning((r) => !r); }
  function handleResetTimer() {
    clearTimer();
    setSecondsLeft(timerPhase === "steal" ? stealTimerSeconds : questionTimerSeconds);
    setRunning(true);
  }
  function handleSteal() {
    clearTimer();
    setTimerPhase("steal");
    setSecondsLeft(stealTimerSeconds);
    setRunning(true);
  }

  const timerColor = secondsLeft <= 5 ? "#ef4444" : secondsLeft <= 10 ? "#f59e0b" : "#FFD700";

  // ── Award points ─────────────────────────────────────────────────────────────
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null;

  // Calculate points based on point mode setting
  const pointValue = gameSettings?.pointMode === "flat"
    ? (gameSettings.flatPointValue || 100)
    : question.value;

  function togglePlayer(playerName: string) {
    setSelectedPlayers((prev) =>
      prev.includes(playerName)
        ? prev.filter((p) => p !== playerName)
        : [...prev, playerName]
    );
  }

  function createConfetti() {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE"];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti-piece";
      confetti.style.left = Math.random() * 100 + "vw";
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 0.3 + "s";
      confetti.style.animationDuration = 2 + Math.random() * 2 + "s";
      confetti.style.opacity = "1";

      document.body.appendChild(confetti);

      setTimeout(() => {
        confetti.remove();
      }, 5000);
    }
  }

  function handleAward(correct: boolean) {
    if (!onAwardPoints) return;
    if (!selectedTeamId) { onRefreshError?.("Select a team before awarding points."); return; }

    // Play sound effect
    playSound?.(correct ? "correct" : "incorrect");

    // Trigger confetti on correct answer
    if (correct) {
      createConfetti();
    }

    // Award team points (full value)
    onAwardPoints(selectedTeamId, correct ? pointValue : -pointValue, null);

    // Record individual player stats (split points)
    if (selectedPlayers.length > 0) {
      const pointsPerPlayer = (correct ? pointValue : -pointValue) / selectedPlayers.length;
      selectedPlayers.forEach((playerName) => {
        recordPlayerAnswer(
          playerName,
          selectedTeamId,
          selectedTeam?.name || "",
          question.id,
          displayQuestion,
          category.title,
          correct,
          pointsPerPlayer,
          undefined, // powerUpUsed - would need to track which power-up is active
          undefined  // gameSessionId - would need game session tracking
        );
      });
    }

    onMarkUsed(question.id);
    onClose();
  }

  // ── Favorites ────────────────────────────────────────────────────────────────
  const [favored, setFavored] = useState(() => isFavorite(category.title, question.question, question.answer));

  async function handleFavoriteToggle() {
    if (favored) {
      await removeFavoriteByContent(category.title, displayQuestion, displayAnswer);
      setFavored(false);
    } else {
      await addFavorite(category.title, displayQuestion, displayAnswer, question.value);
      setFavored(true);

      // Also add to generation state for AI style learning
      await addFavoriteToGenState({
        question: displayQuestion,
        answer: displayAnswer,
        category: category.title,
        difficulty: pointValueToDifficulty(question.value),
      });
    }
  }

  // ── Dislike/Reject ───────────────────────────────────────────────────────────
  const [disliked, setDisliked] = useState(false);

  async function handleDislike() {
    if (disliked) return; // Already disliked

    await addDislike({
      question: displayQuestion,
      answer: displayAnswer,
      category: category.title,
      reason: "User rejected",
    });

    setDisliked(true);

    // Optionally trigger a refresh immediately
    if (onRefreshQuestion && assembledPrompt) {
      setTimeout(() => handleRefresh(), 500);
    }
  }

  // ── Fact check ───────────────────────────────────────────────────────────────
  const [factChecking, setFactChecking] = useState(false);
  const [factResult, setFactResult] = useState<FactCheckResult | null>(() =>
    getCachedFactCheck(question.question, question.answer) ?? null
  );
  const [factError, setFactError] = useState<string | null>(null);
  const [factExpanded, setFactExpanded] = useState(!!getCachedFactCheck(question.question, question.answer));

  // ── Debug mode ───────────────────────────────────────────────────────────────
  const [debugAI, setDebugAI] = useState(false);

  async function handleFactCheck(force = false) {
    if (factChecking) return;
    if (!force && factResult) { setFactExpanded(true); return; }
    setFactChecking(true);
    setFactError(null);
    setFactExpanded(true);
    try {
      const res = await apiFetch("/api/factcheck", {
        method: "POST",
        body: JSON.stringify({
          question: displayQuestion,
          answer: displayAnswer,
          category: category.title,
          value: question.value,
        }),
      });
      const data: FactCheckResult = await res.json();
      await cacheFactCheck(displayQuestion, displayAnswer, data);
      setFactResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fact check failed — try again.";
      setFactError(message);
    } finally {
      setFactChecking(false);
    }
  }

  // ── Refresh ──────────────────────────────────────────────────────────────────
  async function handleRefresh() {
    if (refreshing || !assembledPrompt) {
      if (!assembledPrompt) onRefreshError?.("Select a category for this column first.");
      return;
    }
    setRefreshing(true);
    try {
      const res = await apiFetch("/api/generate/question", {
        method: "POST",
        body: JSON.stringify({
          categoryName: category.title,
          categoryPrompt: assembledPrompt,
          pointValue: question.value,
          currentClue: displayQuestion,
          currentAnswer: displayAnswer,
        }),
      });
      const data: { question: string; answer: string; topicTags?: string[] } = await res.json();

      // Track BOTH the old answer (to prevent re-use) AND the new answer
      await addToSeen({
        answers: [displayAnswer, data.answer],
        topics: data.topicTags || [],
        clues: [displayQuestion, data.question],
      });

      setDisplayQuestion(data.question);
      setDisplayAnswer(data.answer);
      setAnswerRevealed(false);
      setFactResult(null);
      setFactExpanded(false);
      onRefreshQuestion?.(question.id, data.question, data.answer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed — try again.";
      onRefreshError?.(message);
    } finally {
      setRefreshing(false);
    }
  }

  function handleMarkUsed() { onMarkUsed(question.id); onClose(); }
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const isBusy = refreshing || factChecking;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{
        backgroundColor: "rgba(0,0,0,0.85)",
        animation: "fadeIn 0.2s ease-out"
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-7xl rounded-2xl bg-white shadow-2xl flex flex-col animate-slideUp"
        style={{
          padding: "3rem 4rem 2rem",
          maxHeight: "95vh",
          overflowY: "auto",
          animation: "slideUp 0.3s ease-out"
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-slate-400 hover:text-slate-900 text-4xl font-bold leading-none"
        >
          ×
        </button>

        {/* Favorite star */}
        <button
          onClick={handleFavoriteToggle}
          className="absolute top-4 right-20 text-3xl leading-none transition-transform hover:scale-125 active:scale-95"
          title={favored ? "Remove from favorites" : "Add to favorites"}
          style={{ color: favored ? "var(--accent)" : "rgb(203 213 225)" }}
        >
          {favored ? "★" : "☆"}
        </button>

        {/* Dislike/Reject button */}
        <button
          onClick={handleDislike}
          disabled={disliked}
          className="absolute top-4 right-[7.5rem] text-3xl leading-none transition-all hover:scale-125 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          title={disliked ? "Clue rejected - won't appear again" : "Reject this clue (never show again)"}
          style={{
            color: disliked ? "#ef4444" : "#94a3b8",
            filter: disliked ? "none" : "grayscale(0.3)"
          }}
        >
          👎
        </button>

        {/* Category + value */}
        <div className="text-center mb-6">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {category.title}
          </span>
          <span className="ml-4 px-4 py-2 rounded-lg bg-accent text-slate-900 text-xl font-bold">
            ${question.value}
          </span>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center mb-6">
          {timerPhase === "steal" && (
            <span className="text-sm font-bold tracking-wide uppercase mb-2 px-4 py-1 rounded-full bg-red-50 text-red-600 border-2 border-red-200">
              Steal Mode
            </span>
          )}
          <div className="font-black tabular-nums" style={{ fontSize: "5.5rem", lineHeight: 1, color: timerColor, transition: "color 0.3s" }}>
            {secondsLeft}
          </div>
          <div className="flex gap-3 mt-3">
            <button onClick={handlePausePlay} disabled={timerPhase === "stopped"} className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50">
              {running ? "Pause" : "Play"}
            </button>
            <button onClick={handleResetTimer} className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50">
              Reset
            </button>
            {timerPhase === "question" && (
              <button onClick={handleSteal} className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50">
                Steal ({stealTimerSeconds}s)
              </button>
            )}
          </div>
        </div>

        {/* Question text */}
        <p className="text-slate-900 font-bold leading-tight text-center mb-8" style={{ fontSize: "3rem" }}>
          {displayQuestion}
        </p>

        {/* Answer reveal */}
        {answerRevealed ? (
          <div className="w-full rounded-xl py-6 px-8 mb-6 font-bold text-center bg-accent/20 text-slate-900 border-2 border-accent/40" style={{ fontSize: "2.5rem" }}>
            {displayAnswer}
          </div>
        ) : (
          <button
            onClick={() => {
              playSound?.("reveal");
              setAnswerRevealed(true);
            }}
            disabled={isBusy}
            className="mb-6 btn-primary disabled:opacity-40 disabled:cursor-not-allowed self-center text-xl px-8 py-4"
          >
            Reveal Answer
          </button>
        )}

        {/* Award points */}
        {teams.length > 0 && onAwardPoints && answerRevealed && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-4 flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-tight text-center text-slate-700">
              Award Points
            </p>
            <div className="flex flex-col gap-2">
              <select value={selectedTeamId} onChange={(e) => { setSelectedTeamId(e.target.value); setSelectedPlayers([]); }} className="w-full rounded-lg px-2 py-2 text-sm font-medium focus:outline-none bg-white border border-slate-200 text-slate-900">
                <option value="">— Select team —</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {selectedTeam && selectedTeam.players.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-slate-600">Select player(s) for individual stats:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTeam.players.map((playerName) => (
                      <label
                        key={playerName}
                        className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 hover:border-accent/50 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlayers.includes(playerName)}
                          onChange={() => togglePlayer(playerName)}
                          className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-slate-900">{playerName}</span>
                      </label>
                    ))}
                  </div>
                  {selectedPlayers.length > 1 && (
                    <p className="text-xs text-slate-500 italic">
                      Points split: {selectedPlayers.length} players × ${(pointValue / selectedPlayers.length).toFixed(0)} each
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAward(true)} className="flex-1 py-2.5 rounded-lg font-semibold text-sm hover:scale-105 transition-all bg-green-500 text-white hover:bg-green-600">
                Correct +${pointValue}
              </button>
              <button onClick={() => handleAward(false)} className="flex-1 py-2.5 rounded-lg font-semibold text-sm hover:scale-105 transition-all bg-red-500 text-white hover:bg-red-600">
                Incorrect −${pointValue}
              </button>
            </div>
          </div>
        )}

        {/* Fact check results */}
        {factExpanded && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 mb-4 overflow-hidden">
            {factChecking && (
              <div className="p-4 text-center text-slate-600 text-sm animate-pulse">
                Fact checking…
              </div>
            )}
            {factError && (
              <div className="p-4 text-center text-red-600 text-sm">{factError}</div>
            )}
            {factResult && !factChecking && (() => {
              const meta = VERDICT_META[factResult.verdict];
              return (
                <div className="p-4 flex flex-col gap-3">
                  {/* Verdict row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border" style={{ backgroundColor: meta.bg, borderColor: meta.border, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      Confidence: {factResult.confidence}%
                    </span>
                    <button
                      onClick={() => handleFactCheck(true)}
                      disabled={factChecking}
                      className="ml-auto text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-all"
                    >
                      Re-check
                    </button>
                  </div>

                  {/* Explanation */}
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {factResult.explanation}
                  </p>

                  {/* Supporting facts */}
                  {factResult.supportingFacts && factResult.supportingFacts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold tracking-tight uppercase mb-1.5 text-slate-600">
                        Supporting Facts
                      </p>
                      <ul className="flex flex-col gap-1">
                        {factResult.supportingFacts.map((f, i) => (
                          <li key={i} className="text-sm text-slate-700 flex gap-2">
                            <span className="text-slate-400 flex-shrink-0">•</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Common confusions */}
                  {factResult.commonConfusions && factResult.commonConfusions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold tracking-tight uppercase mb-1.5 text-red-600">
                        Common Confusions
                      </p>
                      <ul className="flex flex-col gap-1">
                        {factResult.commonConfusions.map((c, i) => (
                          <li key={i} className="text-sm text-slate-700 flex gap-2">
                            <span className="text-red-400 flex-shrink-0">•</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Debug Panel */}
        {debugAI && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700">AI Debug Info</p>
              <button
                onClick={() => setDebugAI(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Hide
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold text-slate-600">Category ID:</span>
                <span className="ml-2 text-slate-900 font-mono">{category.categoryLibraryId || "(none)"}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600">Category Name:</span>
                <span className="ml-2 text-slate-900">{category.title}</span>
              </div>
              {assembledPrompt && (
                <div>
                  <span className="font-semibold text-slate-600">Assembled Prompt (first 300 chars):</span>
                  <div className="mt-1 p-2 bg-white border border-slate-200 rounded text-slate-700 font-mono text-xs leading-relaxed">
                    {assembledPrompt.substring(0, 300)}
                    {assembledPrompt.length > 300 && "..."}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-2 flex-wrap mt-1">
          {/* Debug Toggle */}
          <button
            onClick={() => setDebugAI(!debugAI)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Show AI debug information"
          >
            {debugAI ? "Hide Debug" : "Debug AI"}
          </button>

          {/* Fact Check */}
          <button
            onClick={() => handleFactCheck(false)}
            disabled={isBusy}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all border border-slate-200 min-w-[120px] ${
              isBusy ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50"
            }`}
          >
            {factChecking ? "Checking…" : factResult ? "View Facts" : "Fact Check"}
          </button>

          {/* Refresh — AI mode only */}
          {aiMode && (
            <button
              onClick={handleRefresh}
              disabled={isBusy}
              className={`btn-secondary min-w-[150px] ${
                isBusy ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50"
              }`}
            >
              {refreshing ? "Generating…" : "Refresh Question"}
            </button>
          )}

          {/* Reject Clue — AI mode only */}
          {aiMode && (
            <button
              onClick={handleDislike}
              disabled={disliked || isBusy}
              className={`min-w-[150px] ${
                disliked
                  ? "bg-red-100 border border-red-300 text-red-700 cursor-not-allowed"
                  : "bg-white border border-red-200 text-red-600 hover:bg-red-50"
              } px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-60`}
              title={disliked ? "Clue rejected - won't appear again" : "Reject this clue permanently"}
            >
              {disliked ? "✓ Rejected" : "👎 Reject Clue"}
            </button>
          )}

          {/* Mark as Used */}
          <button
            onClick={handleMarkUsed}
            disabled={isBusy}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark as Used
          </button>
        </div>
      </div>
    </div>
  );
}
