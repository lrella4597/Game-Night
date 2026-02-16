"use client";

import { useState } from "react";
import type { Category, Question } from "../data/boardData";
import EditTileModal from "./EditTileModal";
import { useGenerationState } from "@/lib/data/useGenerationState";
import { useFavorites } from "@/lib/data/useFavorites";

interface ColumnDetailModalProps {
  category: Category;
  questions: Question[];
  rowValues: number[];
  onClose: () => void;
  onRefreshQuestion: (questionId: string, newQuestion: string, newAnswer: string) => void;
  onReorderQuestions: (categoryId: string, reorderedQuestions: Question[]) => void;
  onGenerateColumn: (categoryId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  assembledPrompt?: string;
  isGenerating?: boolean;
}

export default function ColumnDetailModal({
  category,
  questions,
  rowValues,
  onClose,
  onRefreshQuestion,
  onReorderQuestions,
  onGenerateColumn,
  onDeleteQuestion,
  assembledPrompt,
  isGenerating = false,
}: ColumnDetailModalProps) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const { state: generationState, addToSeen } = useGenerationState();
  const { addFavorite, removeFavoriteByContent, isFavorite } = useFavorites();

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function moveQuestionUp(index: number) {
    if (index === 0) return;
    const reordered = [...questions];
    [reordered[index], reordered[index - 1]] = [reordered[index - 1], reordered[index]];
    onReorderQuestions(category.id, reordered);
  }

  function moveQuestionDown(index: number) {
    if (index === questions.length - 1) return;
    const reordered = [...questions];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    onReorderQuestions(category.id, reordered);
  }

  function toggleExpanded(questionId: string) {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={handleBackdropClick}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl flex flex-col animate-slideUp"
          style={{
            padding: "2rem",
            maxHeight: "90vh",
            animation: "slideUp 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{category.title}</h2>
              <p className="text-sm text-slate-600 mt-1">
                {questions.length} question{questions.length !== 1 ? "s" : ""} • Click to expand and edit
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => onGenerateColumn(category.id)}
              disabled={isGenerating}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : "🔄 Generate All New"}
            </button>
            <button onClick={onClose} className="btn-secondary hover:bg-slate-50">
              Done
            </button>
          </div>

          {/* Questions list */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {questions.map((question, index) => {
              const isExpanded = expandedQuestions.has(question.id);

              return (
                <div
                  key={question.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all"
                >
                  {/* Question header - always visible */}
                  <div className="flex items-start gap-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveQuestionUp(index)}
                        disabled={index === 0}
                        className="w-8 h-8 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 font-bold"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveQuestionDown(index)}
                        disabled={index === questions.length - 1}
                        className="w-8 h-8 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 font-bold"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>

                    {/* Value badge */}
                    <div
                      className="px-3 py-1 rounded-lg font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: "var(--accent)", color: "var(--foreground)" }}
                    >
                      ${question.value}
                    </div>

                    {/* Question preview/full */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => toggleExpanded(question.id)}
                        className="w-full text-left"
                      >
                        <p className="text-slate-900 font-semibold">
                          {question.question ? (
                            isExpanded
                              ? question.question
                              : question.question.length > 80
                              ? question.question.substring(0, 80) + "..."
                              : question.question
                          ) : (
                            <span className="text-slate-400 italic">No question</span>
                          )}
                        </p>
                        {!isExpanded && question.question && question.question.length > 80 && (
                          <span className="text-xs text-slate-500 italic">Click to expand</span>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-sm text-slate-600 font-semibold mb-1">Answer:</p>
                          <p className="text-lg font-bold text-slate-900 mb-4">{question.answer}</p>

                          {/* Action buttons when expanded */}
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setEditingQuestion(question)}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => {
                                const isCurrentlyFavorite = isFavorite(
                                  category.title,
                                  question.question,
                                  question.answer
                                );
                                if (isCurrentlyFavorite) {
                                  removeFavoriteByContent(category.title, question.question, question.answer);
                                } else {
                                  addFavorite(category.title, question.question, question.answer, question.value);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                isFavorite(category.title, question.question, question.answer)
                                  ? "bg-yellow-100 border border-yellow-300 text-yellow-700 hover:bg-yellow-200"
                                  : "bg-white border border-slate-200 hover:bg-slate-50"
                              }`}
                              title={
                                isFavorite(category.title, question.question, question.answer)
                                  ? "Remove from favorites"
                                  : "Add to favorites"
                              }
                            >
                              {isFavorite(category.title, question.question, question.answer) ? "⭐" : "☆"} Favorite
                            </button>
                            <button
                              onClick={async () => {
                                // Add to seen list to avoid regenerating similar questions
                                await addToSeen({
                                  answers: [question.answer],
                                  topics: [],
                                  clues: [question.question],
                                });
                                // Visual feedback
                                alert("👎 Question marked as disliked. Similar questions will be avoided in future generations.");
                              }}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                              title="Mark as disliked to avoid similar questions"
                            >
                              👎 Dislike
                            </button>
                            {assembledPrompt && (
                              <button
                                onClick={async () => {
                                  if (isGenerating) return;
                                  try {
                                    const res = await fetch("/api/generate/question", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        categoryName: category.title,
                                        categoryPrompt: assembledPrompt,
                                        pointValue: question.value,
                                        generationState,
                                        currentClue: question.question,
                                        currentAnswer: question.answer,
                                      }),
                                    });
                                    const data = await res.json();

                                    // Track BOTH old and new content
                                    await addToSeen({
                                      answers: [question.answer, data.answer],
                                      topics: data.topicTags || [],
                                      clues: [question.question, data.question],
                                    });

                                    onRefreshQuestion(question.id, data.question, data.answer);
                                  } catch (err) {
                                    console.error("Refresh failed:", err);
                                  }
                                }}
                                disabled={isGenerating}
                                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                🔄 Refresh
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`Delete this $${question.value} question?`)) {
                                  onDeleteQuestion(question.id);
                                  toggleExpanded(question.id); // Collapse after delete
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expand/collapse icon */}
                    <button
                      onClick={() => toggleExpanded(question.id)}
                      className="text-2xl text-slate-400 hover:text-slate-600 flex-shrink-0"
                    >
                      {isExpanded ? "−" : "+"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingQuestion && (
        <EditTileModal
          question={editingQuestion}
          categoryTitle={category.title}
          rowValues={rowValues}
          assembledPrompt={assembledPrompt}
          onSave={(updatedQuestion) => {
            onRefreshQuestion(editingQuestion.id, updatedQuestion.question, updatedQuestion.answer);
            setEditingQuestion(null);
          }}
          onClose={() => setEditingQuestion(null)}
        />
      )}
    </>
  );
}
