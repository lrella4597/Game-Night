"use client";

import { useState, useEffect, useCallback } from "react";

export interface CommunityCategory {
  id: string;
  authorId: string;
  authorName: string;
  name: string;
  description: string;
  promptTemplate: string;
  difficultyGuidance: string;
  answerFormatGuidance: string;
  examples: string;
  upvotes: number;
  saveCount: number;
  hasVoted: boolean;
  createdAt: string;
}

interface UseCommunityCategoriesOptions {
  sort?: "hot" | "new" | "top";
  search?: string;
  page?: number;
  limit?: number;
}

export function useCommunityCategories({
  sort = "hot",
  search = "",
  page = 1,
  limit = 20,
}: UseCommunityCategoriesOptions = {}) {
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        sort,
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/community/categories?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load categories");
      }

      const data = await res.json();
      setCategories(data.categories);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [sort, search, page, limit]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const vote = useCallback(async (categoryId: string) => {
    // Optimistic toggle
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== categoryId) return c;
        const wasVoted = c.hasVoted;

        return {
          ...c,
          hasVoted: !wasVoted,
          upvotes: c.upvotes + (wasVoted ? -1 : 1),
        };
      })
    );

    try {
      const res = await fetch("/api/community/categories/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });

      if (!res.ok) {
        fetchCategories();
      }
    } catch {
      fetchCategories();
    }
  }, [fetchCategories]);

  const saveCategory = useCallback(async (communityCategoryId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/community/categories/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityCategoryId }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Failed to save category" };
      }

      // Update save count optimistically
      setCategories((prev) =>
        prev.map((c) =>
          c.id === communityCategoryId ? { ...c, saveCount: c.saveCount + 1 } : c
        )
      );

      return { success: true };
    } catch {
      return { success: false, error: "Failed to save category" };
    }
  }, []);

  const unpublish = useCallback(async (categoryId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/community/categories/${categoryId}`, { method: "DELETE" });
      if (!res.ok) return false;

      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setTotal((prev) => prev - 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    categories,
    loading,
    error,
    total,
    hasMore,
    vote,
    saveCategory,
    unpublish,
    refresh: fetchCategories,
  };
}
