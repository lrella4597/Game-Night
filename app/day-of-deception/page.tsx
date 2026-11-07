"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import Link from "next/link";
import AuthModal from "@/app/components/auth/AuthModal";
import { savePlayer } from "@/lib/day-of-deception/playerStorage";

interface PlayingGame {
  sessionId: string;
  joinCode: string;
  status: string;
  playerId: string;
  playerName: string;
  playerToken: string;
}
interface HostingGame {
  sessionId: string;
  joinCode: string;
  status: string;
}

export default function TraitorsDayLandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [playing, setPlaying] = useState<PlayingGame[]>([]);
  const [hosting, setHosting] = useState<HostingGame[]>([]);

  // Games this account is still in, so leaving never means losing your spot
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/day-of-deception/my-games", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPlaying(d.playing || []);
        setHosting(d.hosting || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  function rejoin(g: PlayingGame) {
    savePlayer(g.sessionId, {
      playerId: g.playerId,
      playerName: g.playerName,
      playerToken: g.playerToken,
      joinCode: g.joinCode,
    });
    router.push(`/day-of-deception/play/${g.sessionId}`);
  }

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
        {user && (playing.length > 0 || hosting.length > 0) && (
          <div className="mb-4">
            <p className="text-green-300/70 text-sm uppercase tracking-wider mb-2">Your games</p>
            <div className="flex flex-col gap-2">
              {playing.map((g) => (
                <button
                  key={`p-${g.sessionId}`}
                  onClick={() => rejoin(g)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-green-900/40 border border-green-500/40 hover:bg-green-900/60 text-left transition-all"
                >
                  <span>
                    <span className="block text-white font-semibold">Playing as {g.playerName}</span>
                    <span className="block text-white/50 text-xs font-mono tracking-widest">
                      {g.joinCode} · {g.status === "lobby" ? "waiting to start" : "in progress"}
                    </span>
                  </span>
                  <span className="text-green-300 font-semibold text-sm">Rejoin →</span>
                </button>
              ))}
              {hosting.map((g) => (
                <Link
                  key={`h-${g.sessionId}`}
                  href={`/day-of-deception/host/${g.sessionId}`}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition-all"
                >
                  <span>
                    <span className="block text-white font-semibold">Hosting</span>
                    <span className="block text-white/50 text-xs font-mono tracking-widest">
                      {g.joinCode} · {g.status === "lobby" ? "waiting to start" : "in progress"}
                    </span>
                  </span>
                  <span className="text-green-300 font-semibold text-sm">Open →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

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
