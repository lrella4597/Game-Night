"use client";

import { useState, useEffect } from "react";
import { normalizeBoard } from "../data/boardData";
import type { BoardState, Category, Question } from "../data/boardData";
import { assemblePrompt } from "../lib/generatePrompt";
import { useTeams, type Team, type PowerUpKey } from "@/lib/data/useTeams";
import { useGameSettings } from "@/lib/data/useGameSettings";
import type { GameSettings } from "@/app/data/gameSettings";
import { useBoards } from "@/lib/data/useBoards";
import { useCategoryLibrary, type CategoryPrompt } from "@/lib/data/useCategoryLibrary";
import { useGenerationState } from "@/lib/data/useGenerationState";
import { useSoundEffects } from "@/lib/audio/useSoundEffects";
import QuestionModal from "./QuestionModal";
import EditTileModal from "./EditTileModal";
import ColumnDetailModal from "./ColumnDetailModal";
import Scoreboard from "./Scoreboard";
import PowerUpsDisplay from "./PowerUpsDisplay";
import SavedBoardsModal from "./SavedBoardsModal";
import Toast from "./Toast";
import type { ToastData } from "./Toast";
import LoadingSpinner from "./LoadingSpinner";
import { apiFetch } from "@/lib/utils/apiErrorHandler";
import {
  createAudienceSnapshot,
  publishAudienceSnapshot,
  refreshActiveAudienceQuestion,
} from "@/lib/audience/triviaAudience";

// ── Types for API responses ───────────────────────────────────────────────────

interface GenItem {
  value: number;
  question: string;
  answer: string;
  topicTags?: string[];
  difficulty?: number;
}

interface GenColumnResponse {
  items: GenItem[];
}

interface GenBoardResponse {
  columns: Array<{ categoryId: string; items: GenItem[] }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GameBoard() {
  // ── Board + library state ────────────────────────────────────────────────────
  const { currentBoard, saveCurrentBoard, loading: boardsLoading, initializing: boardInitializing } = useBoards();
  const { categories: categoryLibrary, loading: categoriesLoading } = useCategoryLibrary();
  const { teams, loading: teamsLoading, updateTeamScore, setTeamScore, togglePowerUp } = useTeams();
  const { settings: gameSettings, loading: settingsLoading } = useGameSettings();
  const { state: generationState, addToSeen, loading: genStateLoading } = useGenerationState();
  const { play: playSound } = useSoundEffects();

  const [boardState, setBoardState] = useState<BoardState | null>(currentBoard);
  const [hydrated, setHydrated] = useState(false);

  // Update local boardState when currentBoard changes
  useEffect(() => {
    if (currentBoard) {
      setBoardState(currentBoard);
      setHydrated(true);
    }
  }, [currentBoard]);

  // ── Play mode state ──────────────────────────────────────────────────────────
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<{
    question: Question;
    category: Category;
  } | null>(null);

  // Keep the audience window synchronized with display-safe gameplay data only.
  useEffect(() => {
    if (!boardState) return;
    publishAudienceSnapshot(
      createAudienceSnapshot({
        board: boardState,
        usedQuestionIds: usedQuestions,
        activeQuestion,
        teams,
      })
    );
  }, [activeQuestion, boardState, teams, usedQuestions]);

  // ── Edit mode state ──────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editingTile, setEditingTile] = useState<{
    question: Question;
    category: Category;
  } | null>(null);
  const [draggedQuestion, setDraggedQuestion] = useState<{
    questionId: string;
    columnId: string;
    rowIndex: number;
  } | null>(null);

  // ── Saved boards modal ───────────────────────────────────────────────────────
  const [savedBoardsOpen, setSavedBoardsOpen] = useState(false);

  // ── Column detail modal ──────────────────────────────────────────────────────
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

  // ── Generation loading state ─────────────────────────────────────────────────
  const [generatingAll, setGeneratingAll] = useState(false);
  const [blindStarting, setBlindStarting] = useState(false);
  const [generatingColumns, setGeneratingColumns] = useState<Set<string>>(new Set());

  const isAnyGenerating = generatingAll || blindStarting || generatingColumns.size > 0;

