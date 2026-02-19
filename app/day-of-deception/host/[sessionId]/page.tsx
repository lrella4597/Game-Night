"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel } from "@/lib/live/useRealtimeChannel";
import { useLiveTimer } from "@/lib/live/useLiveTimer";
import { useDayHostControls } from "@/lib/day-of-deception/useHostControls";
import { DAY_HOST_EVENTS, DAY_PLAYER_EVENTS, getDayChannelName } from "@/lib/day-of-deception/channelEvents";
import DayHostLobby from "@/app/components/day-of-deception/host/DayHostLobby";
import DayHostRolesRevealed from "@/app/components/day-of-deception/host/DayHostRolesRevealed";
import DayHostFreeplay from "@/app/components/day-of-deception/host/DayHostFreeplay";
import DayHostEventActive from "@/app/components/day-of-deception/host/DayHostEventActive";
import DayHostRoundtable from "@/app/components/day-of-deception/host/DayHostRoundtable";
import DayHostVoting from "@/app/components/day-of-deception/host/DayHostVoting";
import DayHostReveal from "@/app/components/day-of-deception/host/DayHostReveal";
import DayHostEnd from "@/app/components/day-of-deception/host/DayHostEnd";
import type {
  DayPhase,
  DaySessionConfig,
  DaySessionRow,
  DayPlayerRow,
  DayGameStateRow,
} from "@/lib/day-of-deception/types";
import {
  daySessionFromRow,
  dayPlayerFromRow,
  dayGameStateFromRow,
} from "@/lib/day-of-deception/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPayload = any;

interface PublicPlayer {
  id: string;
  displayName: string;
  avatarColor: string;
  isConnected: boolean;
  shadowTokens: number;
}

interface EventData {
  eventName: string;
  instructions: string;
  durationMinutes: number;
  deceiverSecretMission: string | null;
}

interface VoteResult {
  voteTally: Record<string, { name: string; votes: number; weightedVotes: number }>;
  voteDetails: { voterName: string; targetName: string }[];
  accusedId: string | null;
  accusedName: string | null;
  accusedRole: string | null;
  tied: boolean;
  winner: string;
}

interface EndgameData {
  winner: string;
  players: { id: string; displayName: string; role: string; shadowTokens: number }[];
}

