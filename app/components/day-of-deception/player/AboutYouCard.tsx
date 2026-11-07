"use client";

import { useState } from "react";
import { Button, Card, display } from "../ui";

interface AboutYouCardProps {
  sessionId: string;
  playerId: string;
  playerToken: string;
  onDone: () => void;
}

const QUESTIONS = [
  { key: "about", label: "What do you do, or what are you into?", placeholder: "Nurse, obsessed with fantasy football" },
  { key: "quirk", label: "What would your friends roast you for?", placeholder: "Always 10 min late, says “literally” a lot" },
  { key: "today", label: "Anything going on with you today?", placeholder: "Ran a 5K this morning, new haircut" },
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
    <Card tone="gold">
      <h2 className={`${display} text-2xl text-white`}>Give the game some ammo</h2>
      <p className="mt-1 text-sm text-white/55">
        The host&apos;s AI uses this to write missions about everyone. Only the AI sees it.
      </p>
      <div className="mt-5 space-y-4">
        {QUESTIONS.map((q) => (
          <label key={q.key} className="block">
            <span className="text-sm text-white/80">{q.label}</span>
            <input
              type="text"
              maxLength={300}
              value={answers[q.key] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
              placeholder={q.placeholder}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-[15px] text-white placeholder:text-white/25 focus:border-[#E8C67A]/50 focus:outline-none"
            />
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      <div className="mt-5 flex items-center gap-2">
        <Button onClick={save} disabled={saving || !anyAnswer} className="flex-1">
          {saving ? "Saving" : "Save"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Skip
        </Button>
      </div>
    </Card>
  );
}
