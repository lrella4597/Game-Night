"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import AuthModal from "@/app/components/auth/AuthModal";
import {
  allowAutoResume,
  findSessionByJoinCode,
  getLastSessionId,
  savePlayer,
} from "@/lib/day-of-deception/playerStorage";

function googleFirstName(meta: Record<string, unknown> | undefined): string {
  const full = (meta?.full_name as string) || (meta?.name as string) || (meta?.display_name as string) || "";
  return full.split(" ")[0]?.slice(0, 20) ?? "";
}

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("code") || "";
  // Sent here because this phone is signed out: don't bounce back to the game
  const needsSignIn = searchParams.get("signin") === "1";
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  const [code, setCode] = useState(prefillCode);
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const [checkingGame, setCheckingGame] = useState(false);

  // Reopening the app drops the player straight back into their game.
  // With a code in the link (a fresh QR scan), offer it instead of forcing it.
  useEffect(() => {
    // Scanned the QR for a game this phone is already in: go straight back in
    const sameGame = prefillCode ? findSessionByJoinCode(prefillCode) : null;
    if (sameGame && allowAutoResume()) {
      router.replace(`/day-of-deception/play/${sameGame}`);
      return;
    }
    const last = getLastSessionId();
    if (!last) return;
    if (!prefillCode && !needsSignIn && allowAutoResume()) {
      router.replace(`/day-of-deception/play/${last}`);
    } else {
      setLastSessionId(last);
    }
  }, [prefillCode, needsSignIn, router]);

  // Signed in but this phone has no saved game (new phone, home screen app):
  // ask the server which game this account is in.
  useEffect(() => {
    if (!user || prefillCode) return;
    // Signed back in on a phone that already knows its game
    const last = getLastSessionId();
    if (last) {
      if (needsSignIn && allowAutoResume()) router.replace(`/day-of-deception/play/${last}`);
      else setLastSessionId(last);
      return;
    }
    let cancelled = false;
    setCheckingGame(true);
    fetch("/api/day-of-deception/my-game", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ game }) => {
        if (cancelled || !game) return;
        savePlayer(game.sessionId, {
          playerId: game.playerId,
          playerName: game.playerName,
          playerToken: game.playerToken,
        });
        if (allowAutoResume()) router.replace(`/day-of-deception/play/${game.sessionId}`);
        else setLastSessionId(game.sessionId);
      })
      .catch(() => {})
      .finally(() => !cancelled && setCheckingGame(false));
    return () => {
      cancelled = true;
    };
  }, [user, prefillCode, needsSignIn, router]);

  const suggestedName = googleFirstName(user?.user_metadata);
  const displayName = nameEdited ? name : name || suggestedName;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !code.trim() || !displayName.trim()) return;
    setJoining(true);
    setError(null);

    try {
      const res = await fetch("/api/day-of-deception/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code.trim(), displayName: displayName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");

      const { sessionId, playerId, playerToken, playerName, joinCode } = data;
      savePlayer(sessionId, {
        playerId,
        playerName: playerName || displayName.trim(),
        playerToken,
        joinCode: joinCode || code.trim(),
      });
      router.push(`/day-of-deception/play/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setJoining(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    // Come back to this page with the code still filled in
    const next = `/day-of-deception/play${code.trim() ? `?code=${encodeURIComponent(code.trim())}` : ""}`;
    const { error } = await signInWithGoogle(next);
    if (error) setError(error.message);
  }

  const codeInput = (
    <input
      type="text"
      value={code}
      onChange={(e) => setCode(e.target.value.toUpperCase())}
      placeholder="Enter join code"
      maxLength={6}
      className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center text-2xl font-mono tracking-[0.3em] placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500"
    />
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-3xl font-bold text-green-500 mb-8">Join Game</h1>


      {authLoading || checkingGame ? (
        <div className="text-green-300 animate-pulse">Loading...</div>
      ) : !user ? (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {codeInput}

          <button
            onClick={handleGoogle}
            className="w-full py-4 rounded-xl font-bold text-lg bg-white text-gray-900 hover:bg-gray-100 transition-all flex items-center justify-center gap-3"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => setShowEmailSignIn(true)}
            className="text-white/50 hover:text-white text-sm text-center"
          >
            Use email instead
          </button>

          <p className="text-white/40 text-xs text-center">
            Signing in keeps your spot all day. Close the app anytime and you&apos;ll come right back.
          </p>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>
      ) : (
        <form onSubmit={handleJoin} className="flex flex-col gap-4 w-full max-w-sm">
          {codeInput}

          <input
            type="text"
            value={displayName}
            onChange={(e) => {
              setNameEdited(true);
              setName(e.target.value);
            }}
            placeholder="Your name"
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <button
            type="submit"
            disabled={joining || !code.trim() || !displayName.trim()}
            className="w-full py-4 rounded-xl font-bold text-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {joining ? "Joining..." : "Join Game"}
          </button>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <p className="text-white/40 text-xs text-center">
            Signed in as {user.email}.{" "}
            <button type="button" onClick={() => signOut()} className="underline hover:text-white">
              Not you?
            </button>
          </p>
        </form>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 text-sm">
        {lastSessionId && (
          <Link
            href={`/day-of-deception/play/${lastSessionId}`}
            className="text-green-300/80 hover:text-white underline underline-offset-4"
          >
            {prefillCode ? "Go back to your other game instead" : "Back to my current game"}
          </Link>
        )}
        <Link href="/day-of-deception" className="text-green-400/50 hover:text-white transition-colors">
          All my games
        </Link>
      </div>

      <AuthModal isOpen={showEmailSignIn} onClose={() => setShowEmailSignIn(false)} />
    </div>
  );
}

export default function TraitorsDayJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-2xl text-green-300 animate-pulse">Loading...</div>
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}