export default function TraitorsDayHostPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { user, loading: authLoading } = useAuth();

  // Core state
  const [phase, setPhase] = useState<DayPhase>("lobby");
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [config, setConfig] = useState<DaySessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [eventsCompleted, setEventsCompleted] = useState(0);

  // Phase-specific state
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [endgameData, setEndgameData] = useState<EndgameData | null>(null);
  const [missionsSent, setMissionsSent] = useState(0);
  const [customEventNames, setCustomEventNames] = useState<string[]>([]);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const fetchPlayersRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // ── Realtime ──────────────────────────────────────────────────────────────

  const { connected, broadcast, onBroadcast } = useRealtimeChannel({
    sessionId,
    userId: user?.id || "",
    userName: "Host",
    isHost: true,
    channelName: getDayChannelName(sessionId),
  });

  const controls = useDayHostControls({ sessionId, broadcast });

  // ── Timer ─────────────────────────────────────────────────────────────────

  const { remaining: timerRemainingRaw, running: timerRunning, startTimer, clearTimer } =
    useLiveTimer({});
  const timerRemaining = timerRemainingRaw ?? 0;

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchPlayers = useCallback(async () => {
    const { data: rows } = await supabase
      .from("traitors_day_players")
      .select("*")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });

    if (rows) {
      const mapped = rows.map((r) => {
        const player = dayPlayerFromRow(r as DayPlayerRow);
        return {
          id: player.id,
          displayName: player.displayName,
          avatarColor: player.avatarColor,
          isConnected: player.isConnected,
          shadowTokens: player.shadowTokens,
        };
      });
      setPlayers(mapped);
    }
  }, [sessionId, supabase]);

  fetchPlayersRef.current = fetchPlayers;

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || authLoading || !user) return;

    async function loadAll() {
      const { data: sessionRow, error: sessionErr } = await supabase
        .from("traitors_day_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionErr || !sessionRow) {
        setError("Session not found");
        setLoading(false);
        return;
      }

      if (sessionRow.host_id !== user!.id) {
        setError("You are not the host of this session");
        setLoading(false);
        return;
      }

      const session = daySessionFromRow(sessionRow as DaySessionRow);
      setConfig(session.config);
      setJoinCode(session.joinCode);

      // Load custom event pack names if available
      if (session.eventPack && Array.isArray(session.eventPack)) {
        setCustomEventNames(session.eventPack.map((e) => e.name));
      }

      // Fetch game state if it exists
      const { data: gsRow } = await supabase
        .from("traitors_day_game_state")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (gsRow) {
        const gs = dayGameStateFromRow(gsRow as DayGameStateRow);
        setPhase(gs.phase);
        setMissionsSent(gs.missionsSentCount);
      }

      await fetchPlayers();
      setLoading(false);
    }

    loadAll();
  }, [sessionId, user, authLoading, supabase, fetchPlayers]);

  // ── Realtime listeners ────────────────────────────────────────────────────

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_PLAYER_EVENTS.ROLE_CONFIRMED, () => fetchPlayers());
  }, [onBroadcast, fetchPlayers]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_PLAYER_EVENTS.VOTE_SUBMITTED, () => fetchPlayers());
  }, [onBroadcast, fetchPlayers]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_PLAYER_EVENTS.MISSION_COMPLETED, () => fetchPlayers());
  }, [onBroadcast, fetchPlayers]);

  // Poll players + broadcast on interval to keep list fresh
  useEffect(() => {
    if (!sessionId || loading) return;
    const interval = setInterval(() => {
      fetchPlayersRef.current();
      controls.broadcastPlayers();
    }, 5000);
    return () => clearInterval(interval);
  }, [sessionId, loading, controls]);

  // ── Game actions ──────────────────────────────────────────────────────────

  async function handleStartGame() {
    try {
      await controls.startGame();
      setPhase("roles_revealed");
    } catch (err) {
      console.error("Start game error:", err);
    }
  }

  async function handleBeginDay() {
    try {
      await controls.beginDay();
      setPhase("freeplay");
    } catch (err) {
      console.error("Begin day error:", err);
    }
  }

  async function handleSendMission(playerId?: string) {
    await controls.sendMission(playerId);
    setMissionsSent((c) => c + 1);
  }

  async function handleStartEvent(eventTemplate?: string) {
    const data = await controls.startEvent(eventTemplate);
    setEventData({
      eventName: data.eventName,
      instructions: data.instructions,
      durationMinutes: data.durationMinutes,
      deceiverSecretMission: data.deceiverSecretMission,
    });
    setPhase("event_active");
    if (data.durationMinutes) {
      startTimer(data.durationMinutes * 60);
      broadcast(DAY_HOST_EVENTS.TIMER_START, { duration: data.durationMinutes * 60 });
    }
  }

  async function handleEndEvent() {
    clearTimer();
    broadcast(DAY_HOST_EVENTS.TIMER_STOP, {});
    try {
      await controls.endEvent();
      setPhase("freeplay");
      setEventData(null);
      setEventsCompleted((c) => c + 1);
    } catch (err) {
      console.error("End event error:", err);
    }
  }

  async function handleStartRoundtable() {
    const data = await controls.startRoundtable();
    setPhase("roundtable");
    if (data.timerDuration) {
      startTimer(data.timerDuration);
    }
  }

  async function handleStartVoting() {
    clearTimer();
    broadcast(DAY_HOST_EVENTS.TIMER_STOP, {});
    try {
      await controls.startVoting();
      setPhase("voting");
      const duration = config?.votingTimerSeconds ?? 120;
      startTimer(duration);
    } catch (err) {
      console.error("Start voting error:", err);
    }
  }

  async function handleResolveVote() {
    clearTimer();
    broadcast(DAY_HOST_EVENTS.TIMER_STOP, {});
    try {
      const data = await controls.resolveVote();
      setVoteResult({
        voteTally: data.voteTally,
        voteDetails: data.voteDetails || [],
        accusedId: data.accusedId,
        accusedName: data.accusedName,
        accusedRole: data.accusedRole,
        tied: data.tied,
        winner: data.winner,
      });
      setPhase("reveal");
    } catch (err) {
      console.error("Resolve vote error:", err);
    }
  }

  async function handleEndGame() {
    try {
      await controls.endGame();

      // Fetch endgame data for display
      const { data: gsRow } = await supabase
        .from("traitors_day_game_state")
        .select("winner")
        .eq("session_id", sessionId)
        .single();

      const { data: allPlayers } = await supabase
        .from("traitors_day_players")
        .select("id, display_name, role, shadow_tokens")
        .eq("session_id", sessionId);

      setEndgameData({
        winner: gsRow?.winner ?? "faithful",
        players: (allPlayers || []).map((p) => ({
          id: p.id,
          displayName: p.display_name,
          role: p.role || "faithful",
          shadowTokens: p.shadow_tokens,
        })),
      });
      setPhase("end");
    } catch (err) {
      console.error("End game error:", err);
    }
  }

  async function handleKickPlayer(playerId: string) {
    try {
      await controls.kickPlayer(playerId);
      await fetchPlayers();
    } catch (err) {
      console.error("Kick player error:", err);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-green-300 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-red-400">{error}</p>
        <button
          onClick={() => router.push("/day-of-deception")}
          className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          Back to Day of Deception
        </button>
      </div>
    );
  }

  if (!config) return null;

  // Phase rendering
  if (phase === "lobby") {
    return (
      <DayHostLobby
        sessionId={sessionId}
        players={players}
        joinCode={joinCode}
        config={config}
        onStartGame={handleStartGame}
        onKickPlayer={handleKickPlayer}
      />
    );
  }

  if (phase === "roles_revealed") {
    return <DayHostRolesRevealed onBeginDay={handleBeginDay} playerCount={players.length} />;
  }

  if (phase === "freeplay") {
    return (
      <DayHostFreeplay
        players={players}
        onSendMission={handleSendMission}
        onStartEvent={handleStartEvent}
        onStartRoundtable={handleStartRoundtable}
        missionsSent={missionsSent}
        eventsCompleted={eventsCompleted}
        customEventNames={customEventNames}
      />
    );
  }

  if (phase === "event_active") {
    return (
      <DayHostEventActive
        eventData={eventData}
        onEndEvent={handleEndEvent}
        timerRemaining={timerRemaining}
        timerRunning={timerRunning}
      />
    );
  }

  if (phase === "roundtable") {
    return (
      <DayHostRoundtable
        timerRemaining={timerRemaining}
        timerRunning={timerRunning}
        onStartVoting={handleStartVoting}
      />
    );
  }

  if (phase === "voting") {
    return (
      <DayHostVoting
        sessionId={sessionId}
        onResolveVote={handleResolveVote}
        timerRemaining={timerRemaining}
        timerRunning={timerRunning}
      />
    );
  }

  if (phase === "reveal") {
    return (
      <DayHostReveal
        voteResult={voteResult}
        onEndGame={handleEndGame}
      />
    );
  }

  if (phase === "end") {
    return <DayHostEnd endgameData={endgameData} />;
  }

  // Fallback
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-2xl text-green-300 animate-pulse mb-2">Waiting...</div>
        <p className="text-white/40 text-sm">
          {connected ? "Connected" : "Connecting..."}
        </p>
      </div>
    </div>
  );
}
