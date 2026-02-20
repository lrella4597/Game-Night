"use client";

import { useState } from "react";
import type { CommunityCategory } from "@/lib/data/useCommunityCategories";

interface CommunityCategoryCardProps {
  category: CommunityCategory;
  onVote: (categoryId: string) => void;
  onSave: (categoryId: string) => void;
  onUnpublish?: (categoryId: string) => void;
  isOwnCategory: boolean;
  saving?: boolean;
  saveError?: string | null;
}

export default function CommunityCategoryCard({
  category,
  onVote,
  onSave,
  onUnpublish,
  isOwnCategory,
  saving,
  saveError,
}: CommunityCategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const timeAgo = formatTimeAgo(category.createdAt);

  const hasPromptPreview = category.promptTemplate && category.promptTemplate.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Vote column — upvote only */}
      <div className="flex flex-col items-center gap-0.5 pt-1">
        <button
          onClick={() => onVote(category.id)}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
            category.hasVoted
              ? "text-orange-500 bg-orange-50"
              : "text-slate-400 hover:text-orange-500 hover:bg-orange-50"
          }`}
          title={category.hasVoted ? "Remove upvote" : "Upvote"}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M12 4l-8 8h5v8h6v-8h5z" />
          </svg>
        </button>
        <span className={`text-sm font-bold tabular-nums ${
          category.hasVoted ? "text-orange-500" : "text-slate-500"
        }`}>
          {category.upvotes}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-slate-900 truncate">{category.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          by {category.authorName} · {timeAgo}
        </p>

        {category.description && (
          <p className="text-sm text-slate-600 mt-1.5 line-clamp-2">{category.description}</p>
        )}

        {/* Prompt preview (expandable) */}
        {hasPromptPreview && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium text-[#060CE9] hover:text-[#3b3ff0] transition-colors"
            >
              {expanded ? "Hide prompt details" : "Show prompt details"}
            </button>
            {expanded && (
              <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-2">
                {category.promptTemplate && (
                  <div>
                    <span className="font-semibold text-slate-900">Prompt:</span>
                    <p className="mt-0.5 whitespace-pre-wrap">{category.promptTemplate}</p>
                  </div>
                )}
                {category.difficultyGuidance && (
                  <div>
                    <span className="font-semibold text-slate-900">Difficulty:</span>
                    <p className="mt-0.5">{category.difficultyGuidance}</p>
                  </div>
                )}
                {category.answerFormatGuidance && (
                  <div>
                    <span className="font-semibold text-slate-900">Answer Format:</span>
                    <p className="mt-0.5">{category.answerFormatGuidance}</p>
                  </div>
                )}
                {category.examples && (
                  <div>
                    <span className="font-semibold text-slate-900">Examples:</span>
                    <p className="mt-0.5 whitespace-pre-wrap">{category.examples}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-3 mt-3">
          {isOwnCategory ? (
            <button
              onClick={() => onUnpublish?.(category.id)}
              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => onSave(category.id)}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add to My Library"}
            </button>
          )}
          <span className="text-xs text-slate-400">
            {category.saveCount} save{category.saveCount !== 1 ? "s" : ""}
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
