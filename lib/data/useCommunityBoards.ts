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
  upvotes: number;
  downvotes: number;
  saveCount: number;
  myVote: number | null;
  createdAt: string;
}

interface UseCommunityBoardsOptions {
  sort?: "hot" | "new" | "top";
  search?: string;
  page?: number;
  limit?: number;
}

export function useCommunityBoards({
  sort = "hot",
  search = "",
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
  }, [sort, search, page, limit]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const vote = useCallback(async (boardId: string, voteValue: number) => {
    // Optimistic update
    setBoards((prev) =>
      prev.map((b) => {
        if (b.id !== boardId) return b;
        const oldVote = b.myVote;
        const newVote = oldVote === voteValue ? 0 : voteValue;

        let upDelta = 0;
        let downDelta = 0;

        // Remove old vote effect
        if (oldVote === 1) upDelta--;
        if (oldVote === -1) downDelta--;

        // Apply new vote effect
        if (newVote === 1) upDelta++;
        if (newVote === -1) downDelta++;

        return {
          ...b,
          myVote: newVote === 0 ? null : newVote,
          upvotes: b.upvotes + upDelta,
          downvotes: b.downvotes + downDelta,
        };
      })
    );

    try {
      const currentBoard = boards.find((b) => b.id === boardId);
      const actualVote = currentBoard?.myVote === voteValue ? 0 : voteValue;

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

  const saveBoard = useCallback(async (communityBoardId: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/community/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityBoardId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save board");
      }

      // Update save count optimistically
      setBoards((prev) =>
        prev.map((b) =>
          b.id === communityBoardId ? { ...b, saveCount: b.saveCount + 1 } : b
        )
      );

      return true;
    } catch {
      return false;
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
