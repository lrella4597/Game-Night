"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { GameBoard } from "@/app/data/boardData";

export type { GameBoard } from "@/app/data/boardData";

export interface SavedBoard {
  id: string;
  name: string;
  board_data: GameBoard;
  created_at: string;
  user_id: string;
}

export function useBoards() {
  const { user } = useAuth();
  const [currentBoard, setCurrentBoard] = useState<GameBoard | null>(null);
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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

      setCurrentBoard(current?.board_data || null);
      setSavedBoards(saved as SavedBoard[]);
    } catch (error) {
      console.error("Error loading boards:", error);
      setCurrentBoard(null);
      setSavedBoards([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

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
    saveCurrentBoard,
    saveBoardToLibrary,
    deleteSavedBoard,
    loadSavedBoard,
    reload: loadBoards,
  };
}
