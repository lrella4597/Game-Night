"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import AuthModal from "@/app/components/auth/AuthModal";
import { Button, Eyebrow, LoadingScreen, Screen, Title } from "@/app/components/day-of-deception/ui";
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
  // Tapped "Join a game" on purpose: never bounce back into an older game
  const joinNew = searchParams.get("new") === "1";
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
    if (!prefillCode && !needsSignIn && !joinNew && allowAutoResume()) {
      router.replace(`/day-of-deception/play/${last}`);
    } else {
      setLastSessionId(last);
    }
  }, [prefillCode, needsSignIn, joinNew, router]);

  // Signed in but this phone has no saved game (new phone, home screen app):
  // ask the server which game this account is in.
  useEffect(() => {
    if (!user || prefillCode || joinNew) return;
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
  }, [user, prefillCode, needsSignIn, joinNew, router]);

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
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      value={code}
      onChange={(e) => setCode(e.target.value.toUpperCase())}
      placeholder="CODE"
      maxLength={6}
      aria-label="Game code"
      className="h-16 w-full rounded-2xl border border-white/10 bg-white/[0.04] text-center font-mono text-3xl font-semibold tracking-[0.35em] text-[#E8C67A] placeholder:text-white/15 focus:border-[#E8C67A]/50 focus:outline-none"
    />
  );

  return (
    <Screen center>
      <div className="text-center">
        <Eyebrow>Join a game</Eyebrow>
        <Title className="mt-3">Enter the code.</Title>
        <p className="mt-3 text-[15px] text-white/50">It&apos;s on the host&apos;s screen.</p>
      </div>

      <div className="mt-10">
        {authLoading || checkingGame ? (
          <div className="flex justify-center py-10">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-[#E8C67A]" />
          </div>
        ) : !user ? (
          <div className="space-y-3">
            {codeInput}
            <button
              onClick={handleGoogle}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-base font-semibold text-[#111] transition-colors hover:bg-white/90 active:scale-[0.98]"
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
              className="w-full py-2 text-center text-sm text-white/45 hover:text-white"
            >
              Use email instead
            </button>
            {error && <p className="text-center text-sm text-rose-300">{error}</p>}
            <p className="pt-2 text-center text-xs leading-relaxed text-white/35">
              Signing in saves your spot all day. Close the app whenever, you&apos;ll come right back.
            </p>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-3">
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
              aria-label="Your name"
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-center text-lg text-white placeholder:text-white/25 focus:border-[#E8C67A]/50 focus:outline-none"
            />
            <Button type="submit" size="lg" full disabled={joining || !code.trim() || !displayName.trim()}>
              {joining ? "Joining" : "Join"}
            </Button>
            {error && <p className="text-center text-sm text-rose-300">{error}</p>}
            <p className="pt-2 text-center text-xs text-white/35">
              Signed in as {user.email}.{" "}
              <button type="button" onClick={() => signOut()} className="underline underline-offset-2 hover:text-white">
                Not you?
              </button>
            </p>
          </form>
        )}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-sm">
        {lastSessionId && (
          <Link href={`/day-of-deception/play/${lastSessionId}`} className="font-medium text-[#E8C67A] hover:text-[#F1D597]">
            {prefillCode ? "Go back to your other game" : "Back to my last game"}
          </Link>
        )}
        <Link href="/day-of-deception" className="text-white/40 transition-colors hover:text-white">
          All my games
        </Link>
      </div>

      <AuthModal isOpen={showEmailSignIn} onClose={() => setShowEmailSignIn(false)} />
    </Screen>
  );
}

export default function TraitorsDayJoinPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <JoinForm />
    </Suspense>
  );
}
