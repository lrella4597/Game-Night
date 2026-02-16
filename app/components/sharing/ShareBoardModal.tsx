"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

interface Share {
  id: string;
  sharedWithEmail: string;
  permission: "view" | "edit";
  createdAt: string;
}

interface ShareBoardModalProps {
  boardId: string;
  boardName: string;
  onClose: () => void;
  onToast?: (message: string, type?: "success" | "error") => void;
}

export default function ShareBoardModal({
  boardId,
  boardName,
  onClose,
  onToast,
}: ShareBoardModalProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(true);

  // Load existing shares
  useEffect(() => {
    loadShares();
  }, []);

  async function loadShares() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("board_shares")
        .select("*")
        .eq("board_id", boardId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformed: Share[] = (data || []).map((share) => ({
        id: share.id,
        sharedWithEmail: share.shared_with_email,
        permission: share.permission as "view" | "edit",
        createdAt: share.created_at,
      }));

      setShares(transformed);
    } catch (error) {
      console.error("Error loading shares:", error);
      onToast?.("Failed to load shares", "error");
    } finally {
      setLoadingShares(false);
    }
  }

  async function handleShare() {
    if (!user || !email.trim()) {
      onToast?.("Please enter an email address", "error");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      onToast?.("Please enter a valid email address", "error");
      return;
    }

    // Don't allow sharing with yourself
    if (email.trim().toLowerCase() === user.email?.toLowerCase()) {
      onToast?.("You cannot share a board with yourself", "error");
      return;
    }

    // Check if already shared with this email
    if (shares.some((s) => s.sharedWithEmail.toLowerCase() === email.trim().toLowerCase())) {
      onToast?.("Board already shared with this email", "error");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("board_shares").insert({
        board_id: boardId,
        shared_with_email: email.trim().toLowerCase(),
        permission,
      });

      if (error) throw error;

      onToast?.(`Board shared with ${email}`, "success");
      setEmail("");
      await loadShares();
    } catch (error) {
      console.error("Error sharing board:", error);
      onToast?.("Failed to share board", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveShare(shareId: string) {
    if (!window.confirm("Remove this share?")) return;

    try {
      const { error } = await supabase.from("board_shares").delete().eq("id", shareId);

      if (error) throw error;

      onToast?.("Share removed", "success");
      await loadShares();
    } catch (error) {
      console.error("Error removing share:", error);
      onToast?.("Failed to remove share", "error");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Share Board</h2>
            <p className="text-sm text-slate-600 mt-0.5">{boardName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Share Form */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-700">Share with email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
                placeholder="user@example.com"
                className="flex-1 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-white border border-slate-200 focus:border-accent"
                disabled={loading}
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as "view" | "edit")}
                className="rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-white border border-slate-200"
                disabled={loading}
              >
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
            </div>
            <button
              onClick={handleShare}
              disabled={loading || !email.trim()}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Sharing..." : "Share"}
            </button>
          </div>

          {/* Existing Shares */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Shared with ({shares.length})
            </label>
            {loadingShares ? (
              <div className="text-center py-4 text-slate-400 text-sm">Loading...</div>
            ) : shares.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-sm">
                Not shared with anyone yet
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-slate-900">{share.sharedWithEmail}</span>
                      <span className="text-xs text-slate-500">
                        {share.permission === "view" ? "Can view" : "Can edit"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