  // ── Toast state ──────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastData | null>(null);

  function showToast(message: string, type: ToastData["type"] = "success") {
    setToast({ message, type });
  }

  // ── Prompt helper ────────────────────────────────────────────────────────────

  function getAssembledPrompt(col: Category): string | undefined {
    if (!boardState) return undefined;
    const libItem = categoryLibrary.find((c) => c.id === col.categoryLibraryId);
    return libItem ? assemblePrompt(libItem, boardState.rowValues) : undefined;
  }

  // ── Play mode handlers ───────────────────────────────────────────────────────

  function handleTileClick(question: Question, category: Category) {
    if (usedQuestions.has(question.id)) return;
    playSound("tile-click");
    setActiveQuestion({ question, category });
  }

  function handleMarkUsed(questionId: string) {
    setUsedQuestions((prev) => new Set(prev).add(questionId));
  }

  function handleOpenAudienceView() {
    if (!boardState) return;

    publishAudienceSnapshot(
      createAudienceSnapshot({
        board: boardState,
        usedQuestionIds: usedQuestions,
        activeQuestion,
        teams,
      })
    );

    const audienceWindow = window.open(
      "/trivia/audience",
      "trivia-free-for-all-audience",
      "popup,width=1440,height=900"
    );

    if (!audienceWindow) {
      showToast("Allow pop-ups to open the audience view.", "error");
    }
  }

  async function handleRefreshActiveQuestion(id: string, newQuestion: string, newAnswer: string) {
    if (!boardState) return;
    const updated: BoardState = {
      ...boardState,
      columns: boardState.columns.map((col) => ({
        ...col,
        questions: col.questions.map((q) =>
          q.id === id ? { ...q, question: newQuestion, answer: newAnswer } : q
        ),
      })),
    };
    await saveCurrentBoard(updated);
    setBoardState(updated);
    setActiveQuestion((current) =>
      refreshActiveAudienceQuestion(current, id, newQuestion, newAnswer)
    );
    showToast("Question refreshed!");
  }

  // ── Team scoring + power-ups ─────────────────────────────────────────────────

  async function handleScoreDelta(teamId: string, delta: number) {
    await updateTeamScore(teamId, delta);
  }

  async function handleScoreSet(teamId: string, score: number) {
    await setTeamScore(teamId, score);
  }

  function handleAwardPoints(teamId: string, delta: number, playerName: string | null) {
    handleScoreDelta(teamId, delta);
    const team = teams.find((t) => t.id === teamId);
    const sign = delta >= 0 ? "+" : "";
    const who = playerName ? `${playerName} (${team?.name ?? ""})` : (team?.name ?? "Team");
    showToast(`${who}: ${sign}${delta} pts`);
  }

  async function handleUsePowerUp(teamId: string, key: PowerUpKey) {
    const team = teams.find((t) => t.id === teamId);
    const wasUsed = team?.powerUps[key] ?? false;

    await togglePowerUp(teamId, key);

    const labels: Record<PowerUpKey, string> = {
      doubleDown: "Double Down",
      doubleDip: "Double Dip",
      phoneAFriend: "Phone a Friend",
    };

    const action = wasUsed ? "reactivated" : "used";
    showToast(`${team?.name ?? "Team"} ${action} ${labels[key]}!`);
  }

  // ── Edit mode: tile editing ──────────────────────────────────────────────────

  function handleSaveTile(colId: string, updated: Question) {
    if (!boardState) return;
    setBoardState({
      ...boardState,
      columns: boardState.columns.map((col) => {
        if (col.id !== colId) return col;
        const original = col.questions.find((q) => q.id === updated.id);
        const conflict = col.questions.find(
          (q) => q.id !== updated.id && q.value === updated.value
        );
        return {
          ...col,
          questions: col.questions.map((q) => {
            if (q.id === updated.id) return updated;
            if (conflict && q.id === conflict.id && original)
              return { ...q, value: original.value };
            return q;
          }),
        };
      }),
    });
    setEditingTile(null);
  }

  // ── Drag and drop handlers ───────────────────────────────────────────────────

