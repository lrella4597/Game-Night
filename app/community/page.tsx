"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import UserHeader from "@/app/components/auth/UserHeader";
import CommunityBoardCard from "@/app/components/community/CommunityBoardCard";
import CommunityCategoryCard from "@/app/components/community/CommunityCategoryCard";
import { useCommunityBoards, type CommunityBoard } from "@/lib/data/useCommunityBoards";
import { useCommunityCategories } from "@/lib/data/useCommunityCategories";

type ContentTab = "boards" | "categories";
type SortOption = "hot" | "new" | "top";
type ModeFilter = "" | "trivia_free4all" | "classic_jeopardy";

export default function CommunityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Loading...</p>
      </div>
    }>
      <CommunityPageContent />
    </Suspense>
  );
}

function CommunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  // Read initial tab from URL params
  const initialTab = searchParams.get("tab") === "categories" ? "categories" : "boards";
  const [contentTab, setContentTab] = useState<ContentTab>(initialTab);
  const [sort, setSort] = useState<SortOption>("hot");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [boardPage, setBoardPage] = useState(1);
  const [catPage, setCatPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Boards hook
  const {
    boards, loading: boardsLoading, error: boardsError, hasMore: boardsHasMore,
    vote: boardVote, saveBoard, unpublish: boardUnpublish, refresh: boardRefresh,
  } = useCommunityBoards({ sort, search: debouncedSearch, mode: modeFilter, page: boardPage });

  // Categories hook
  const {
    categories, loading: catsLoading, error: catsError, hasMore: catsHasMore,
    vote: catVote, saveCategory, unpublish: catUnpublish, refresh: catRefresh,
  } = useCommunityCategories({ sort, search: debouncedSearch, page: catPage });

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setBoardPage(1);
      setCatPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Reset pages on sort/mode/tab change
  useEffect(() => {
    setBoardPage(1);
    setCatPage(1);
  }, [sort, modeFilter, contentTab]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  async function handleSaveBoard(boardId: string) {
    setSavingId(boardId);
    setSaveError(null);
    const result = await saveBoard(boardId);
    setSavingId(null);
    if (result.success) {
      showToast("Board added to your account!");
    } else {
      setSaveError(result.error || null);
      showToast(result.error || "Failed to save board", "error");
    }
  }

  async function handleSaveCategory(categoryId: string) {
    setSavingId(categoryId);
    setSaveError(null);
    const result = await saveCategory(categoryId);
    setSavingId(null);
    if (result.success) {
      showToast("Category added to your library!");
    } else {
      setSaveError(result.error || null);
      showToast(result.error || "Failed to save category", "error");
    }
  }

  async function handleBoardUnpublish(boardId: string) {
    if (!confirm("Unpublish this board? It will be removed from the community.")) return;
    const ok = await boardUnpublish(boardId);
    if (ok) showToast("Board unpublished");
    else showToast("Failed to unpublish", "error");
  }

  async function handleCatUnpublish(categoryId: string) {
    if (!confirm("Unpublish this category? It will be removed from the community.")) return;
    const ok = await catUnpublish(categoryId);
    if (ok) showToast("Category unpublished");
    else showToast("Failed to unpublish", "error");
  }

  async function handlePlayNow(board: CommunityBoard) {
    setCreatingId(board.id);
    try {
      const res = await fetch("/api/live/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardData: board.boardData }),
      });
      if (!res.ok) {
        showToast("Failed to create game session", "error");
        return;
      }
      const data = await res.json();
      router.push(`/live/host/${data.sessionId}`);
    } catch {
      showToast("Failed to create game session", "error");
    } finally {
      setCreatingId(null);
    }
  }

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold text-slate-900">Community</h1>
        <p className="text-slate-500 text-center">Sign in to browse and share boards and categories with the community.</p>
        <div className="mt-2">
          <UserHeader />
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 mt-4">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  const isLoading = contentTab === "boards" ? boardsLoading : catsLoading;
  const hasError = contentTab === "boards" ? boardsError : catsError;
  const onRefresh = contentTab === "boards" ? boardRefresh : catRefresh;

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-8 px-4">
      {/* User header */}
      <div className="fixed top-4 right-4 z-10">
        <UserHeader />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
            toast.type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-3xl mb-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">Community</h1>
        <p className="text-slate-500 mt-1">Browse and share boards and categories</p>
      </div>

      {/* Content tabs: Boards | Categories */}
      <div className="w-full max-w-3xl mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setContentTab("boards")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
              contentTab === "boards"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Boards
          </button>
          <button
            onClick={() => setContentTab("categories")}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-all ${
              contentTab === "categories"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Categories
          </button>
        </div>
      </div>

      {/* Controls row: sort + mode filter + search */}
      <div className="w-full max-w-3xl flex flex-col sm:flex-row gap-3 mb-4">
        {/* Sort tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["hot", "new", "top"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSort(option)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                sort === option
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {option === "hot" ? "Hot" : option === "new" ? "New" : "Top"}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={contentTab === "boards" ? "Search boards..." : "Search categories..."}
          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
        />
      </div>

      {/* Mode filter (boards tab only) */}
      {contentTab === "boards" && (
        <div className="w-full max-w-3xl flex gap-2 mb-4">
          {([
            { value: "" as ModeFilter, label: "All Modes" },
            { value: "trivia_free4all" as ModeFilter, label: "Trivia Free4All" },
            { value: "classic_jeopardy" as ModeFilter, label: "Classic Jeopardy" },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setModeFilter(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                modeFilter === value
                  ? value === "trivia_free4all"
                    ? "bg-lime-100 text-lime-700 border-lime-300"
                    : value === "classic_jeopardy"
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content list */}
      <div className="w-full max-w-3xl flex flex-col gap-3">
        {isLoading && (contentTab === "boards" ? boards.length === 0 : categories.length === 0) ? (
          <div className="text-center py-16">
            <p className="text-slate-400 animate-pulse">
              Loading {contentTab === "boards" ? "boards" : "categories"}...
            </p>
          </div>
        ) : hasError ? (
          <div className="text-center py-16">
            <p className="text-red-500">{hasError}</p>
            <button
              onClick={onRefresh}
              className="mt-3 text-sm text-slate-500 hover:text-slate-700"
            >
              Try again
            </button>
          </div>
        ) : contentTab === "boards" ? (
          /* ─── Boards list ─── */
          boards.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-lg font-medium">No boards found</p>
              <p className="text-slate-400 text-sm mt-1">
                {debouncedSearch
                  ? "Try a different search term"
                  : "Be the first to publish a board!"}
              </p>
            </div>
          ) : (
            <>
              {boards.map((board) => (
                <CommunityBoardCard
                  key={board.id}
                  board={board}
                  onVote={boardVote}
                  onSave={handleSaveBoard}
                  onUnpublish={handleBoardUnpublish}
                  onPlayNow={creatingId ? undefined : handlePlayNow}
                  isOwnBoard={board.authorId === user.id}
                  saving={savingId === board.id}
                  saveError={savingId === board.id ? saveError : null}
                />
              ))}
              {boardsHasMore && (
                <button
                  onClick={() => setBoardPage((p) => p + 1)}
                  disabled={boardsLoading}
                  className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  {boardsLoading ? "Loading..." : "Load More"}
                </button>
              )}
            </>
          )
        ) : (
          /* ─── Categories list ─── */
          categories.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-lg font-medium">No categories found</p>
              <p className="text-slate-400 text-sm mt-1">
                {debouncedSearch
                  ? "Try a different search term"
                  : "Be the first to publish a category! Go to your Categories tab and publish one."}
              </p>
            </div>
          ) : (
            <>
              {categories.map((category) => (
                <CommunityCategoryCard
                  key={category.id}
                  category={category}
                  onVote={catVote}
                  onSave={handleSaveCategory}
                  onUnpublish={handleCatUnpublish}
                  isOwnCategory={category.authorId === user.id}
                  saving={savingId === category.id}
                  saveError={savingId === category.id ? saveError : null}
                />
              ))}
              {catsHasMore && (
                <button
                  onClick={() => setCatPage((p) => p + 1)}
                  disabled={catsLoading}
                  className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  {catsLoading ? "Loading..." : "Load More"}
                </button>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
