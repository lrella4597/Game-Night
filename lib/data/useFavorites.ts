"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export interface FavoriteQuestion {
  id: string;
  categoryName: string;
  question: string;
  answer: string;
  value: number;
  savedAt: number;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("favorite_questions")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      if (error) throw error;

      const transformed: FavoriteQuestion[] = (data || []).map((fav) => ({
        id: fav.id,
        categoryName: fav.category_name,
        question: fav.question,
        answer: fav.answer,
        value: fav.value,
        savedAt: new Date(fav.saved_at).getTime(),
      }));

      setFavorites(transformed);
    } catch (error) {
      console.error("Error loading favorites:", error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const addFavorite = useCallback(
    async (categoryName: string, question: string, answer: string, value: number) => {
      if (!user) return;

      try {
        await supabase.from("favorite_questions").insert({
          user_id: user.id,
          category_name: categoryName,
          question,
          answer,
          value,
        });

        await loadFavorites();
      } catch (error) {
        console.error("Error adding favorite:", error);
      }
    },
    [user, supabase, loadFavorites]
  );

  const removeFavorite = useCallback(
    async (favoriteId: string) => {
      if (!user) return;

      try {
        await supabase.from("favorite_questions").delete().eq("id", favoriteId);
        await loadFavorites();
      } catch (error) {
        console.error("Error removing favorite:", error);
      }
    },
    [user, supabase, loadFavorites]
  );

  const removeFavoriteByContent = useCallback(
    async (categoryName: string, question: string, answer: string) => {
      if (!user) return;

      try {
        await supabase
          .from("favorite_questions")
          .delete()
          .eq("user_id", user.id)
          .eq("category_name", categoryName)
          .eq("question", question)
          .eq("answer", answer);
        await loadFavorites();
      } catch (error) {
        console.error("Error removing favorite:", error);
      }
    },
    [user, supabase, loadFavorites]
  );

  const isFavorite = useCallback(
    (categoryName: string, question: string, answer: string) => {
      return favorites.some(
        (fav) =>
          fav.categoryName === categoryName && fav.question === question && fav.answer === answer
      );
    },
    [favorites]
  );

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    removeFavoriteByContent,
    isFavorite,
    reload: loadFavorites,
  };
}
