"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import UserHeader from "@/app/components/auth/UserHeader";
import CommunityBoardCard from "@/app/components/community/CommunityBoardCard";
import { useCommunityBoards, type CommunityBoard } from "@/lib/data/useCommunityBoards";

type SortOption = "hot" | "new" | "top";

export default function CommunityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sort, setSort] = useState<SortOption>("hot");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const { boards, loading, error, hasMore, vote, saveBoard, unpublish, refresh } =
    useCommunityBoards({ sort, search: debouncedSearch, page });

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  // Reset page on sort change
  useEffect(() => {
    setPage(1);
  }, [sort]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  async function handleSave(boardId: string) {
    setSavingId(boardId);
    const ok = await saveBoard(boardId);
    setSavingId(null);
    if (ok) {
      showToast("Board saved to your library!");
    } else {
      showToast("Failed to save board", "error");
    }
  }

  async function handleUnpublish(boardId: string) {
    if (!confirm("Unpublish this board? It will be removed from the community.")) return;
    const ok = await unpublish(boardId);
    if (ok) {
      showToast("Board unpublished");
    } else {
      showToast("Failed to unpublish", "error");
    }
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
        <h1 className="text-2xl font-bold text-slate-900">Community Boards</h1>
        <p className="text-slate-500 text-center">Sign in to browse and share boards with the community.</p>
        <div className="mt-2">
          <UserHeader />
        </div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 mt-4">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

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
      <div className="w-full max-w-3xl mb-8">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">Community Boards</h1>
        <p className="text-slate-500 mt-1">Browse boards shared by other players</p>
      </div>

      {/* Controls */}
      <div className="w-full max-w-3xl flex flex-col sm:flex-row gap-4 mb-6">
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
          placeholder="Search boards or categories..."
          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-slate-400 bg-white"
        />
      </div>

      {/* Board list */}
      <div className="w-full max-w-3xl flex flex-col gap-3">
        {loading && boards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 animate-pulse">Loading community boards...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500">{error}</p>
            <button
              onClick={refresh}
              className="mt-3 text-sm text-slate-500 hover:text-slate-700"
            >
              Try again
            </button>
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-lg font-medium">No boards found</p>
            <p className="text-slate-400 text-sm mt-1">
              {debouncedSearch
                ? "Try a different search term"
                : "Be the first to publish a board! Save a board in Trivia mode, then publish it."}
            </p>
          </div>
        ) : (
          <>
            {boards.map((board) => (
              <CommunityBoardCard
                key={board.id}
                board={board}
                onVote={vote}
                onSave={handleSave}
                onUnpublish={handleUnpublish}
                onPlayNow={creatingId ? undefined : handlePlayNow}
                isOwnBoard={board.authorId === user.id}
                saving={savingId === board.id}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="w-full py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
