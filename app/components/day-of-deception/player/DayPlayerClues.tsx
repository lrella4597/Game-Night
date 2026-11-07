"use client";

import { useCallback, useEffect, useState } from "react";

interface Clue {
  id: string;
  kind: "cleared" | "lineup" | "mission_tip";
  text: string;
  source: "event" | "tip" | "public";
  sourceLabel: string | null;
  createdAt: string;
}

interface DayPlayerCluesProps {
  sessionId: string;
  playerId: string;
  playerToken: string;
  role: "traitor" | "faithful" | null;
  players: { id: string; displayName: string }[];
  // Bump to refetch (live game changes)
  refreshKey: number;
}

const KIND_ICON: Record<string, string> = { cleared: "✅", lineup: "🧑‍🤝‍🧑", mission_tip: "🕵️" };

function sourceLine(c: Clue): string {
  if (c.source === "event") return c.sourceLabel ? `You won: ${c.sourceLabel}` : "You won an event";
  if (c.source === "public") return "Everyone got this one. A Deceiver missed a mission.";
  return "Anonymous tip. Could be real, could be a Deceiver.";
}

/**
 * The player's secret clues, plus (for Deceivers) the fake tip sender. Clues
 * are private: what you share at the Roundtable is up to you.
 */
export default function DayPlayerClues({
  sessionId,
  playerId,
  playerToken,
  role,
  players,
  refreshKey,
}: DayPlayerCluesProps) {
  const [clues, setClues] = useState<Clue[] | null>(null);
  const [fakeTips, setFakeTips] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sessionId, playerId, token: playerToken });
      const res = await fetch(`/api/day-of-deception/my-clues?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setClues(data.clues);
      setFakeTips(data.fakeTips ?? 0);
    } catch {
      // Try again on the next refresh
    }
  }, [sessionId, playerId, playerToken]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const isDeceiver = role === "traitor";
  const count = clues?.length ?? 0;

  return (
    <div className="w-full max-w-sm mx-auto px-4 mt-4 mb-24">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-300 font-semibold">🔍 My Clues {count > 0 && `(${count})`}</p>
            <p className="text-white/50 text-xs mt-0.5">
              {isDeceiver
                ? "You can get clues too. Use them to look Loyal."
                : "Win events to earn clues. Share them, or don't."}
            </p>
          </div>
        </div>

        {clues === null ? (
          <p className="text-white/30 text-sm mt-3">Loading...</p>
        ) : count === 0 ? (
          <p className="text-white/40 text-sm mt-3">No clues yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {clues.map((c, i) => (
              <li
                key={c.id}
                className={`rounded-xl border p-3 ${
                  i === 0 ? "border-amber-400/50 bg-amber-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-white text-sm leading-snug">
                  <span className="mr-1.5">{KIND_ICON[c.kind] ?? "🔍"}</span>
                  {c.text}
                </p>
                <p className="text-white/40 text-[11px] mt-1.5">{sourceLine(c)}</p>
              </li>
            ))}
          </ul>
        )}

        {isDeceiver && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-red-300 text-sm font-semibold">Fake tips: {fakeTips}</p>
                <p className="text-white/40 text-xs">Each finished mission earns one.</p>
              </div>
              <button
                onClick={() => setOpen((o) => !o)}
                disabled={fakeTips < 1}
                className="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white disabled:opacity-30"
              >
                {open ? "Close" : "Send one"}
              </button>
            </div>
            {open && fakeTips > 0 && (
              <FakeTipForm
                sessionId={sessionId}
                playerId={playerId}
                playerToken={playerToken}
                players={players}
                onSent={() => {
                  setOpen(false);
                  load();
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FakeTipForm({
  sessionId,
  playerId,
  playerToken,
  players,
  onSent,
}: {
  sessionId: string;
  playerId: string;
  playerToken: string;
  players: { id: string; displayName: string }[];
  onSent: () => void;
}) {
  const [mode, setMode] = useState<"frame" | "clear">("frame");
  const [targetId, setTargetId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const others = players.filter((p) => p.id !== playerId);
  // You can clear yourself; framing yourself makes no sense
  const targets = mode === "clear" ? players : others;

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/day-of-deception/send-fake-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, playerId, token: playerToken, recipientId, mode, targetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send it. Try again.");
      setSent(data.text);
      setTimeout(onSent, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send it. Try again.");
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p className="mt-3 text-green-300 text-sm">
        Sent. They got: &ldquo;{sent}&rdquo;
      </p>
    );
  }

  const select =
    "w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["frame", "clear"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setTargetId("");
            }}
            className={`py-2 rounded-lg text-sm border ${
              mode === m ? "border-red-400 bg-red-500/20 text-white" : "border-white/15 text-white/60"
            }`}
          >
            {m === "frame" ? "Frame someone" : "Clear someone"}
          </button>
        ))}
      </div>
      <p className="text-white/40 text-xs">
        {mode === "frame"
          ? "They'll get: \"One of [them] and two others is a Deceiver.\""
          : "They'll get: \"[Name] is Loyal.\" You can clear yourself."}
      </p>
      <label className="block">
        <span className="text-white/70 text-xs">{mode === "frame" ? "Who to frame" : "Who to clear"}</span>
        <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className={select}>
          <option value="">Pick a player</option>
          {targets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === playerId ? `${p.displayName} (you)` : p.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-white/70 text-xs">Send the tip to</span>
        <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className={select}>
          <option value="">Pick a player</option>
          {others.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        onClick={send}
        disabled={sending || !targetId || !recipientId}
        className="w-full py-2.5 rounded-xl font-semibold bg-red-600 text-white disabled:opacity-40"
      >
        {sending ? "Sending..." : "Send anonymous tip"}
      </button>
      <p className="text-white/30 text-[11px]">It shows up as an anonymous tip, same as real ones.</p>
    </div>
  );
}
