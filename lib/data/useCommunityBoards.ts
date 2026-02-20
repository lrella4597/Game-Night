"use client";

import { useState, useEffect, useCallback } from "react";
import type { BoardState } from "@/app/data/boardData";

export interface CommunityBoard {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  boardData: BoardState;
  categoryNames: string[];
  mode: "trivia_free4all" | "classic_jeopardy" | null;
  upvotes: number;
  downvotes: number;
  saveCount: number;
  myVote: number | null;
  createdAt: string;
}

interface UseCommunityBoardsOptions {
  sort?: "hot" | "new" | "top";
  search?: string;
  mode?: "trivia_free4all" | "classic_jeopardy" | "";
  page?: number;
  limit?: number;
}

export function useCommunityBoards({
  sort = "hot",
  search = "",
  mode = "",
  page = 1,
  limit = 20,
}: UseCommunityBoardsOptions = {}) {
  const [boards, setBoards] = useState<CommunityBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sort,
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());
      if (mode) params.set("mode", mode);

      const res = await fetch(`/api/community/boards?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load boards");
      }

      const data = await res.json();
      setBoards(data.boards);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boards");
    } finally {
      setLoading(false);
    }
  }, [sort, search, mode, page, limit]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const vote = useCallback(async (boardId: string) => {
    // Upvote-only toggle: if already voted, remove; otherwise add
    setBoards((prev) =>
      prev.map((b) => {
        if (b.id !== boardId) return b;
        const wasVoted = b.myVote === 1;

        return {
          ...b,
          myVote: wasVoted ? null : 1,
          upvotes: b.upvotes + (wasVoted ? -1 : 1),
        };
      })
    );

    try {
      const currentBoard = boards.find((b) => b.id === boardId);
      const actualVote = currentBoard?.myVote === 1 ? 0 : 1;

      const res = await fetch("/api/community/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, vote: actualVote }),
      });

      if (!res.ok) {
        // Revert on error
        fetchBoards();
      }
    } catch {
      fetchBoards();
    }
  }, [boards, fetchBoards]);

  const saveBoard = useCallback(async (communityBoardId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/community/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityBoardId }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Failed to save board" };
      }

      // Update save count optimistically
      setBoards((prev) =>
        prev.map((b) =>
          b.id === communityBoardId ? { ...b, saveCount: b.saveCount + 1 } : b
        )
      );

      return { success: true };
    } catch {
      return { success: false, error: "Failed to save board" };
    }
  }, []);

  const unpublish = useCallback(async (boardId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/community/${boardId}`, { method: "DELETE" });
      if (!res.ok) return false;

      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      setTotal((prev) => prev - 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    boards,
    loading,
    error,
    total,
    hasMore,
    vote,
    saveBoard,
    unpublish,
    refresh: fetchBoards,
  };
}
