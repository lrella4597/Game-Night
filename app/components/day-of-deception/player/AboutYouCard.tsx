"use client";

import { useState } from "react";

interface AboutYouCardProps {
  sessionId: string;
  playerId: string;
  playerToken: string;
  onDone: () => void;
}

const QUESTIONS = [
  { key: "about", label: "What do you do, or what are you into?", placeholder: "e.g. nurse, obsessed with fantasy football" },
  { key: "quirk", label: "What would your friends roast you for?", placeholder: "e.g. always 10 min late, says 'literally' a lot" },
  { key: "today", label: "Anything going on with you today?", placeholder: "e.g. ran a 5K this morning, new haircut" },
] as const;

/**
 * Lobby card: three quick questions so the host's AI can write missions
 * about everyone, not just whoever the host described.
 */
export default function AboutYouCard({ sessionId, playerId, playerToken, onDone }: AboutYouCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anyAnswer = Object.values(answers).some((v) => v.trim());

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/day-of-deception/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, playerId, token: playerToken, profile: answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save. Try again.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto mt-4 mb-2 px-4">
      <div className="rounded-2xl border border-green-500/40 bg-green-950/40 p-4">
        <p className="text-white font-semibold">Give the game some ammo 🎯</p>
        <p className="text-white/60 text-xs mt-1 mb-3">
          The host&apos;s AI uses this to write secret missions about everyone. Only the AI sees it.
        </p>
        <div className="flex flex-col gap-3">
          {QUESTIONS.map((q) => (
            <label key={q.key} className="flex flex-col gap-1">
              <span className="text-white/80 text-sm">{q.label}</span>
              <input
                type="text"
                maxLength={300}
                value={answers[q.key] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                placeholder={q.placeholder}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
          ))}
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={save}
            disabled={saving || !anyAnswer}
            className="flex-1 py-2.5 rounded-xl font-semibold bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onDone} className="text-white/50 hover:text-white text-sm px-2">
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
