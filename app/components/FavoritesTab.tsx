"use client";

import { useState, useMemo } from "react";
import { useFavorites, type FavoriteQuestion } from "@/lib/data/useFavorites";
import LoadingSpinner from "./LoadingSpinner";

export default function FavoritesTab() {
  const { favorites, removeFavorite, loading } = useFavorites();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const categories = useMemo(
    () => Array.from(new Set(favorites.map((f) => f.categoryName))).sort(),
    [favorites]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return favorites
      .filter((f) => !categoryFilter || f.categoryName === categoryFilter)
      .filter(
        (f) =>
          !q ||
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.categoryName.toLowerCase().includes(q)
      )
      .sort((a, b) => b.savedAt - a.savedAt);
  }, [favorites, search, categoryFilter]);

  async function handleRemove(fav: FavoriteQuestion) {
    await removeFavorite(fav.id);
  }

  // Show loading state while data is loading
  if (loading) {
    return <LoadingSpinner message="Loading favorites..." />;
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-5 pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Favorites
        </h2>
        <p className="text-slate-600 text-sm mt-0.5">
          {favorites.length} saved question{favorites.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions, answers, categories…"
          className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-white border border-slate-200"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-white border border-slate-200"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          {favorites.length === 0
            ? "No favorites yet. Star a question in the Game tab."
            : "No results match your search."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((fav) => (
            <div
              key={fav.id}
              className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Meta */}
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-xs font-semibold tracking-tight uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {fav.categoryName}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent text-slate-900">
                    ${fav.value}
                  </span>
                </div>

                <button
                  onClick={() => handleRemove(fav)}
                  className="text-xs font-semibold px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-all shrink-0"
                >
                  Remove
                </button>
              </div>

              {/* Question */}
              <p className="text-slate-900 text-sm font-semibold leading-snug">
                {fav.question}
              </p>

              {/* Answer */}
              <div className="rounded-lg px-3 py-2 text-sm font-semibold bg-accent/20 text-slate-900 border border-accent/30">
                {fav.answer}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