  function handleDragStart(questionId: string, columnId: string, rowIndex: number) {
    setDraggedQuestion({ questionId, columnId, rowIndex });
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault(); // Allow drop
  }

  function handleDrop(targetColumnId: string, targetRowIndex: number) {
    if (!draggedQuestion || !boardState) return;

    // Can only reorder within the same column
    if (draggedQuestion.columnId !== targetColumnId) {
      setDraggedQuestion(null);
      return;
    }

    // If dropping on itself, do nothing
    if (draggedQuestion.rowIndex === targetRowIndex) {
      setDraggedQuestion(null);
      return;
    }

    // Swap the questions at the two row positions and their values
    setBoardState({
      ...boardState,
      columns: boardState.columns.map((col) => {
        if (col.id !== targetColumnId) return col;

        const srcIdx = draggedQuestion.rowIndex;
        const dstIdx = targetRowIndex;
        const questions = [...col.questions];

        if (srcIdx >= questions.length || dstIdx >= questions.length) return col;

        // Swap the questions and their values
        const srcVal = questions[srcIdx].value;
        const dstVal = questions[dstIdx].value;
        questions[srcIdx] = { ...questions[srcIdx], value: dstVal };
        questions[dstIdx] = { ...questions[dstIdx], value: srcVal };
        [questions[srcIdx], questions[dstIdx]] = [questions[dstIdx], questions[srcIdx]];

        return { ...col, questions };
      }),
    });

    setDraggedQuestion(null);
  }

  // ── Edit mode: column header ─────────────────────────────────────────────────

  function handleColumnCategoryChange(colId: string, libraryId: string) {
    if (!boardState) return;
    const libItem = categoryLibrary.find((c) => c.id === libraryId);
    setBoardState({
      ...boardState,
      columns: boardState.columns.map((col) =>
        col.id !== colId
          ? col
          : {
              ...col,
              categoryLibraryId: libraryId || null,
              title: libItem ? libItem.name : col.title,
            }
      ),
    });
  }

  function handleColumnTitleChange(colId: string, newTitle: string) {
    if (!boardState) return;
    setBoardState({
      ...boardState,
      columns: boardState.columns.map((col) =>
        col.id !== colId ? col : { ...col, title: newTitle.toUpperCase() }
      ),
    });
  }

  // ── Column detail modal: reorder and delete ──────────────────────────────────

  function handleReorderQuestions(categoryId: string, reorderedQuestions: Question[]) {
    if (!boardState) return;
    setBoardState({
      ...boardState,
      columns: boardState.columns.map((col) =>
        col.id !== categoryId ? col : { ...col, questions: reorderedQuestions }
      ),
    });
  }

  function handleDeleteQuestion(questionId: string) {
    if (!boardState) return;
    setBoardState({
      ...boardState,
      columns: boardState.columns.map((col) => ({
        ...col,
        questions: col.questions.filter((q) => q.id !== questionId),
      })),
    });
  }

  // ── Edit mode: add / remove columns ──────────────────────────────────────────

  function handleAddColumn() {
    if (!boardState) return;
    const ts = Date.now();
    const newCol: Category = {
      id: `col-${ts}`,
      title: "NEW CATEGORY",
      categoryLibraryId: null,
      questions: boardState.rowValues.map((v) => ({
        id: `col-${ts}-${v}`,
        value: v,
        question: "(placeholder) click to edit",
        answer: "",
      })),
    };
    setBoardState({ ...boardState, columns: [...boardState.columns, newCol] });
  }

  function handleRemoveColumn() {
    if (!boardState || boardState.columns.length <= 1) return;
    const last = boardState.columns[boardState.columns.length - 1];
    if (!window.confirm(`Remove column "${last.title}"?`)) return;
    setBoardState({
      ...boardState,
      columns: boardState.columns.slice(0, -1),
    });
  }

  // ── Edit mode: add / remove rows ─────────────────────────────────────────────

