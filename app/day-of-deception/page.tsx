"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import Link from "next/link";
import AuthModal from "@/app/components/auth/AuthModal";
import { savePlayer } from "@/lib/day-of-deception/playerStorage";
import { Button, Eyebrow, Icon, Screen, display } from "@/app/components/day-of-deception/ui";

interface MyGame {
  sessionId: string;
  joinCode: string;
  status: string;
  createdAt: string;
  isHost: boolean;
  player: { playerId: string; playerName: string; playerToken: string } | null;
}

// Games a player removed from their list on this phone
const HIDDEN_KEY = "dod_hidden_games";
function loadHidden(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]");
  } catch {
    return [];
  }
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today ${time}`;
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function TraitorsDayLandingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [games, setGames] = useState<MyGame[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Games this account is still in, so leaving never means losing your spot
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/day-of-deception/my-games", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const hidden = loadHidden();
        setGames((d.games || []).filter((g: MyGame) => !hidden.includes(g.sessionId)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Playing (even if also hosting): the player screen, which has a Host button
  function open(g: MyGame) {
    if (g.player) {
      savePlayer(g.sessionId, { ...g.player, joinCode: g.joinCode });
      router.push(`/day-of-deception/play/${g.sessionId}`);
    } else {
      router.push(`/day-of-deception/host/${g.sessionId}`);
    }
  }

  async function remove(g: MyGame) {
    setConfirmDelete(null);
    setGames((list) => list.filter((x) => x.sessionId !== g.sessionId));
    if (g.isHost) {
      await fetch("/api/day-of-deception/delete-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: g.sessionId }),
      }).catch(() => {});
    } else {
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify([...loadHidden(), g.sessionId]));
      } catch {
        // Private mode: it just comes back next time
      }
    }
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

  const statusLabel = (st: string) => (st === "lobby" ? "Waiting to start" : st === "finished" ? "Ended" : "In progress");
  const title = (g: MyGame) =>
    g.isHost && g.player ? `Hosting and playing as ${g.player.playerName}` : g.player ? `Playing as ${g.player.playerName}` : "Hosting";

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

      {user && games.length > 0 && (
        <div className="mt-10">
          <Eyebrow className="mb-3">Your games</Eyebrow>
          <div className="space-y-2">
            {games.map((g) => {
              const live = g.status !== "finished";
              return (
                <div
                  key={g.sessionId}
                  className={`rounded-2xl border px-4 py-3.5 ${
                    live ? "border-[#E8C67A]/25 bg-[#E8C67A]/[0.06]" : "border-white/[0.08] bg-white/[0.03]"
                  }`}
                >
                  {confirmDelete === g.sessionId ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-white/70">
                        {g.isHost ? "Delete this game for everyone?" : "Remove it from your list?"}
                      </p>
                      <div className="flex shrink-0 gap-3 text-sm">
                        <button onClick={() => setConfirmDelete(null)} className="text-white/50">
                          Cancel
                        </button>
                        <button onClick={() => remove(g)} className="font-medium text-rose-300">
                          {g.isHost ? "Delete" : "Remove"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button onClick={() => open(g)} className="min-w-0 flex-1 text-left">
                        <p className={`truncate text-[15px] font-medium ${live ? "text-white" : "text-white/60"}`}>{title(g)}</p>
                        <p className="mt-0.5 text-xs text-white/45">
                          <span className="font-mono tracking-widest">{g.joinCode}</span> · {statusLabel(g.status)} ·{" "}
                          {when(g.createdAt)}
                        </p>
                      </button>
                      {g.isHost && g.player && live && (
                        <Link
                          href={`/day-of-deception/host/${g.sessionId}`}
                          className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-xs font-medium text-white/70 hover:text-white"
                        >
                          {g.status === "lobby" ? "QR & setup" : "Host screen"}
                        </Link>
                      )}
                      <button onClick={() => open(g)} className="flex items-center gap-1 text-sm font-medium text-[#E8C67A]">
                        Open <Icon name="arrow" className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(g.sessionId)}
                        aria-label={g.isHost ? "Delete game" : "Remove from list"}
                        className="-mr-1 p-1 text-white/30 hover:text-rose-300"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10 space-y-3">
        <Link
          href="/day-of-deception/play?new=1"
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
