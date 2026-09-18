"use client";

import { useState, useCallback } from "react";
import { useGenerationState } from "@/lib/data/useGenerationState";
import { buildQuestionRefreshBody } from "@/lib/generation/questionRefresh";
import { useCategoryLibrary } from "@/lib/data/useCategoryLibrary";
import { DEFAULT_LIBRARY } from "@/app/data/categoryLibrary";
import { assemblePrompt } from "@/app/lib/generatePrompt";
import type { BoardState } from "@/app/data/boardData";

interface HostBoardPrepProps {
  board: BoardState;
  djBoard?: BoardState;
  playerCount: number;
  onFinalize: (board: BoardState, djBoard?: BoardState) => void;
  onBack: () => void;
}

type CellStatus = "original" | "edited" | "refreshed" | "locked";

export default function HostBoardPrep({ board, djBoard, playerCount, onFinalize, onBack }: HostBoardPrepProps) {
  // Round 1 state
  const [workingBoard, setWorkingBoard] = useState<BoardState>(board);
  const [lockedCells, setLockedCells] = useState<Set<string>>(new Set());
  const [cellStatus, setCellStatus] = useState<Record<string, CellStatus>>({});

  // Round 2 state (DJ)
  const [workingDjBoard, setWorkingDjBoard] = useState<BoardState | null>(djBoard ?? null);
  const [djLockedCells, setDjLockedCells] = useState<Set<string>>(new Set());
  const [djCellStatus, setDjCellStatus] = useState<Record<string, CellStatus>>({});

  // Shared state
  const [roundTab, setRoundTab] = useState<1 | 2>(1);
  const [expandedCell, setExpandedCell] = useState<{ catIdx: number; clueIdx: number } | null>(null);
  const [editClue, setEditClue] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [refreshingCell, setRefreshingCell] = useState<string | null>(null);
  const [refreshingColumn, setRefreshingColumn] = useState<number | null>(null);

  const { state: generationState, addToSeen } = useGenerationState();
  const { categories: userCategories } = useCategoryLibrary();

  // Active board references based on tab
  const activeBoard = roundTab === 2 && workingDjBoard ? workingDjBoard : workingBoard;
  const activeLockedCells = roundTab === 2 ? djLockedCells : lockedCells;
  const activeCellStatus = roundTab === 2 ? djCellStatus : cellStatus;

  function setActiveBoardState(updater: (prev: BoardState) => BoardState) {
    if (roundTab === 2) {
      setWorkingDjBoard((prev) => (prev ? updater(prev) : prev));
    } else {
      setWorkingBoard(updater);
    }
  }
  function setActiveLockedCells(updater: (prev: Set<string>) => Set<string>) {
    if (roundTab === 2) setDjLockedCells(updater);
    else setLockedCells(updater);
  }
  function setActiveCellStatus(updater: (prev: Record<string, CellStatus>) => Record<string, CellStatus>) {
    if (roundTab === 2) setDjCellStatus(updater);
    else setCellStatus(updater);
  }

  // Build merged category list for prompt lookup
  const allCategories = [
    ...userCategories,
    ...DEFAULT_LIBRARY
      .filter((d) => !userCategories.some((u) => u.name === d.name))
      .map((d) => ({
        id: d.id,
        name: d.name,
        promptTemplate: d.promptTemplate,
        difficultyGuidance: d.difficultyGuidance,
        answerFormatGuidance: d.answerFormatGuidance,
        examples: d.examples,
      })),
  ];

  const getPromptForColumn = useCallback(
    (column: { title: string; categoryLibraryId: string | null }) => {
      if (!column.categoryLibraryId) return null;
      const cat = allCategories.find((c) => c.id === column.categoryLibraryId);
      if (!cat) return null;
      return assemblePrompt(cat, activeBoard.rowValues);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allCategories, activeBoard.rowValues]
  );

  // ── Cell operations ──────────────────────────────────────────────────────

  function handleToggleCell(catIdx: number, clueIdx: number) {
    if (expandedCell?.catIdx === catIdx && expandedCell?.clueIdx === clueIdx) {
      setExpandedCell(null);
    } else {
      const q = activeBoard.columns[catIdx].questions[clueIdx];
      setEditClue(q.question);
      setEditAnswer(q.answer);
      setExpandedCell({ catIdx, clueIdx });
    }
  }

  function handleSaveEdit() {
    if (!expandedCell) return;
    const { catIdx, clueIdx } = expandedCell;
    const key = `${catIdx}-${clueIdx}`;

    setActiveBoardState((prev) => ({
      ...prev,
      columns: prev.columns.map((col, ci) => {
        if (ci !== catIdx) return col;
        return {
          ...col,
          questions: col.questions.map((q, qi) => {
            if (qi !== clueIdx) return q;
            return { ...q, question: editClue.trim(), answer: editAnswer.trim() };
          }),
        };
      }),
    }));

    setActiveCellStatus((prev) => ({ ...prev, [key]: "edited" }));
    setExpandedCell(null);
  }

  async function handleRefreshCell(catIdx: number, clueIdx: number) {
    const key = `${catIdx}-${clueIdx}`;
    if (activeLockedCells.has(key)) return;

    const column = activeBoard.columns[catIdx];
    const question = column.questions[clueIdx];
    const prompt = getPromptForColumn(column);
    if (!prompt) return;

    setRefreshingCell(key);
    try {
      // Add current content to seen BEFORE regenerating
      await addToSeen({
        answers: [question.answer],
        clues: [question.question],
      });

      const res = await fetch("/api/generate/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildQuestionRefreshBody({
          categoryName: column.title,
          categoryPrompt: prompt,
          pointValue: question.value,
          generationState,
          currentClue: question.question,
          currentAnswer: question.answer,
        })),
      });

      if (!res.ok) throw new Error("Refresh failed");
      const data = await res.json();

      // Track new content in seen state
      await addToSeen({
        answers: [data.answer],
        topics: data.topicTags || [],
        clues: [data.question],
      });

      setActiveBoardState((prev) => ({
        ...prev,
        columns: prev.columns.map((col, ci) => {
          if (ci !== catIdx) return col;
          return {
            ...col,
            questions: col.questions.map((q, qi) => {
              if (qi !== clueIdx) return q;
              return { ...q, question: data.question, answer: data.answer };
            }),
          };
        }),
      }));

      setActiveCellStatus((prev) => ({ ...prev, [key]: "refreshed" }));

      // Update edit form if this cell is expanded
      if (expandedCell?.catIdx === catIdx && expandedCell?.clueIdx === clueIdx) {
        setEditClue(data.question);
        setEditAnswer(data.answer);
      }
    } catch (err) {
      console.error("Cell refresh failed:", err);
    } finally {
      setRefreshingCell(null);
    }
  }

  async function handleRefreshColumn(catIdx: number) {
    const column = activeBoard.columns[catIdx];
    const prompt = getPromptForColumn(column);
    if (!prompt) return;

    // Determine which cells are unlocked
    const unlockedIndices: number[] = [];
    const unlockedRowValues: number[] = [];
    column.questions.forEach((q, qi) => {
      if (!activeLockedCells.has(`${catIdx}-${qi}`)) {
        unlockedIndices.push(qi);
        unlockedRowValues.push(q.value);
      }
    });

    if (unlockedIndices.length === 0) return;

    setRefreshingColumn(catIdx);
    try {
      // Add old content to seen
      const oldAnswers = unlockedIndices.map((qi) => column.questions[qi].answer);
      const oldClues = unlockedIndices.map((qi) => column.questions[qi].question);
      await addToSeen({ answers: oldAnswers, clues: oldClues });

      const res = await fetch("/api/generate/column", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryName: column.title,
          categoryPrompt: prompt,
          rowValues: unlockedRowValues,
          generationState,
        }),
      });

      if (!res.ok) throw new Error("Column refresh failed");
      const data = await res.json();

      // Track new content
      const newAnswers = data.items.map((item: { answer: string }) => item.answer);
      const newClues = data.items.map((item: { question: string }) => item.question);
      const newTopics = data.items.flatMap((item: { topicTags?: string[] }) => item.topicTags || []);
      await addToSeen({ answers: newAnswers, clues: newClues, topics: newTopics });

      // Merge into board — only replace unlocked cells
      setActiveBoardState((prev) => ({
        ...prev,
        columns: prev.columns.map((col, ci) => {
          if (ci !== catIdx) return col;
          let genIdx = 0;
          return {
            ...col,
            questions: col.questions.map((q, qi) => {
              if (activeLockedCells.has(`${catIdx}-${qi}`)) return q;
              const item = data.items[genIdx++];
              if (!item) return q;
              setActiveCellStatus((prev) => ({ ...prev, [`${catIdx}-${qi}`]: "refreshed" }));
              return { ...q, question: item.question, answer: item.answer };
            }),
          };
        }),
      }));

      // Close expanded cell if it was in this column
      if (expandedCell?.catIdx === catIdx) {
        setExpandedCell(null);
      }
    } catch (err) {
      console.error("Column refresh failed:", err);
    } finally {
      setRefreshingColumn(null);
    }
  }

  function handleToggleLock(catIdx: number, clueIdx: number) {
    const key = `${catIdx}-${clueIdx}`;
    setActiveLockedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setActiveCellStatus((p) => {
          const newStatus = { ...p };
          if (newStatus[key] === "locked") delete newStatus[key];
          return newStatus;
        });
      } else {
        next.add(key);
        setActiveCellStatus((p) => ({ ...p, [key]: "locked" }));
      }
      return next;
    });
  }

  function handleFinalize() {
    if (!confirm("Finalize this board and start the game? Players will see this board.")) return;
    onFinalize(workingBoard, workingDjBoard ?? undefined);
  }

  function handleSwitchTab(tab: 1 | 2) {
    setExpandedCell(null);
    setRoundTab(tab);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center min-h-screen py-6 px-4">
      {/* Header */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-blue-300 hover:text-white text-sm transition-colors"
          >
            &larr; Back to Lobby
          </button>
          <h2 className="text-xl font-semibold text-blue-200">Board Prep</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-blue-300 text-sm">
            {playerCount} player{playerCount !== 1 ? "s" : ""} waiting
          </span>
          <button
            onClick={handleFinalize}
            className="px-6 py-3 rounded-xl font-bold text-lg bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
          >
            Finalize &amp; Start Game
          </button>
        </div>
      </div>

      {/* Round tabs (only show if DJ board exists) */}
      {workingDjBoard && (
        <div className="w-full max-w-6xl flex gap-2 mb-4">
          <button
            onClick={() => handleSwitchTab(1)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              roundTab === 1
                ? "bg-[#FFD700] text-[#060CE9]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Round 1 — Jeopardy!
          </button>
          <button
            onClick={() => handleSwitchTab(2)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              roundTab === 2
                ? "bg-[#FFD700] text-[#060CE9]"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Round 2 — Double Jeopardy!
          </button>
        </div>
      )}

      {/* Board grid */}
      <div className="w-full max-w-6xl overflow-x-auto">
        <div
          className="grid gap-1 min-w-[700px]"
          style={{ gridTemplateColumns: `repeat(${activeBoard.columns.length}, 1fr)` }}
        >
          {/* Column headers */}
          {activeBoard.columns.map((col, catIdx) => {
            const hasPrompt = !!getPromptForColumn(col);
            return (
              <div
                key={`header-${catIdx}`}
                className="bg-[#060CE9] border-2 border-[#1a1aff] p-3 rounded-t-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#FFD700] font-bold text-xs uppercase truncate">
                    {col.title}
                  </span>
                  {hasPrompt && (
                    <button
                      onClick={() => handleRefreshColumn(catIdx)}
                      disabled={refreshingColumn === catIdx}
                      className="text-blue-300 hover:text-white text-sm disabled:opacity-40 flex-shrink-0 transition-colors"
                      title="Refresh all unlocked cells in this column"
                    >
                      {refreshingColumn === catIdx ? "..." : "\u21BB"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Clue cells */}
          {activeBoard.rowValues.map((rowVal, clueIdx) =>
            activeBoard.columns.map((col, catIdx) => {
              const key = `${catIdx}-${clueIdx}`;
              const question = col.questions[clueIdx];
              const isLocked = activeLockedCells.has(key);
              const status = activeCellStatus[key] || "original";
              const isExpanded = expandedCell?.catIdx === catIdx && expandedCell?.clueIdx === clueIdx;
              const isRefreshing = refreshingCell === key;
              const hasPrompt = !!getPromptForColumn(col);

              return (
                <div
                  key={key}
                  className={`border p-2 text-xs transition-all min-h-[60px] ${
                    isLocked
                      ? "border-green-500/50 bg-green-900/20"
                      : status === "edited"
                      ? "border-yellow-500/50 bg-yellow-900/20"
                      : status === "refreshed"
                      ? "border-blue-400/50 bg-blue-900/20"
                      : "border-[#1a1aff]/50 bg-[#060CE9]/50"
                  }`}
                >
                  {/* Collapsed view */}
                  {!isExpanded && (
                    <button
                      onClick={() => handleToggleCell(catIdx, clueIdx)}
                      className="w-full text-left h-full"
                      disabled={isRefreshing}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[#FFD700] font-bold text-[11px]">${rowVal}</span>
                        {isLocked && <span className="text-green-400 text-[9px]">&#x1F512;</span>}
                        {status === "edited" && !isLocked && (
                          <span className="text-yellow-400 text-[9px]">&#x270F;</span>
                        )}
                        {status === "refreshed" && !isLocked && (
                          <span className="text-blue-400 text-[9px]">&#x1F504;</span>
                        )}
                      </div>
                      <p className="text-white/60 text-[10px] leading-tight line-clamp-2">
                        {isRefreshing ? (
                          <span className="text-blue-300 animate-pulse">Generating...</span>
                        ) : (
                          question?.answer || "\u2014"
                        )}
                      </p>
                    </button>
                  )}

                  {/* Expanded view (inline editor) */}
                  {isExpanded && question && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#FFD700] font-bold text-[11px]">${rowVal}</span>
                        <button
                          onClick={() => setExpandedCell(null)}
                          className="text-white/50 hover:text-white text-xs"
                        >
                          &times;
                        </button>
                      </div>

                      <div>
                        <label className="text-blue-300 text-[9px] uppercase block mb-0.5">Clue</label>
                        <textarea
                          value={editClue}
                          onChange={(e) => setEditClue(e.target.value)}
                          rows={3}
                          className="w-full bg-white/10 text-white text-[11px] rounded p-1.5 resize-none border border-white/20 focus:border-[#FFD700] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-blue-300 text-[9px] uppercase block mb-0.5">Answer</label>
                        <input
                          value={editAnswer}
                          onChange={(e) => setEditAnswer(e.target.value)}
                          className="w-full bg-white/10 text-white text-[11px] rounded p-1.5 border border-white/20 focus:border-[#FFD700] focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-colors"
                        >
                          Save
                        </button>
                        {hasPrompt && (
                          <button
                            onClick={() => handleRefreshCell(catIdx, clueIdx)}
                            disabled={isRefreshing || isLocked}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors"
                          >
                            {isRefreshing ? "..." : "Refresh"}
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleLock(catIdx, clueIdx)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                            isLocked
                              ? "bg-green-600 text-white hover:bg-green-500"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          {isLocked ? "Unlock" : "Lock"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-[10px] text-blue-300">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500/50" /> Locked
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500/50" /> Edited
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400/50" /> Refreshed
        </span>
      </div>
    </div>
  );
}
