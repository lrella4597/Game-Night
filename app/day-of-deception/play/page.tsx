"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCode = searchParams.get("code") || "";

  const [code, setCode] = useState(prefillCode);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setJoining(true);
    setError(null);

    try {
      const res = await fetch("/api/day-of-deception/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code.trim(), displayName: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to join");
      }

      const { sessionId, playerId, playerToken } = await res.json();

      sessionStorage.setItem(`day-of-deception-player-id-${sessionId}`, playerId);
      sessionStorage.setItem(`day-of-deception-player-name-${sessionId}`, name.trim());
      sessionStorage.setItem(`day-of-deception-player-token-${sessionId}`, playerToken);

      router.push(`/day-of-deception/play/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-3xl font-bold text-green-500 mb-8">Join Game</h1>

      <form onSubmit={handleJoin} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter join code"
          maxLength={6}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center text-2xl font-mono tracking-[0.3em] placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <button
          type="submit"
          disabled={joining || !code.trim() || !name.trim()}
          className="w-full py-4 rounded-xl font-bold text-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {joining ? "Joining..." : "Join Game"}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </form>

      <Link href="/day-of-deception" className="mt-8 text-green-400/50 hover:text-white transition-colors text-sm">
        Back
      </Link>
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
