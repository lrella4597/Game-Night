"use client";

import { useState, useEffect, useRef } from "react";
import { useCategoryLibrary, type CategoryPrompt } from "@/lib/data/useCategoryLibrary";
import { useBoards, type SavedBoard } from "@/lib/data/useBoards";
import { useCommunityBoards, type CommunityBoard } from "@/lib/data/useCommunityBoards";
import { DEFAULT_LIBRARY } from "@/app/data/categoryLibrary";
import { assemblePrompt } from "@/app/lib/generatePrompt";
import type { BoardState } from "@/app/data/boardData";

interface BoardPickerProps {
  onBoardReady: (board: BoardState) => void;
  rowValues?: number[];
}

type Tab = "generate" | "saved" | "community";

const DEFAULT_ROW_VALUES = [200, 400, 600, 800, 1000];

export default function BoardPicker({ onBoardReady, rowValues }: BoardPickerProps) {
  const ROW_VALUES = rowValues ?? DEFAULT_ROW_VALUES;
  const { categories: userCategories, loading: catLoading } = useCategoryLibrary();
  const { savedBoards, currentBoard, loading: boardsLoading } = useBoards();

  const [tab, setTab] = useState<Tab>("generate");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merge user categories with defaults (user first, then defaults not in user list)
  const allCategories: CategoryPrompt[] = [
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

  function toggleCategory(id: string) {
    setSelectedCats((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 6) return prev; // max 6 categories
      return [...prev, id];
    });
  }

  async function handleGenerate() {
    if (selectedCats.length < 1) return;
    setGenerating(true);
    setError(null);

    try {
      const columns = selectedCats.map((catId) => {
        const cat = allCategories.find((c) => c.id === catId)!;
        return {
          categoryId: catId,
          categoryName: cat.name,
          categoryPrompt: assemblePrompt(cat, ROW_VALUES),
          rowValues: ROW_VALUES,
        };
      });

      const res = await fetch("/api/generate/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Board generation failed");
      }

      const data = await res.json();

      // Build BoardState from response
      const board: BoardState = {
        rowValues: ROW_VALUES,
        columns: data.columns.map((col: { categoryId: string; items: Array<{ value: number; question: string; answer: string }> }) => {
          const cat = allCategories.find((c) => c.id === col.categoryId)!;
          return {
            id: col.categoryId,
            title: cat.name,
            categoryLibraryId: col.categoryId,
            questions: col.items.map((item: { value: number; question: string; answer: string }, idx: number) => ({
              id: `${col.categoryId}-${idx}`,
              value: item.value || ROW_VALUES[idx],
              question: item.question,
              answer: item.answer,
            })),
          };
        }),
      };

      onBoardReady(board);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  }

  function handleLoadBoard(board: BoardState) {
    onBoardReady(board);
  }

  return (
    <div className="w-full max-w-3xl">
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("generate")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            tab === "generate"
              ? "bg-[#FFD700] text-[#060CE9]"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Generate with AI
        </button>
        <button
          onClick={() => setTab("saved")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            tab === "saved"
              ? "bg-[#FFD700] text-[#060CE9]"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Load Saved Board
        </button>
        <button
          onClick={() => setTab("community")}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            tab === "community"
              ? "bg-[#FFD700] text-[#060CE9]"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          Community
        </button>
      </div>

      {/* Generate tab */}
      {tab === "generate" && (
        <div>
          <p className="text-blue-200 text-sm mb-4">
            Select 1-6 categories for your board ({selectedCats.length}/6 selected)
          </p>

          {catLoading ? (
            <p className="text-blue-300 animate-pulse">Loading categories...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
              {allCategories.map((cat) => {
                const isSelected = selectedCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    disabled={generating}
                    className={`px-3 py-3 rounded-lg text-sm font-medium text-left transition-all border ${
                      isSelected
                        ? "bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    } ${generating ? "opacity-50" : ""}`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="text-red-300 text-sm mb-4">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={selectedCats.length < 1 || generating}
            className="w-full py-3 rounded-xl font-bold text-lg bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {generating ? "Generating Board..." : `Generate Board (${selectedCats.length} categories)`}
          </button>

          {generating && (
            <p className="text-blue-300 text-sm text-center mt-3 animate-pulse">
              AI is creating your questions... this may take 15-30 seconds
            </p>
          )}
        </div>
      )}

      {/* Saved boards tab */}
      {tab === "saved" && (
        <div>
          {boardsLoading ? (
            <p className="text-blue-300 animate-pulse">Loading boards...</p>
          ) : (
            <>
              {currentBoard && (
                <div className="mb-4">
                  <p className="text-blue-300 text-sm mb-2">Current Board</p>
                  <button
                    onClick={() => handleLoadBoard(currentBoard)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-left transition-all border border-white/10"
                  >
                    <span className="font-medium">Current Board</span>
                    <span className="text-blue-300 text-sm ml-2">
                      ({currentBoard.columns.length} categories)
                    </span>
                  </button>
                </div>
              )}

              {savedBoards.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-blue-300 text-sm mb-1">Saved Boards</p>
                  {savedBoards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => handleLoadBoard(board.board_data)}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-left transition-all border border-white/10"
                    >
                      <span className="font-medium">{board.name}</span>
                      <span className="text-blue-300 text-sm ml-2">
                        ({board.board_data.columns.length} categories)
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                !currentBoard && (
                  <p className="text-blue-400 text-center py-8">
                    No saved boards. Generate one first or save a board from the Board Builder.
                  </p>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* Community tab */}
      {tab === "community" && <CommunityBoardBrowser onSelectBoard={handleLoadBoard} />}
    </div>
  );
}

/* ── Inline community browser for the BoardPicker ── */

function CommunityBoardBrowser({ onSelectBoard }: { onSelectBoard: (board: BoardState) => void }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { boards, loading, error } = useCommunityBoards({
    sort: "top",
    search: debouncedSearch,
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search community boards..."
        className="w-full mb-4 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:border-[#FFD700]"
      />

      {loading ? (
        <p className="text-blue-300 animate-pulse text-center py-8">Loading community boards...</p>
      ) : error ? (
        <p className="text-red-300 text-sm text-center py-8">{error}</p>
      ) : boards.length === 0 ? (
        <p className="text-blue-400 text-center py-8">
          {debouncedSearch ? "No boards match your search." : "No community boards yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
          {boards.map((b) => {
            const score = b.upvotes - b.downvotes;
            return (
              <button
                key={b.id}
                onClick={() => onSelectBoard(b.boardData)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-left transition-all border border-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{b.title}</p>
                    <p className="text-blue-300 text-xs mt-0.5">
                      by {b.authorName} · {b.boardData.columns.length} categories
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-blue-300">
                    <span>{score >= 0 ? "+" : ""}{score} votes</span>
                    <span>{b.saveCount} saves</span>
                  </div>
                </div>
                {b.categoryNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {b.categoryNames.slice(0, 6).map((name) => (
                      <span
                        key={name}
                        className="px-2 py-0.5 rounded-full bg-white/10 text-blue-200 text-[10px]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
