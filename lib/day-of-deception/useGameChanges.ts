"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Table = "traitors_day_game_state";

/**
 * Calls onChange whenever this game changes in the database. Only the game
 * state row is listened to (players and missions would reveal roles); a
 * database trigger touches it whenever players or missions change.
 *
 * The database is the source of truth, so screens stay in sync no matter who
 * made the change (the host, a player, or the automatic mission timer) and
 * even when the host's screen is asleep. Live broadcasts from the host still
 * work as a fast path; this is the backbone.
 *
 * Also re-checks every `fallbackMs` while the page is visible, in case the
 * connection silently dropped.
 */
export function useGameChanges(
  sessionId: string | null | undefined,
  onChange: (table: Table) => void,
  { tables = ["traitors_day_game_state"] as Table[], fallbackMs = 60_000 } = {}
) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const tablesKey = tables.join(",");
  // iOS drops the connection when the app is backgrounded: rebuild it on return
  const [reconnectKey, setReconnectKey] = useState(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setReconnectKey((k) => k + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();
    // Coalesce bursts (a phase change often touches several rows at once)
    const pending = new Set<Table>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = (table: Table) => {
      pending.add(table);
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const batch = [...pending];
        pending.clear();
        batch.forEach((t) => onChangeRef.current(t));
      }, 250);
    };

    let channel = supabase.channel(`dod-db-${sessionId}-${Math.random().toString(36).slice(2)}`);
    for (const table of tablesKey.split(",") as Table[]) {
      const filter = `session_id=eq.${sessionId}`;
      channel = channel.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table, filter } as never,
        () => fire(table)
      );
    }
    channel.subscribe();

    const poll = setInterval(() => {
      if (document.visibilityState === "visible") onChangeRef.current("traitors_day_game_state");
    }, fallbackMs);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [sessionId, tablesKey, fallbackMs, reconnectKey]);
}
