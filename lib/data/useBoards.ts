"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { GameBoard } from "@/app/data/boardData";
import { DEFAULT_BOARD_STATE } from "@/app/data/boardData";

export type { GameBoard } from "@/app/data/boardData";

export interface SavedBoard {
  id: string;
  name: string;
  board_data: GameBoard;
  created_at: string;
  user_id: string;
  origin?: string | null;
}

/**
 * Map of default board column titles to their default category library names.
 * Used to link default board columns to the user's seeded categories.
 */
const DEFAULT_CATEGORY_NAMES = ["SCIENCE", "HISTORY", "POP CULTURE", "GEOGRAPHY", "SPORTS", "FOOD & DRINK"];

export function useBoards() {
  const { user } = useAuth();
  const [currentBoard, setCurrentBoard] = useState<GameBoard | null>(null);
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const initRef = useRef(false);
  const supabase = createClient();

  /**
   * Create a default starter board for a new user.
   * Links columns to the user's category_library entries by name.
   * Idempotent — only creates if no current board exists.
   */
  const ensureDefaultBoard = useCallback(async (): Promise<GameBoard | null> => {
    if (!user || initRef.current) return null;
    initRef.current = true;
    setInitializing(true);

    try {
      // Double-check no current board exists (race condition guard)
      const { data: existingBoards } = await supabase
        .from("boards")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_current", true)
        .limit(1);

      if (existingBoards && existingBoards.length > 0) {
        initRef.current = false;
        return null;
      }

      // Fetch user's category library to link columns
      const { data: categories } = await supabase
        .from("category_library")
        .select("id, name")
        .eq("user_id", user.id);

      // Build a name→id lookup (case-insensitive)
      const catLookup = new Map<string, string>();
      (categories || []).forEach((c) => catLookup.set(c.name.toUpperCase(), c.id));

      // Create the default board, linking columns to real library IDs
      const defaultBoard: GameBoard = {
        rowValues: [...DEFAULT_BOARD_STATE.rowValues],
        columns: DEFAULT_BOARD_STATE.columns.map((col) => ({
          ...col,
          categoryLibraryId: catLookup.get(col.title.toUpperCase()) || null,
          questions: col.questions.map((q) => ({ ...q })),
        })),
      };

      // Save as current board
      await supabase.from("boards").insert({
        user_id: user.id,
        name: "Current Board",
        board_data: defaultBoard,
        is_current: true,
      });

      return defaultBoard;
    } catch (err) {
      console.error("Error creating default board:", err);
      return null;
    } finally {
      setInitializing(false);
      initRef.current = false;
    }
  }, [user, supabase]);

  // Load boards from Supabase
  const loadBoards = useCallback(async () => {
    if (!user) {
      setCurrentBoard(null);
      setSavedBoards([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const current = data?.find((b) => b.is_current);
      const saved = data?.filter((b) => !b.is_current) || [];

      if (current) {
        setCurrentBoard(current.board_data);
        setSavedBoards(saved as SavedBoard[]);
      } else {
        // No current board — auto-create a default starter board
        const defaultBoard = await ensureDefaultBoard();
        if (defaultBoard) {
          setCurrentBoard(defaultBoard);
        } else {
          setCurrentBoard(null);
        }
        setSavedBoards(saved as SavedBoard[]);
      }
    } catch (error) {
      console.error("Error loading boards:", error);
      setCurrentBoard(null);
      setSavedBoards([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, ensureDefaultBoard]);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  // Save current board
  const saveCurrentBoard = useCallback(
    async (board: GameBoard) => {
      if (!user) return;

      try {
        // Delete existing current board
        await supabase.from("boards").delete().eq("user_id", user.id).eq("is_current", true);

        // Insert new current board
        await supabase.from("boards").insert({
          user_id: user.id,
          name: "Current Board",
          board_data: board,
          is_current: true,
        });

        setCurrentBoard(board);
      } catch (error) {
        console.error("Error saving current board:", error);
      }
    },
    [user, supabase]
  );

  // Save board to saved boards
  const saveBoardToLibrary = useCallback(
    async (board: GameBoard, name: string) => {
      if (!user) return;

      try {
        await supabase.from("boards").insert({
          user_id: user.id,
          name,
          board_data: board,
          is_current: false,
        });

        await loadBoards();
      } catch (error) {
        console.error("Error saving board to library:", error);
      }
    },
    [user, supabase, loadBoards]
  );

  // Delete saved board
  const deleteSavedBoard = useCallback(
    async (boardId: string) => {
      if (!user) return;

      try {
        await supabase.from("boards").delete().eq("id", boardId);
        await loadBoards();
      } catch (error) {
        console.error("Error deleting board:", error);
      }
    },
    [user, supabase, loadBoards]
  );

  // Load saved board as current
  const loadSavedBoard = useCallback(
    async (boardId: string) => {
      const saved = savedBoards.find((b) => b.id === boardId);
      if (saved) {
        await saveCurrentBoard(saved.board_data);
      }
    },
    [savedBoards, saveCurrentBoard]
  );

  return {
    currentBoard,
    savedBoards,
    loading,
    initializing,
    saveCurrentBoard,
    saveBoardToLibrary,
    deleteSavedBoard,
    loadSavedBoard,
    reload: loadBoards,
  };
}
