"use client";

import { useState } from "react";
import { useBoards } from "@/lib/data/useBoards";
import type { BoardState } from "../data/boardData";
import ShareBoardModal from "./sharing/ShareBoardModal";
import SharedBoardsList from "./sharing/SharedBoardsList";

interface SavedBoardsModalProps {
  currentBoard: BoardState;
  onLoad: (board: BoardState) => void;
  onClose: () => void;
  onToast: (message: string, type?: "success" | "error") => void;
}

export default function SavedBoardsModal({
  currentBoard,
  onLoad,
  onClose,
  onToast,
}: SavedBoardsModalProps) {
  const { savedBoards, saveBoardToLibrary, deleteSavedBoard } = useBoards();
  const [saveName, setSaveName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [sharingBoardId, setSharingBoardId] = useState<string | null>(null);
  const [sharingBoardName, setSharingBoardName] = useState("");

  async function handleSave() {
    if (!saveName.trim()) return;
    await saveBoardToLibrary(currentBoard, saveName.trim());
    setSaveName("");
    onToast("Board saved!");
  }

  function handleLoad(boardData: BoardState, name: string) {
    if (!window.confirm(`Load "${name}"? This replaces your current board.`)) return;
    onLoad(boardData);
    onToast(`Loaded "${name}"`);
    onClose();
  }

  async function handleDelete(id: string) {
    await deleteSavedBoard(id);
    setDeleteConfirmId(null);
    onToast("Board deleted", "error");
  }

  function handleShare(boardId: string, boardName: string) {
    setSharingBoardId(boardId);
    setSharingBoardName(boardName);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col gap-5 p-8"
        style={{
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-tight text-slate-600">
              Saved Boards
            </p>
            <p className="text-base font-semibold tracking-tight text-slate-900">
              {savedBoards.length} board{savedBoards.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Save current board */}
        <div className="flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="Name this board…"
            maxLength={50}
            className="flex-1 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              saveName.trim()
                ? "btn-primary"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>

        {/* My Boards */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-slate-700">My Boards</h3>
          {savedBoards.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              No saved boards yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...savedBoards].reverse().map((b) => {
                const isDeleting = deleteConfirmId === b.id;
                return (
                  <div
                    key={b.id}
                    className={`rounded-xl border p-3 flex flex-col gap-2 ${
                      isDeleting
                        ? "bg-red-50 border-red-300"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold tracking-tight text-sm truncate text-slate-900">
                          {b.name}
                        </p>
                        <p className="text-slate-600 text-xs mt-0.5">
                          {b.board_data.columns.length} columns · {b.board_data.rowValues.length} rows · saved {formatDate(b.created_at)}
                        </p>
                      </div>

                      {!isDeleting && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleLoad(b.board_data, b.name)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-white transition-all"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleShare(b.id, b.name)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            Share
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(b.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                  {isDeleting && (
                    <div className="flex items-center gap-3 pt-1">
                      <p className="text-sm text-red-700 flex-1">
                        Delete <strong>{b.name}</strong>? This cannot be undone.
                      </p>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold btn-secondary hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Shared with Me */}
        <div className="mt-6">
          <SharedBoardsList onLoad={onLoad} onToast={onToast} />
        </div>
      </div>

      {/* Share Modal */}
      {sharingBoardId && (
        <ShareBoardModal
          boardId={sharingBoardId}
          boardName={sharingBoardName}
          onClose={() => {
            setSharingBoardId(null);
            setSharingBoardName("");
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
}
