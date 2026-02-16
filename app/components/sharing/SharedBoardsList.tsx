"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { BoardState } from "@/app/data/boardData";

interface SharedBoard {
  id: string;
  name: string;
  ownerEmail: string;
  permission: "view" | "edit";
  boardData: BoardState;
  sharedAt: string;
}

interface SharedBoardsListProps {
  onLoad: (board: BoardState) => void;
  onToast?: (message: string, type?: "success" | "error") => void;
}

export default function SharedBoardsList({ onLoad, onToast }: SharedBoardsListProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [sharedBoards, setSharedBoards] = useState<SharedBoard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedBoards();
  }, [user]);

  async function loadSharedBoards() {
    if (!user?.email) {
      setSharedBoards([]);
      setLoading(false);
      return;
    }

    try {
      // Query boards shared with this user
      const { data: shares, error: sharesError } = await supabase
        .from("board_shares")
        .select(`
          id,
          permission,
          created_at,
          boards (
            id,
            name,
            board_data,
            profiles (
              email
            )
          )
        `)
        .eq("shared_with_email", user.email.toLowerCase())
        .order("created_at", { ascending: false });

      if (sharesError) {
        // If table doesn't exist yet, silently handle it (sharing feature not set up)
        // Check multiple error properties since Supabase can return errors in different formats
        const errorStr = JSON.stringify(sharesError).toLowerCase();
        const isTableMissing =
          sharesError.code === "42P01" ||
          sharesError.code === "PGRST204" ||
          sharesError.message?.toLowerCase().includes("does not exist") ||
          sharesError.message?.toLowerCase().includes("relation") ||
          errorStr.includes("does not exist") ||
          errorStr.includes("42p01");

        if (isTableMissing) {
          setSharedBoards([]);
          setLoading(false);
          return;
        }
        throw sharesError;
      }

      const transformed: SharedBoard[] = (shares || [])
        .filter((share: any) => share.boards) // Filter out shares where board was deleted
        .map((share: any) => ({
          id: share.boards.id,
          name: share.boards.name,
          ownerEmail: share.boards.profiles?.email || "Unknown",
          permission: share.permission,
          boardData: share.boards.board_data,
          sharedAt: share.created_at,
        }));

      setSharedBoards(transformed);
    } catch (error) {
      // Check if it's a "table doesn't exist" error (fallback catch)
      const errorStr = JSON.stringify(error).toLowerCase();
      const isTableMissing =
        errorStr.includes("does not exist") ||
        errorStr.includes("42p01") ||
        errorStr.includes("pgrst204");

      if (isTableMissing) {
        // Silently handle - sharing feature not set up yet
        setSharedBoards([]);
      } else {
        // Only log and show toast for unexpected errors
        console.error("Error loading shared boards:", error);
        onToast?.("Failed to load shared boards", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleLoadBoard(board: SharedBoard) {
    if (board.permission === "view") {
      onToast?.(
        "This board is view-only. You cannot make changes.",
        "error"
      );
    }
    onLoad(board.boardData);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-sm tracking-tight text-slate-900">
            Shared with Me
          </h3>
        </div>
        <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (sharedBoards.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-sm tracking-tight text-slate-900">
            Shared with Me
          </h3>
        </div>
        <div className="p-6 text-center text-slate-400 text-sm">
          No boards shared with you yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-sm tracking-tight text-slate-900">
          Shared with Me ({sharedBoards.length})
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        {sharedBoards.map((board) => (
          <div key={board.id} className="p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-slate-900 truncate">
                    {board.name}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      board.permission === "edit"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {board.permission === "edit" ? "Can Edit" : "View Only"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Shared by {board.ownerEmail}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(board.sharedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleLoadBoard(board)}
                className="btn-primary text-sm whitespace-nowrap"
              >
                Load Board
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
