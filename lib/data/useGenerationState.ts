"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export interface FavoriteClue {
  question: string;
  answer: string;
  category: string;
  difficulty: number;
  savedAt: number;
}

export interface DislikedClue {
  question: string;
  answer: string;
  category: string;
  reason?: string;
  rejectedAt: number;
}

export interface GenerationState {
  seen_answers: string[];
  seen_topics: string[];
  seen_clues: string[];
  favorite_clues: FavoriteClue[];
  disliked_clues: DislikedClue[];
}

const EMPTY_STATE: GenerationState = {
  seen_answers: [],
  seen_topics: [],
  seen_clues: [],
  favorite_clues: [],
  disliked_clues: [],
};

export function useGenerationState() {
  const { user } = useAuth();
  const [state, setState] = useState<GenerationState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load generation state from Supabase
  const loadState = useCallback(async () => {
    if (!user) {
      setState(EMPTY_STATE);
      setLoading(false);
      return;
    }

    console.log("🔍 Loading generation state for user:", user.id);

    try {
      const { data, error } = await supabase
        .from("generation_state")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No row exists yet - create one
          console.log("📝 Creating initial generation state...");
          await supabase.from("generation_state").insert({
            user_id: user.id,
            seen_answers: [],
            seen_topics: [],
            seen_clues: [],
            favorite_clues: [],
            disliked_clues: [],
          });
          setState(EMPTY_STATE);
        } else {
          console.error("❌ Error loading generation state:", error);
          throw error;
        }
      } else if (data) {
        console.log("✅ Loaded generation state:", {
          answers: data.seen_answers?.length || 0,
          topics: data.seen_topics?.length || 0,
          clues: data.seen_clues?.length || 0,
        });
        setState({
          seen_answers: data.seen_answers || [],
          seen_topics: data.seen_topics || [],
          seen_clues: data.seen_clues || [],
          favorite_clues: data.favorite_clues || [],
          disliked_clues: data.disliked_clues || [],
        });
      }
    } catch (error) {
      console.error("Error loading generation state:", error);
      setState(EMPTY_STATE);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Add answers, topics, and clues to seen lists
  // Reads fresh from DB first to avoid stale-closure overwrite bugs when called
  // multiple times in quick succession (e.g. regenerating several columns).
  const addToSeen = useCallback(
    async (params: {
      answers?: string[];
      topics?: string[];
      clues?: string[];
    }) => {
      if (!user) return;

      try {
        console.log("💾 Saving to generation state:", params);

        // Always read the latest DB values — never trust the React state snapshot
        // because multiple rapid calls would all start from the same stale baseline.
        const { data: fresh } = await supabase
          .from("generation_state")
          .select("seen_answers, seen_topics, seen_clues, favorite_clues, disliked_clues")
          .eq("user_id", user.id)
          .single();

        const currentAnswers: string[] = fresh?.seen_answers || [];
        const currentTopics: string[] = fresh?.seen_topics || [];
        const currentClues: string[] = fresh?.seen_clues || [];

        // Merge and deduplicate; keep a generous window so repeats are remembered
        // across many sessions (200 answers ≈ 8 full boards)
        const newAnswers = [...new Set([...currentAnswers, ...(params.answers || [])])].slice(-200);
        const newTopics = [...new Set([...currentTopics, ...(params.topics || [])])].slice(-200);
        const newClues = [...new Set([...currentClues, ...(params.clues || [])])].slice(-100);

        const { error } = await supabase
          .from("generation_state")
          .upsert(
            {
              user_id: user.id,
              seen_answers: newAnswers,
              seen_topics: newTopics,
              seen_clues: newClues,
              favorite_clues: fresh?.favorite_clues ?? [],
              disliked_clues: fresh?.disliked_clues ?? [],
            },
            { onConflict: "user_id" }
          );

        if (error) throw error;

        console.log("✅ Generation state saved! Totals:", {
          answers: newAnswers.length,
          topics: newTopics.length,
          clues: newClues.length,
        });
        await loadState();
      } catch (error) {
        console.error("❌ Error adding to seen lists:", error);
      }
    },
    [user, supabase, loadState]  // no 'state' dependency — reads DB directly
  );

  // Add a favorite clue (for style learning)
  const addFavorite = useCallback(
    async (clue: Omit<FavoriteClue, "savedAt">) => {
      if (!user) return;

      try {
        const newFavorite = { ...clue, savedAt: Date.now() };
        const newFavorites = [...state.favorite_clues, newFavorite].slice(-50);

        const { error } = await supabase
          .from("generation_state")
          .upsert(
            {
              user_id: user.id,
              seen_answers: state.seen_answers,
              seen_topics: state.seen_topics,
              seen_clues: state.seen_clues,
              favorite_clues: newFavorites,
              disliked_clues: state.disliked_clues,
            },
            { onConflict: "user_id" }
          );

        if (error) throw error;

        await loadState();
      } catch (error) {
        console.error("Error adding favorite:", error);
      }
    },
    [user, supabase, loadState, state]
  );

  // Add a disliked clue (to avoid in future)
  const addDislike = useCallback(
    async (clue: Omit<DislikedClue, "rejectedAt">) => {
      if (!user) return;

      try {
        const newDislike = { ...clue, rejectedAt: Date.now() };
        const newDislikes = [...state.disliked_clues, newDislike].slice(-100);

        const { error } = await supabase
          .from("generation_state")
          .upsert(
            {
              user_id: user.id,
              seen_answers: state.seen_answers,
              seen_topics: state.seen_topics,
              seen_clues: state.seen_clues,
              favorite_clues: state.favorite_clues,
              disliked_clues: newDislikes,
            },
            { onConflict: "user_id" }
          );

        if (error) throw error;

        await loadState();
      } catch (error) {
        console.error("Error adding dislike:", error);
      }
    },
    [user, supabase, loadState, state]
  );

  // Clear all seen data
  const clearSeen = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("generation_state")
        .upsert(
          {
            user_id: user.id,
            seen_answers: [],
            seen_topics: [],
            seen_clues: [],
            favorite_clues: state.favorite_clues,
            disliked_clues: state.disliked_clues,
          },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      await loadState();
    } catch (error) {
      console.error("Error clearing seen lists:", error);
    }
  }, [user, supabase, loadState, state]);

  return {
    state,
    loading,
    addToSeen,
    addFavorite,
    addDislike,
    clearSeen,
    reload: loadState,
  };
}
