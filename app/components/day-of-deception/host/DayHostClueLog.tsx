"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Icon, Pill } from "../ui";

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
    <div className="mt-10">
      <button
        onClick={() => setShow((s) => !s)}
        className="flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
      >
        <Icon name="eye" className="h-4 w-4" />
        {show ? "Hide clue log" : "Show clue log (spoilers)"}
      </button>
      {show && (
        <Card className="mt-3 p-2">
          {visible.length === 0 ? (
            <p className="px-3 py-4 text-sm text-white/40">No clues given yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {visible.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[15px] text-white">{r.text}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {r.source === "public"
                        ? "Everyone, after a missed mission"
                        : r.is_fake
                          ? `${name(r.from_player_id)} → ${name(r.player_id)}`
                          : r.source === "event"
                            ? `${name(r.player_id)} won ${r.source_label ?? "an event"}`
                            : `Anonymous tip to ${name(r.player_id)}`}
                    </p>
                  </div>
                  {r.is_fake ? (
                    <Pill tone="deceiver">Fake</Pill>
                  ) : r.source === "public" ? (
                    <Pill tone="gold">Public</Pill>
                  ) : (
                    <Pill>Real</Pill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
