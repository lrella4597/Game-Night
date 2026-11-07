"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import Link from "next/link";
import AuthModal from "@/app/components/auth/AuthModal";
import { savePlayer } from "@/lib/day-of-deception/playerStorage";
import { Button, Eyebrow, Icon, Screen, display } from "@/app/components/day-of-deception/ui";

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

  const statusLabel = (st: string) => (st === "lobby" ? "Waiting to start" : "In progress");

  return (
    <Screen center>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      <div className="text-center">
        <Eyebrow className="!text-[#E8C67A]">A game that lasts all day</Eyebrow>
        <h1 className={`${display} mt-4 text-7xl leading-none text-white`}>
          <span className="italic text-[#E8C67A]">Traitors</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xs text-[15px] leading-relaxed text-white/55">
          Some of your friends are secretly Traitors. Find them before the day is out.
        </p>
      </div>

      {user && (playing.length > 0 || hosting.length > 0) && (
        <div className="mt-10">
          <Eyebrow className="mb-3">Your games</Eyebrow>
          <div className="space-y-2">
            {playing.map((g) => (
              <button
                key={`p-${g.sessionId}`}
                onClick={() => rejoin(g)}
                className="flex w-full items-center gap-4 rounded-2xl border border-[#E8C67A]/25 bg-[#E8C67A]/[0.06] px-4 py-3.5 text-left transition-colors hover:bg-[#E8C67A]/[0.1]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-white">Playing as {g.playerName}</p>
                  <p className="mt-0.5 text-xs text-white/45">
                    <span className="font-mono tracking-widest">{g.joinCode}</span> · {statusLabel(g.status)}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-[#E8C67A]">
                  Rejoin <Icon name="arrow" className="h-4 w-4" />
                </span>
              </button>
            ))}
            {hosting.map((g) => (
              <Link
                key={`h-${g.sessionId}`}
                href={`/day-of-deception/host/${g.sessionId}`}
                className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 transition-colors hover:bg-white/[0.06]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-white">Hosting</p>
                  <p className="mt-0.5 text-xs text-white/45">
                    <span className="font-mono tracking-widest">{g.joinCode}</span> · {statusLabel(g.status)}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-white/70">
                  Open <Icon name="arrow" className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 space-y-3">
        <Link
          href="/day-of-deception/play"
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#E8C67A] text-base font-semibold text-[#18130A] shadow-[0_8px_30px_-12px_rgba(232,198,122,0.6)] transition-colors hover:bg-[#F1D597]"
        >
          Join a game
        </Link>
        <Button variant="secondary" size="lg" full onClick={handleCreateGame} disabled={creating || authLoading}>
          {creating ? "Creating" : "Host a game"}
        </Button>
        {!user && !authLoading && (
          <p className="pt-1 text-center text-xs text-white/40">You&apos;ll sign in first to host.</p>
        )}
        {error && <p className="text-center text-sm text-rose-300">{error}</p>}
      </div>

      <Link href="/" className="mt-12 text-center text-xs text-white/30 transition-colors hover:text-white/60">
        All Game Night games
      </Link>
    </Screen>
  );
}