  function handleAddRow() {
    if (!boardState) return;
    const newValue =
      boardState.rowValues.length > 0
        ? Math.max(...boardState.rowValues) + 100
        : 100;
    setBoardState({
      rowValues: [...boardState.rowValues, newValue],
      columns: boardState.columns.map((col) => ({
        ...col,
        questions: [
          ...col.questions,
          {
            id: `${col.id}-${newValue}`,
            value: newValue,
            question: "(placeholder) click to edit",
            answer: "",
          },
        ],
      })),
    });
  }

  function handleRemoveRow() {
    if (!boardState || boardState.rowValues.length <= 1) return;
    const lastValue = Math.max(...boardState.rowValues);
    if (!window.confirm(`Remove the $${lastValue} row?`)) return;
    setBoardState({
      rowValues: boardState.rowValues.filter((v) => v !== lastValue),
      columns: boardState.columns.map((col) => ({
        ...col,
        questions: col.questions.filter((q) => q.value !== lastValue),
      })),
    });
  }

  // ── Edit mode: board-level save / discard / repair ───────────────────────────

  async function handleSaveBoard() {
    if (!boardState) return;
    await saveCurrentBoard(boardState);
    setEditMode(false);
  }

  function handleDiscardEdits() {
    if (currentBoard) {
      setBoardState(currentBoard);
    }
    setEditMode(false);
  }

  async function handleRepairBoard() {
    if (!boardState) return;
    const repaired = normalizeBoard(boardState);
    setBoardState(repaired);
    await saveCurrentBoard(repaired);
  }

  // ── Generation handlers ──────────────────────────────────────────────────────

