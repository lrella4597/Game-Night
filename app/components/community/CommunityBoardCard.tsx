"use client";

import type { CommunityBoard } from "@/lib/data/useCommunityBoards";

interface CommunityBoardCardProps {
  board: CommunityBoard;
  onVote: (boardId: string) => void;
  onSave: (boardId: string) => void;
  onUnpublish?: (boardId: string) => void;
  onPlayNow?: (board: CommunityBoard) => void;
  isOwnBoard: boolean;
  saving?: boolean;
  saveError?: string | null;
}

export default function CommunityBoardCard({
  board,
  onVote,
  onSave,
  onUnpublish,
  onPlayNow,
  isOwnBoard,
  saving,
  saveError,
}: CommunityBoardCardProps) {
  const timeAgo = formatTimeAgo(board.createdAt);
  const hasVoted = board.myVote === 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Vote column — upvote only */}
      <div className="flex flex-col items-center gap-0.5 pt-1">
        <button
          onClick={() => onVote(board.id)}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
            hasVoted
              ? "text-orange-500 bg-orange-50"
              : "text-slate-400 hover:text-orange-500 hover:bg-orange-50"
          }`}
          title={hasVoted ? "Remove upvote" : "Upvote"}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M12 4l-8 8h5v8h6v-8h5z" />
          </svg>
        </button>
        <span className={`text-sm font-bold tabular-nums ${
          hasVoted ? "text-orange-500" : "text-slate-500"
        }`}>
          {board.upvotes}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 truncate">{board.title}</h3>
          {board.mode && (
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              board.mode === "trivia_free4all"
                ? "bg-lime-100 text-lime-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {board.mode === "trivia_free4all" ? "Trivia" : "Jeopardy"}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          by {board.authorName} · {timeAgo}
        </p>

        {board.description && (
          <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{board.description}</p>
        )}

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {board.categoryNames.map((cat, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-3 mt-3">
          {onPlayNow && (
            <button
              onClick={() => onPlayNow(board)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#060CE9] text-white hover:bg-[#3b3ff0] transition-all"
            >
              Play Now
            </button>
          )}
          {isOwnBoard ? (
            <button
              onClick={() => onUnpublish?.(board.id)}
              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => onSave(board.id)}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add to My Account"}
            </button>
          )}
          <span className="text-xs text-slate-400">
            {board.saveCount} save{board.saveCount !== 1 ? "s" : ""}
          </span>
          {saveError && (
            <span className="text-xs text-red-500">{saveError}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
