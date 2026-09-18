"use client";

import { useState } from "react";
import type { Question } from "../data/boardData";
import { useGenerationState } from "@/lib/data/useGenerationState";
import { buildQuestionRefreshBody } from "@/lib/generation/questionRefresh";

interface EditTileModalProps {
  question: Question;
  categoryTitle: string;
  rowValues: number[];
  /**
   * If provided, a "Refresh Question" button is shown that calls the
   * /api/generate/question endpoint with this assembled prompt.
   */
  assembledPrompt?: string;
  onSave: (updated: Question) => void;
  onClose: () => void;
}

export default function EditTileModal({
  question,
  categoryTitle,
  rowValues,
  assembledPrompt,
  onSave,
  onClose,
}: EditTileModalProps) {
  const { state: generationState, addToSeen } = useGenerationState();
  const [questionText, setQuestionText] = useState(question.question);
  const [answerText, setAnswerText] = useState(question.answer);
  const [value, setValue] = useState(question.value);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  async function handleRefresh() {
    if (!assembledPrompt || refreshing) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      await addToSeen({
        answers: [answerText],
        clues: [questionText],
      });

      const res = await fetch("/api/generate/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildQuestionRefreshBody({
          categoryName: categoryTitle,
          categoryPrompt: assembledPrompt,
          pointValue: value,
          generationState,
          currentClue: questionText,
          currentAnswer: answerText,
        })),
      });
      if (!res.ok) throw new Error("Request failed");
      const data: { question: string; answer: string; topicTags?: string[] } = await res.json();
      await addToSeen({
        answers: [data.answer],
        topics: data.topicTags || [],
        clues: [data.question],
      });
      setQuestionText(data.question);
      setAnswerText(data.answer);
    } catch {
      setRefreshError("Generation failed — try again.");
    } finally {
      setRefreshing(false);
    }
  }

  function handleSave() {
    if (!questionText.trim() || !answerText.trim()) return;
    onSave({ ...question, question: questionText.trim(), answer: answerText.trim(), value });
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const isDirty =
    questionText !== question.question ||
    answerText !== question.answer ||
    value !== question.value;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl flex flex-col gap-5 p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-tight text-slate-600">
              Edit Tile
            </p>
            <p className="text-base font-semibold tracking-tight text-slate-900">
              {categoryTitle} · ${question.value}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 text-2xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Question */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold tracking-tight text-slate-700">
            Question
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent bg-white border border-slate-200"
          />
        </div>

        {/* Answer */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold tracking-tight text-slate-700">
            Answer
          </label>
          <input
            type="text"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-white border border-slate-200"
          />
        </div>

        {/* Value */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold tracking-tight text-slate-700">
            Point Value
          </label>
          <select
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-white border border-slate-200"
          >
            {rowValues.map((v) => (
              <option key={v} value={v}>
                ${v}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh error */}
        {refreshError && (
          <p className="text-xs text-red-600 -mt-2">{refreshError}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1 flex-wrap">
          {assembledPrompt && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`btn-secondary min-w-[140px] ${
                refreshing ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50"
              }`}
            >
              {refreshing ? "Generating…" : "Refresh Question"}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={refreshing || !isDirty || !questionText.trim() || !answerText.trim()}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
              !refreshing && isDirty
                ? "btn-primary"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            disabled={refreshing}
            className={`flex-1 btn-secondary ${
              refreshing ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50"
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
