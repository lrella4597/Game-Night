"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import Link from "next/link";

export default function LiveLandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateGame() {
    if (!user) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/live/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create game");
      }

      const { sessionId } = await res.json();
      router.push(`/live/host/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* Title */}
      <h1 className="text-5xl md:text-7xl font-bold text-[#FFD700] mb-2 tracking-tight text-center">
        Classic Jeopardy
      </h1>
      <p className="text-xl md:text-2xl text-blue-200 mb-12 text-center">
        Live Multiplayer
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* Create Game */}
        <button
          onClick={handleCreateGame}
          disabled={creating || authLoading || !user}
          className="w-full py-4 px-6 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {creating ? "Creating..." : "Host a Game"}
        </button>

        {!user && !authLoading && (
          <p className="text-sm text-blue-300 text-center">
            Sign in to host a game
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-blue-400/30" />
          <span className="text-blue-300 text-sm uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-blue-400/30" />
        </div>

        {/* Join Game */}
        <Link
          href="/live/play"
          className="w-full py-4 px-6 rounded-xl font-bold text-xl bg-white/10 text-white hover:bg-white/20 transition-all text-center border border-white/20"
        >
          Join a Game
        </Link>

        {error && (
          <p className="text-red-300 text-sm text-center mt-2">{error}</p>
        )}
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="mt-12 text-blue-300 hover:text-white transition-colors text-sm"
      >
        Back to Game Select
      </Link>
    </div>
  );
}
