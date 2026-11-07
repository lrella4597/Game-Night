"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ClueLogRow {
  id: string;
  text: string;
  source: string;
  source_label: string | null;
  is_fake: boolean;
  created_at: string;
  player_id: string;
  from_player_id: string | null;
}

/**
 * Every clue handed out, including fakes and who sent them. Hidden behind a
 * tap: spoilers, in case the host is also playing.
 */
export default function DayHostClueLog({
  sessionId,
  players,
}: {
  sessionId: string;
  players: { id: string; displayName: string }[];
}) {
  const [show, setShow] = useState(false);
  const [rows, setRows] = useState<ClueLogRow[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("traitors_day_clues")
      .select("id, text, source, source_label, is_fake, created_at, player_id, from_player_id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    setRows((data as ClueLogRow[]) || []);
  }, [sessionId]);

  useEffect(() => {
    if (!show) return;
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [show, load]);

  const name = (id: string | null) => players.find((p) => p.id === id)?.displayName ?? "Someone";

  // Public clues go to everyone: show them once
  const seenPublic = new Set<string>();
  const visible = rows.filter((r) => {
    if (r.source !== "public") return true;
    const key = `${r.text}|${r.created_at.slice(0, 16)}`;
    if (seenPublic.has(key)) return false;
    seenPublic.add(key);
    return true;
  });

  return (
    <div className="w-full max-w-5xl mt-8">
      <button
        onClick={() => setShow((s) => !s)}
        className="text-sm text-white/40 hover:text-white/70 underline underline-offset-4"
      >
        {show ? "Hide clue log" : "Show clue log (spoilers)"}
      </button>
      {show && (
        <div className="mt-3 bg-white/5 rounded-xl border border-amber-500/20 p-4">
          {visible.length === 0 ? (
            <p className="text-white/40 text-sm">No clues given yet.</p>
          ) : (
            <ul className="space-y-2">
              {visible.map((r) => (
                <li key={r.id} className="text-sm border-b border-white/5 pb-2 last:border-0">
                  <p className="text-white">{r.text}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {r.source === "public"
                      ? "Public clue (missed mission), everyone"
                      : r.is_fake
                        ? `FAKE tip from ${name(r.from_player_id)} to ${name(r.player_id)}`
                        : r.source === "event"
                          ? `To ${name(r.player_id)} for winning ${r.source_label ?? "an event"}`
                          : `Anonymous tip to ${name(r.player_id)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
