"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PlayerJoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingRejoin, setCheckingRejoin] = useState(true);

  // Pre-fill code from URL query param (from QR scan)
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
    }
  }, [searchParams]);

  // Auto-rejoin: check localStorage for existing session
  useEffect(() => {
    async function tryAutoRejoin() {
      try {
        // Find any stored player sessions
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith("live-player-id-")) continue;

          const storedSessionId = key.replace("live-player-id-", "");
          const storedPlayerId = localStorage.getItem(key);
          if (!storedPlayerId) continue;

          // Try to rejoin
          const res = await fetch("/api/live/rejoin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerId: storedPlayerId,
              sessionId: storedSessionId,
            }),
          });

          if (res.ok) {
            // Session still active — redirect back to game
            router.push(`/live/play/${storedSessionId}`);
            return;
          }

          // Session ended or player removed — clean up stale data
          localStorage.removeItem(`live-player-id-${storedSessionId}`);
          localStorage.removeItem(`live-player-name-${storedSessionId}`);
          localStorage.removeItem(`live-player-token-${storedSessionId}`);
        }
      } catch {
        // Network error, fall through to normal join form
      }
      setCheckingRejoin(false);
    }

    tryAutoRejoin();
  }, [router]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name.trim()) return;

    setJoining(true);
    setError(null);

    try {
      const res = await fetch("/api/live/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joinCode: code,
          displayName: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join game");
      }

      // Store player info in localStorage (survives tab close / phone lock)
      localStorage.setItem(`live-player-id-${data.sessionId}`, data.playerId);
      localStorage.setItem(`live-player-name-${data.sessionId}`, name.trim());
      localStorage.setItem(`live-player-token-${data.sessionId}`, data.playerToken);

      router.push(`/live/play/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setJoining(false);
    }
  }

  function handleCodeChange(value: string) {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setCode(cleaned);
    setError(null);
  }

  if (checkingRejoin) {
    return (
      <div className="w-full max-w-sm flex items-center justify-center py-12">
        <p className="text-blue-200 animate-pulse">Checking for active game...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleJoin} className="w-full max-w-sm flex flex-col gap-4">
      {/* Join Code Input */}
      <div>
        <label className="block text-blue-300 text-sm mb-1">Game Code</label>
        <input
          type="text"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="ABCD12"
          maxLength={6}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center text-2xl font-mono tracking-[0.3em] placeholder-white/30 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]"
          autoComplete="off"
          autoFocus
        />
      </div>

      {/* Display Name Input */}
      <div>
        <label className="block text-blue-300 text-sm mb-1">Your Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value.slice(0, 20));
            setError(null);
          }}
          placeholder="Enter your name"
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-lg placeholder-white/30 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700]"
          autoComplete="off"
        />
      </div>

      {error && (
        <p className="text-red-300 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={code.length !== 6 || !name.trim() || joining}
        className="w-full py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg mt-2"
      >
        {joining ? "Joining..." : "Join Game"}
      </button>
    </form>
  );
}
