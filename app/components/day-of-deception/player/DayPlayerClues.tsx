"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar, Button, Card, Icon, display } from "../ui";
import type { IconName } from "../ui";

export interface Clue {
  id: string;
  kind: "cleared" | "lineup" | "mission_tip";
  text: string;
  source: "event" | "tip" | "public";
  sourceLabel: string | null;
  createdAt: string;
}

interface PlayerLite {
  id: string;
  displayName: string;
  avatarColor?: string;
}

interface DayPlayerCluesProps {
  sessionId: string;
  playerId: string;
  playerToken: string;
  role: "traitor" | "faithful" | null;
  players: PlayerLite[];
  // Bump to refetch (live game changes)
  refreshKey: number;
}

const KIND_ICON: Record<Clue["kind"], IconName> = { cleared: "shield", lineup: "users", mission_tip: "eye" };

function sourceLine(c: Clue): string {
  if (c.source === "event") return c.sourceLabel ? `Won in ${c.sourceLabel}` : "Won in an event";
  if (c.source === "public") return "Everyone got this. A Traitor missed a mission.";
  return "Anonymous tip. Real, or planted by a Traitor.";
}

/**
 * The player's secret clues, plus (for Traitors) the fake tip sender. Clues
 * are private: what you share at the Roundtable is up to you.
 */
export default function DayPlayerClues({ sessionId, playerId, playerToken, role, players, refreshKey }: DayPlayerCluesProps) {
  const [clues, setClues] = useState<Clue[] | null>(null);
  const [fakeTips, setFakeTips] = useState(0);

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

  return (
    <CluesView
      clues={clues}
      role={role}
      fakeTips={fakeTips}
      players={players}
      playerId={playerId}
      sessionId={sessionId}
      playerToken={playerToken}
      onReload={load}
    />
  );
}

export function CluesView({
  clues,
  role,
  fakeTips,
  players,
  playerId,
  sessionId,
  playerToken,
  onReload,
}: {
  clues: Clue[] | null;
  role: "traitor" | "faithful" | null;
  fakeTips: number;
  players: PlayerLite[];
  playerId: string;
  sessionId: string;
  playerToken: string;
  onReload: () => void;
}) {
  const [sending, setSending] = useState(false);
  const isDeceiver = role === "traitor";
  const count = clues?.length ?? 0;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <Icon name="search" className="h-4 w-4 text-[#E8C67A]" />
          <h2 className={`${display} text-2xl text-white`}>Your clues</h2>
        </div>
        {count > 0 && <span className="text-xs tabular-nums text-white/40">{count}</span>}
      </div>

      {clues === null ? (
        <Card className="py-6 text-center text-sm text-white/35">Loading</Card>
      ) : count === 0 ? (
        <Card className="py-7 text-center">
          <p className="text-[15px] text-white/60">No clues yet.</p>
          <p className="mt-1 text-sm text-white/35">
            {isDeceiver ? "You can win them too. Use them to look Faithful." : "Win an event to earn your first one."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {clues.map((c, i) => (
            <li key={c.id}>
              <Card tone={i === 0 ? "gold" : "neutral"} className="p-4">
                <div className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      i === 0 ? "bg-[#E8C67A]/15 text-[#E8C67A]" : "bg-white/[0.06] text-white/50"
                    }`}
                  >
                    <Icon name={KIND_ICON[c.kind] ?? "search"} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[15px] leading-snug text-white">{c.text}</p>
                    <p className="mt-1.5 text-xs text-white/40">{sourceLine(c)}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {isDeceiver && (
        <Card tone="deceiver" className="mt-4">
          {!sending ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[15px] font-medium text-white">
                  {fakeTips} fake tip{fakeTips !== 1 ? "s" : ""} to send
                </p>
                <p className="mt-0.5 text-xs text-white/45">Each finished mission earns one.</p>
              </div>
              <Button size="sm" variant="danger" disabled={fakeTips < 1} onClick={() => setSending(true)}>
                <Icon name="send" className="h-4 w-4" />
                Send
              </Button>
            </div>
          ) : (
            <FakeTipForm
              sessionId={sessionId}
              playerId={playerId}
              playerToken={playerToken}
              players={players}
              onCancel={() => setSending(false)}
              onSent={() => {
                setSending(false);
                onReload();
              }}
            />
          )}
        </Card>
      )}
    </section>
  );
}

function PlayerPicker({
  players,
  value,
  onChange,
  me,
}: {
  players: PlayerLite[];
  value: string;
  onChange: (id: string) => void;
  me: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {players.map((p) => {
        const on = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
              on ? "border-rose-300/70 bg-rose-500/20 text-white" : "border-white/10 bg-white/[0.04] text-white/70"
            }`}
          >
            <Avatar name={p.displayName} color={p.avatarColor ?? "#555"} size="sm" />
            {p.id === me ? "You" : p.displayName}
          </button>
        );
      })}
    </div>
  );
}

function FakeTipForm({
  sessionId,
  playerId,
  playerToken,
  players,
  onCancel,
  onSent,
}: {
  sessionId: string;
  playerId: string;
  playerToken: string;
  players: PlayerLite[];
  onCancel: () => void;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<"frame" | "clear">("frame");
  const [targetId, setTargetId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const others = players.filter((p) => p.id !== playerId);
  // You can clear yourself; framing yourself makes no sense
  const targets = mode === "clear" ? players : others;
  const recipients = others.filter((p) => p.id !== targetId);

  async function send() {
    setBusy(true);
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
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="py-2 text-center">
        <Icon name="check" className="mx-auto h-6 w-6 text-emerald-300" />
        <p className="mt-2 text-sm text-white/70">Sent. They now have:</p>
        <p className="mt-1 text-[15px] text-white">&ldquo;{sent}&rdquo;</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium text-white">Plant a fake tip</p>
        <button onClick={onCancel} className="text-sm text-white/45 hover:text-white">
          Cancel
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
        {(["frame", "clear"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setTargetId("");
            }}
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === m ? "bg-white/10 text-white" : "text-white/45"
            }`}
          >
            {m === "frame" ? "Frame someone" : "Clear someone"}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/40">
        {mode === "frame"
          ? "They'll read: “One of [them] and two others is a Traitor.”"
          : "They'll read: “[Name] is Faithful.” You can clear yourself."}
      </p>

      <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
        {mode === "frame" ? "Who to frame" : "Who to clear"}
      </p>
      <PlayerPicker players={targets} value={targetId} onChange={setTargetId} me={playerId} />

      <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-[0.18em] text-white/45">Send it to</p>
      <PlayerPicker players={recipients} value={recipientId} onChange={setRecipientId} me={playerId} />

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      <Button variant="danger" full className="mt-5" disabled={busy || !targetId || !recipientId} onClick={send}>
        {busy ? "Sending" : "Send anonymous tip"}
      </Button>
      <p className="mt-2 text-center text-[11px] text-white/35">It looks exactly like a real anonymous tip.</p>
    </div>
  );
}