  async function handleGenerateColumn(colId: string) {
    if (isAnyGenerating || !boardState) return;
    const col = boardState.columns.find((c) => c.id === colId);
    if (!col) return;

    // VALIDATION: Block generation if no category is selected
    if (!col.categoryLibraryId) {
      showToast(`Select a category for "${col.title}" first.`, "error");
      return;
    }

    const prompt = getAssembledPrompt(col);
    if (!prompt) {
      showToast("No prompt found for this category.", "error");
      return;
    }

    setGeneratingColumns((prev) => new Set([...prev, colId]));

    try {
      const res = await apiFetch("/api/generate/column", {
        method: "POST",
        body: JSON.stringify({
          categoryName: col.title,
          categoryPrompt: prompt,
          rowValues: boardState.rowValues,
          generationState,
        }),
      });
      const data: GenColumnResponse = await res.json();

      if (!boardState) return;
      const updated: BoardState = {
        ...boardState,
        columns: boardState.columns.map((c) => {
          if (c.id !== colId) return c;
          return {
            ...c,
            questions: c.questions.map((q) => {
              const gen = data.items.find((item) => item.value === q.value);
              return gen ? { ...q, question: gen.question, answer: gen.answer } : q;
            }),
          };
        }),
      };
      await saveCurrentBoard(updated);
      setBoardState(updated);

      // Track what was generated
      const answers = data.items.map(item => item.answer);
      const topics = data.items.flatMap(item => item.topicTags || []);
      const clues = data.items.map(item => item.question);
      await addToSeen({ answers, topics, clues });

      showToast(`Generated questions for "${col.title}"`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed — please try again.";
      showToast(message, "error");
    } finally {
      setGeneratingColumns((prev) => {
        const next = new Set(prev);
        next.delete(colId);
        return next;
      });
    }
  }

  async function handleGenerateAll() {
    if (isAnyGenerating || !boardState) return;

    // VALIDATION: Check that all columns have categories selected
    const unassigned = boardState.columns.filter((col) => !col.categoryLibraryId);
    if (unassigned.length > 0) {
      const names = unassigned.map((c) => c.title).join(", ");
      showToast(`Select categories for these columns first: ${names}`, "error");
      return;
    }

    setGeneratingAll(true);

    try {
      // Collect ALL existing questions from ALL columns to avoid cross-column duplicates
      const allExistingQuestions = boardState.columns.flatMap((col) =>
        col.questions.map((q) => q.question)
      );

      const columns = boardState.columns.map((col) => {
        const prompt = getAssembledPrompt(col);
        if (!prompt) {
          throw new Error(`No prompt for column "${col.title}"`);
        }
        return {
          categoryId: col.id,
          categoryName: col.title,
          categoryPrompt: prompt,
          rowValues: boardState.rowValues,
        };
      });

      const res = await apiFetch("/api/generate/board", {
        method: "POST",
        body: JSON.stringify({
          columns,
          generationState,
        }),
      });
      const data: GenBoardResponse = await res.json();

      if (!boardState) return;
      const updated: BoardState = {
        ...boardState,
        columns: boardState.columns.map((col) => {
          const genCol = data.columns.find((c) => c.categoryId === col.id);
          if (!genCol) return col;
          return {
            ...col,
            questions: col.questions.map((q) => {
              const gen = genCol.items.find((item) => item.value === q.value);
              return gen ? { ...q, question: gen.question, answer: gen.answer } : q;
            }),
          };
        }),
      };
      await saveCurrentBoard(updated);
      setBoardState(updated);

      // Track all generated content
      const allAnswers = data.columns.flatMap(col => col.items.map(item => item.answer));
      const allTopics = data.columns.flatMap(col => col.items.flatMap(item => item.topicTags || []));
      const allClues = data.columns.flatMap(col => col.items.map(item => item.question));
      await addToSeen({ answers: allAnswers, topics: allTopics, clues: allClues });

      showToast("All board questions generated!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Board generation failed — please try again.";
      showToast(message, "error");
    } finally {
      setGeneratingAll(false);
    }
  }

  async function handleBlindStart() {
    if (isAnyGenerating || !boardState) return;

    // VALIDATION: Check that all columns have categories selected
    const unassigned = boardState.columns.filter((col) => !col.categoryLibraryId);
    if (unassigned.length > 0) {
      const names = unassigned.map((c) => c.title).join(", ");
      showToast(`Select categories for these columns first: ${names}`, "error");
      return;
    }

    setBlindStarting(true);

    try {
      const columns = boardState.columns.map((col) => {
        const prompt = getAssembledPrompt(col);
        if (!prompt) {
          throw new Error(`No prompt for column "${col.title}"`);
        }
        return {
          categoryId: col.id,
          categoryName: col.title,
          categoryPrompt: prompt,
          rowValues: boardState.rowValues,
        };
      });

      const res = await apiFetch("/api/generate/board", {
        method: "POST",
        body: JSON.stringify({
          columns,
          generationState,
        }),
      });
      const data: GenBoardResponse = await res.json();

      if (!boardState) return;
      const updated: BoardState = {
        ...boardState,
        columns: boardState.columns.map((col) => {
          const genCol = data.columns.find((c) => c.categoryId === col.id);
          if (!genCol) return col;
          return {
            ...col,
            questions: col.questions.map((q) => {
              const gen = genCol.items.find((item) => item.value === q.value);
              return gen ? { ...q, question: gen.question, answer: gen.answer } : q;
            }),
          };
        }),
      };
      await saveCurrentBoard(updated);
      setBoardState(updated);

      // Track all generated content
      const allAnswers = data.columns.flatMap(col => col.items.map(item => item.answer));
      const allTopics = data.columns.flatMap(col => col.items.flatMap(item => item.topicTags || []));
      const allClues = data.columns.flatMap(col => col.items.map(item => item.question));
      await addToSeen({ answers: allAnswers, topics: allTopics, clues: allClues });

      showToast("Board generated — ready to play!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Board generation failed — please try again.";
      showToast(message, "error");
    } finally {
      setBlindStarting(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const totalQuestions = boardState ? boardState.columns.length * boardState.rowValues.length : 0;
  const usedCount = usedQuestions.size;

  // ── Render ───────────────────────────────────────────────────────────────────

  const hasTeams = teams.length > 0;

  // Show loading state while any data is loading
  if (boardsLoading || categoriesLoading || teamsLoading || settingsLoading || genStateLoading) {
    return <LoadingSpinner message="Loading game data..." />;
  }

  if (boardInitializing) {
    return <LoadingSpinner message="Setting up your starter board..." />;
  }

  if (!boardState) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-screen">
        <div className="text-slate-600 text-sm">No board found. Click Edit Board to create one.</div>
        <button
          onClick={() => setEditMode(true)}
          className="mt-4 px-4 py-2 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all"
        >
          Edit Board
        </button>
      </div>
    );
  }

  return (
    // Extra bottom padding when scoreboard footer is visible
    <div className={!editMode && hasTeams ? "pb-24 w-full flex flex-col items-center" : "w-full flex flex-col items-center"}>
      {/* Mode toggle / status bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {!editMode ? (
          <>
            <span className="text-slate-600 text-sm">
              {usedCount} / {totalQuestions} used
            </span>
            <button
              onClick={handleOpenAudienceView}
              className="btn-primary"
              title="Open a clean board for the shared screen. Answers and host controls stay here."
            >
              Open Audience View
            </button>
            {gameSettings?.mode === "ai" && (
              <button
                onClick={handleBlindStart}
                disabled={isAnyGenerating}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                title="Generate a full board without previewing questions — so you can play too!"
              >
                {blindStarting ? "Generating…" : "🎲 Blind Start"}
              </button>
            )}
            <button
              onClick={() => setEditMode(true)}
              className="btn-secondary hover:bg-slate-50"
            >
              Edit Board
            </button>
            <button
              onClick={() => setSavedBoardsOpen(true)}
              className="btn-secondary hover:bg-slate-50"
            >
              Boards
            </button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold text-slate-900">
              Edit Mode
            </span>

            {/* Generate All — AI mode only */}
            {gameSettings?.mode === "ai" && (
              <button
                onClick={handleGenerateAll}
                disabled={isAnyGenerating}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                title="Generate new questions for the entire board"
              >
                {generatingAll ? "Generating…" : "Generate All"}
              </button>
            )}

            <button
              onClick={handleSaveBoard}
              className="btn-primary"
            >
              Save Changes
            </button>
            <button
              onClick={handleDiscardEdits}
              className="btn-secondary hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              onClick={handleRepairBoard}
              className="px-4 py-2 rounded-lg font-semibold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              title="Fill missing tiles and fix invalid values"
            >
              Repair
            </button>

            {/* Column / Row controls */}
            <span className="text-slate-300 text-xs mx-1 select-none" aria-hidden>|</span>
            <button onClick={handleAddColumn} className="btn-secondary hover:bg-slate-50" title="Add column">+ Col</button>
            <button
              onClick={handleRemoveColumn}
              disabled={boardState.columns.length <= 1}
              className="px-4 py-2 rounded-lg font-semibold text-sm border border-slate-200 text-slate-900 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Remove last column"
            >− Col</button>
            <span className="text-slate-300 text-xs mx-1 select-none" aria-hidden>|</span>
            <button onClick={handleAddRow} className="btn-secondary hover:bg-slate-50" title="Add row">+ Row</button>
            <button
              onClick={handleRemoveRow}
              disabled={boardState.rowValues.length <= 1}
              className="px-4 py-2 rounded-lg font-semibold text-sm border border-slate-200 text-slate-900 hover:bg-red-50 hover:border-red-200 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Remove last row"
            >− Row</button>
          </>
        )}
      </div>

      {/* Board grid */}
      <div
        className="w-full max-w-6xl grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${boardState.columns.length}, minmax(0, 1fr))`,
          opacity: hydrated ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
      >
        {/* Category headers */}
        {boardState.columns.map((col) => {
          const colGenerating = generatingColumns.has(col.id);

          return (
            <div
              key={col.id}
              className={`flex flex-col items-center justify-center rounded-xl py-3 px-2 gap-1 bg-white border transition-all ${
                editMode ? "border-slate-300 min-h-[110px]" : "border-slate-200 min-h-[80px]"
              }`}
            >
              {editMode ? (
                <>
                  {/* Library category dropdown */}
                  <select
                    value={col.categoryLibraryId ?? ""}
                    onChange={(e) => handleColumnCategoryChange(col.id, e.target.value)}
                    className="w-full text-center font-semibold text-xs focus:outline-none rounded-lg px-2 py-1 cursor-pointer bg-slate-50 border border-slate-200 text-slate-700"
                  >
                    <option value="">— Unassigned —</option>
                    {categoryLibrary.map((lib) => (
                      <option key={lib.id} value={lib.id}>
                        {lib.name}
                      </option>
                    ))}
                  </select>

                  {/* Custom title input when unassigned */}
                  {!col.categoryLibraryId && (
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => handleColumnTitleChange(col.id, e.target.value)}
                      placeholder="Custom name"
                      maxLength={30}
                      className="w-full text-center font-semibold text-xs focus:outline-none rounded-lg px-2 py-1 bg-slate-50 border border-slate-200 text-slate-700 mt-1"
                    />
                  )}

                  {/* Generate Column button — AI mode only */}
                  {gameSettings?.mode === "ai" && (
                    <button
                      onClick={() => handleGenerateColumn(col.id)}
                      disabled={isAnyGenerating}
                      className={`w-full mt-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                        colGenerating
                          ? "bg-accent/20 text-slate-900"
                          : isAnyGenerating
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-accent/10 text-slate-900 hover:bg-accent/20"
                      }`}
                    >
                      {colGenerating ? "Generating…" : "Generate"}
                    </button>
                  )}

                  {/* Manage Column button */}
                  <button
                    onClick={() => setSelectedColumnId(col.id)}
                    className="w-full mt-1 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    📋 Manage
                  </button>
                </>
              ) : (
                <span className="text-center font-bold text-xs md:text-sm tracking-tight text-slate-900 break-words leading-tight px-1 w-full block">
                  {col.title}
                </span>
              )}
            </div>
          );
        })}

        {/* Question tiles — row by row */}
        {boardState.rowValues.map((_, rowIndex) =>
          boardState.columns.map((col) => {
            const question = col.questions[rowIndex];
            if (!question) return <div key={`${col.id}-row${rowIndex}-empty`} />;

            const isUsed = !editMode && usedQuestions.has(question.id);
            const colGenerating = generatingColumns.has(col.id);

            if (editMode) {
              const isDragging = draggedQuestion?.questionId === question.id;
              const isDropTarget = draggedQuestion && draggedQuestion.columnId === col.id && draggedQuestion.rowIndex !== rowIndex;

              return (
                <button
                  key={question.id}
                  onClick={() => setEditingTile({ question, category: col })}
                  draggable={!colGenerating}
                  onDragStart={() => handleDragStart(question.id, col.id, rowIndex)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(col.id, rowIndex)}
                  className={`flex flex-col items-center justify-center rounded-xl font-medium text-sm transition-all duration-150 gap-1 px-2 min-h-[90px] ${
                    colGenerating
                      ? "bg-slate-50 text-slate-400 border-2 border-dashed border-slate-200 cursor-not-allowed"
                      : isDragging
                      ? "bg-blue-50 text-slate-700 border-2 border-dashed border-blue-400 opacity-50"
                      : isDropTarget
                      ? "bg-green-50 text-slate-700 border-2 border-dashed border-green-400"
                      : "bg-white text-slate-700 border-2 border-dashed border-slate-300 hover:bg-slate-50 hover:border-slate-400 cursor-move"
                  }`}
                  disabled={colGenerating}
                >
                  <span className="text-base">{colGenerating ? "⏳" : isDragging ? "↕️" : "✎"}</span>
                  <span className="text-xs text-center leading-tight opacity-60">
                    {question.question ? (
                      <>
                        {question.question.slice(0, 38)}{question.question.length > 38 ? "…" : ""}
                      </>
                    ) : "No question"}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={question.id}
                onClick={() => handleTileClick(question, col)}
                disabled={isUsed}
                className={`flex flex-col items-center justify-center rounded-xl font-semibold transition-all duration-150 min-h-[90px] border relative group ${
                  isUsed
                    ? "bg-slate-50 text-slate-400 border-slate-200 cursor-default"
                    : "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                }`}
                style={
                  !isUsed
                    ? {
                        backgroundColor: "var(--tile-background)",
                        color: "var(--tile-text)",
                        borderColor: "var(--tile-border)",
                      }
                    : undefined
                }
                title={editMode && !isUsed ? `Q: ${question.question}\nA: ${question.answer}` : undefined}
              >
                {isUsed ? (
                  <span className="text-xs uppercase tracking-wider font-bold opacity-50">Used</span>
                ) : (
                  <>
                    <span className="px-3 py-1 rounded-lg font-bold text-sm" style={{ backgroundColor: "var(--accent)", color: "var(--foreground)" }}>
                      ${question.value}
                    </span>
                    {editMode && (
                      <div className="absolute inset-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 rounded-xl flex flex-col items-center justify-center gap-1 z-10 pointer-events-none">
                        <p className="text-[10px] text-white text-center line-clamp-3 leading-tight">
                          {question.question}
                        </p>
                        <p className="text-[9px] text-accent font-bold text-center line-clamp-2">
                          {question.answer}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Play mode: Reset button */}
      {!editMode && usedCount > 0 && (
        <button
          onClick={() => setUsedQuestions(new Set())}
          className="mt-8 btn-secondary hover:bg-slate-50"
        >
          Reset Board
        </button>
      )}

      {/* Play mode: Question modal */}
      {activeQuestion && !editMode && (
        <QuestionModal
          question={activeQuestion.question}
          category={activeQuestion.category}
          onMarkUsed={handleMarkUsed}
          onClose={() => setActiveQuestion(null)}
          assembledPrompt={getAssembledPrompt(activeQuestion.category)}
          onRefreshQuestion={handleRefreshActiveQuestion}
          onRefreshError={(msg) => showToast(msg, "error")}
          teams={teams}
          questionTimerSeconds={gameSettings?.questionTimerSeconds ?? 45}
          stealTimerSeconds={gameSettings?.stealTimerSeconds ?? 10}
          onAwardPoints={handleAwardPoints}
          aiMode={gameSettings?.mode === "ai"}
          gameSettings={gameSettings}
          playSound={playSound}
        />
      )}

      {/* Edit mode: Edit tile modal */}
      {editingTile && editMode && (
        <EditTileModal
          question={editingTile.question}
          categoryTitle={editingTile.category.title}
          rowValues={boardState.rowValues}
          assembledPrompt={getAssembledPrompt(editingTile.category)}
          onSave={(updated) => handleSaveTile(editingTile.category.id, updated)}
          onClose={() => setEditingTile(null)}
        />
      )}

      {/* Power-ups (play mode only) */}
      {!editMode && (
        <PowerUpsDisplay
          teams={teams}
          onUsePowerUp={handleUsePowerUp}
          playSound={playSound}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Saved boards modal */}
      {savedBoardsOpen && (
        <SavedBoardsModal
          currentBoard={boardState}
          onLoad={async (board) => {
            setBoardState(board);
            await saveCurrentBoard(board);
            setUsedQuestions(new Set());
          }}
          onClose={() => setSavedBoardsOpen(false)}
          onToast={(msg, type) => showToast(msg, type)}
        />
      )}

      {/* Column detail modal */}
      {selectedColumnId && boardState && (
        <ColumnDetailModal
          key={selectedColumnId}
          category={boardState.columns.find((col) => col.id === selectedColumnId)!}
          questions={boardState.columns.find((col) => col.id === selectedColumnId)!.questions}
          rowValues={boardState.rowValues}
          onClose={() => setSelectedColumnId(null)}
          onRefreshQuestion={handleRefreshActiveQuestion}
          onReorderQuestions={handleReorderQuestions}
          onGenerateColumn={handleGenerateColumn}
          onDeleteQuestion={handleDeleteQuestion}
          assembledPrompt={getAssembledPrompt(boardState.columns.find((col) => col.id === selectedColumnId)!)}
          isGenerating={generatingColumns.has(selectedColumnId)}
        />
      )}

      {/* Scoreboard sticky footer (play mode only) */}
      {!editMode && (
        <Scoreboard
          teams={teams}
          activeQuestionValue={activeQuestion?.question.value}
          onScoreDelta={handleScoreDelta}
          onScoreSet={handleScoreSet}
        />
      )}
    </div>
  );
}
