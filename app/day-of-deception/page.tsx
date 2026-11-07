"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import Link from "next/link";
import AuthModal from "@/app/components/auth/AuthModal";

export default function TraitorsDayLandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  async function handleCreateGame() {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/day-of-deception/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create game");
      }

      const { sessionId } = await res.json();
      router.push(`/day-of-deception/host/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <h1 className="text-5xl md:text-7xl font-bold text-green-500 mb-2 tracking-tight text-center font-[family-name:var(--font-chalk)]">
        Day of Deception
      </h1>
      <p className="text-xl md:text-2xl text-green-300/70 mb-12 text-center">
        An all-day social deception event
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={handleCreateGame}
          disabled={creating || authLoading}
          className="w-full py-4 px-6 rounded-xl font-bold text-xl bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {creating ? "Creating..." : "Host a Game"}
        </button>

        {!user && !authLoading && (
          <button
            onClick={() => setShowAuth(true)}
            className="text-sm text-green-300/80 hover:text-green-200 underline underline-offset-4 text-center"
          >
            Sign in to host a game
          </button>
        )}

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-green-400/20" />
          <span className="text-green-300/50 text-sm uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-green-400/20" />
        </div>

        <Link
          href="/day-of-deception/play"
          className="w-full py-4 px-6 rounded-xl font-bold text-xl bg-white/10 text-white hover:bg-white/20 transition-all text-center border border-white/20"
        >
          Join a Game
        </Link>

        {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
      </div>

      <Link
        href="/"
        className="mt-12 text-green-400/50 hover:text-white transition-colors text-sm"
      >
        Back to Game Select
      </Link>
    </div>
  );
}
