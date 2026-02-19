"use client";

import { useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { DAY_HOST_EVENTS } from "./channelEvents";

interface UseDayHostControlsOptions {
  sessionId: string;
  broadcast: (event: string, payload: unknown) => void;
}

export function useDayHostControls({ sessionId, broadcast }: UseDayHostControlsOptions) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const changePhase = useCallback(
    async (phase: string, extra?: Record<string, unknown>) => {
      await supabase
        .from("traitors_day_game_state")
        .update({ phase, last_action: `phase_${phase}`, updated_at: new Date().toISOString(), ...extra })
        .eq("session_id", sessionId);
      broadcast(DAY_HOST_EVENTS.PHASE_CHANGE, { phase, ...extra });
    },
    [sessionId, supabase, broadcast]
  );

  const startGame = useCallback(async () => {
    const res = await fetch("/api/day-of-deception/assign-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to assign roles");
    }
    broadcast(DAY_HOST_EVENTS.PHASE_CHANGE, { phase: "roles_revealed" });
    return res.json();
  }, [sessionId, broadcast]);

  const beginDay = useCallback(async () => {
    await changePhase("freeplay");
    await supabase
      .from("traitors_day_sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", sessionId);
  }, [sessionId, supabase, changePhase]);

  const sendMission = useCallback(
    async (playerId?: string) => {
      const res = await fetch("/api/day-of-deception/send-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, playerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send mission");
      }
      const data = await res.json();
      broadcast(DAY_HOST_EVENTS.MISSION_ASSIGNED, { playerId: data.playerId });
      return data;
    },
    [sessionId, broadcast]
  );

  const startEvent = useCallback(
    async (eventTemplate?: string) => {
      const res = await fetch("/api/day-of-deception/start-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, eventTemplate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start event");
      }
      const data = await res.json();
      broadcast(DAY_HOST_EVENTS.EVENT_START, {
        eventName: data.eventName,
        instructions: data.instructions,
        durationMinutes: data.durationMinutes,
        deceiverSecretMission: data.deceiverSecretMission,
      });
      broadcast(DAY_HOST_EVENTS.PHASE_CHANGE, { phase: "event_active" });
      return data;
    },
    [sessionId, broadcast]
  );

  const endEvent = useCallback(async () => {
    const res = await fetch("/api/day-of-deception/end-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to end event");
    }
    broadcast(DAY_HOST_EVENTS.EVENT_END, {});
    broadcast(DAY_HOST_EVENTS.PHASE_CHANGE, { phase: "freeplay" });
  }, [sessionId, broadcast]);

  const startRoundtable = useCallback(async () => {
    const res = await fetch("/api/day-of-deception/start-roundtable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to start roundtable");
    }
    const data = await res.json();
    broadcast(DAY_HOST_EVENTS.ROUNDTABLE_START, {});
    broadcast(DAY_HOST_EVENTS.PHASE_CHANGE, { phase: "roundtable" });
    if (data.timerDuration) {
      broadcast(DAY_HOST_EVENTS.TIMER_START, { duration: data.timerDuration });
    }
    return data;
  }, [sessionId, broadcast]);

  const startVoting = useCallback(async () => {
    await changePhase("voting");
    // Fetch config for timer
    const { data: session } = await supabase
      .from("traitors_day_sessions")
      .select("voting_timer_seconds")
      .eq("id", sessionId)
      .single();
    const duration = session?.voting_timer_seconds ?? 120;
    broadcast(DAY_HOST_EVENTS.VOTING_START, {});
    broadcast(DAY_HOST_EVENTS.TIMER_START, { duration });
  }, [sessionId, supabase, changePhase, broadcast]);

  const resolveVote = useCallback(async () => {
    const res = await fetch("/api/day-of-deception/resolve-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    broadcast(DAY_HOST_EVENTS.VOTE_RESULT, {
      voteTally: data.voteTally,
      voteDetails: data.voteDetails || [],
      accusedId: data.accusedId,
      accusedName: data.accusedName,
      accusedRole: data.accusedRole,
      tied: data.tied,
      winner: data.winner,
    });
    broadcast(DAY_HOST_EVENTS.PHASE_CHANGE, { phase: "reveal" });
    return data;
  }, [sessionId, broadcast]);

  const endGame = useCallback(async () => {
    await supabase
      .from("traitors_day_game_state")
      .update({ phase: "end", last_action: "game_ended" })
      .eq("session_id", sessionId);

    await supabase
      .from("traitors_day_sessions")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", sessionId);

    const { data: players } = await supabase
      .from("traitors_day_players")
      .select("id, display_name, role, shadow_tokens")
      .eq("session_id", sessionId);

    const { data: gs } = await supabase
      .from("traitors_day_game_state")
      .select("winner")
      .eq("session_id", sessionId)
      .single();

    broadcast(DAY_HOST_EVENTS.ENDGAME, {
      winner: gs?.winner,
      players: (players || []).map((p) => ({
        id: p.id,
        displayName: p.display_name,
        role: p.role,
        shadowTokens: p.shadow_tokens,
      })),
    });
    broadcast(DAY_HOST_EVENTS.PHASE_CHANGE, { phase: "end" });
  }, [sessionId, supabase, broadcast]);

  const broadcastPlayers = useCallback(async () => {
    const { data: players } = await supabase
      .from("traitors_day_players")
      .select("id, display_name, avatar_color, is_connected, shadow_tokens")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });

    const mapped = (players || []).map((p) => ({
      id: p.id,
      displayName: p.display_name,
      avatarColor: p.avatar_color,
      isConnected: p.is_connected,
      shadowTokens: p.shadow_tokens,
    }));

    broadcast(DAY_HOST_EVENTS.PLAYERS_UPDATE, { players: mapped });
    return mapped;
  }, [sessionId, supabase, broadcast]);

  const kickPlayer = useCallback(
    async (playerId: string) => {
      await supabase.from("traitors_day_players").delete().eq("id", playerId);
      broadcast(DAY_HOST_EVENTS.PLAYER_KICKED, { playerId });
    },
    [supabase, broadcast]
  );

  return {
    startGame,
    beginDay,
    sendMission,
    startEvent,
    endEvent,
    startRoundtable,
    startVoting,
    resolveVote,
    endGame,
    broadcastPlayers,
    kickPlayer,
    changePhase,
  };
}
