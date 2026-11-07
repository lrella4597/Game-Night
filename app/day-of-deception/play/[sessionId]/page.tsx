"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRealtimeChannel } from "@/lib/live/useRealtimeChannel";
import { useLiveTimer } from "@/lib/live/useLiveTimer";
import { useDayPlayerControls } from "@/lib/day-of-deception/usePlayerControls";
import { DAY_HOST_EVENTS, getDayChannelName } from "@/lib/day-of-deception/channelEvents";
import DayPlayerLobby from "@/app/components/day-of-deception/player/DayPlayerLobby";
import DayPlayerRoleReveal from "@/app/components/day-of-deception/player/DayPlayerRoleReveal";
import DayPlayerFreeplay from "@/app/components/day-of-deception/player/DayPlayerFreeplay";
import DayPlayerEventActive from "@/app/components/day-of-deception/player/DayPlayerEventActive";
import DayPlayerRoundtable from "@/app/components/day-of-deception/player/DayPlayerRoundtable";
import DayPlayerVoting from "@/app/components/day-of-deception/player/DayPlayerVoting";
import DayPlayerReveal from "@/app/components/day-of-deception/player/DayPlayerReveal";
import DayPlayerEnd from "@/app/components/day-of-deception/player/DayPlayerEnd";
import type { DayPhase, PlayerRole, DayMission } from "@/lib/day-of-deception/types";
import HowToPlayModal from "@/app/components/HowToPlayModal";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { loadPlayer, clearPlayer, forgetLastSession } from "@/lib/day-of-deception/playerStorage";

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
  deceiverSecretMission?: string;
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

export default function TraitorsDayPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  // Player identity (persisted in localStorage, survives closing the app)
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [playerToken, setPlayerToken] = useState<string | null>(null);

  // Game state
  const [phase, setPhase] = useState<DayPhase>("lobby");
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [fellowDeceivers, setFellowDeceivers] = useState<
    { id: string; displayName: string }[]
  >([]);

  // Mission state
  const [missions, setMissions] = useState<DayMission[]>([]);

  // Event state
  const [eventData, setEventData] = useState<EventData | null>(null);

  // Vote state
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [voteSubmitted, setVoteSubmitted] = useState(false);

  // Vote result
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);

  // Endgame
  const [endgameData, setEndgameData] = useState<EndgameData | null>(null);

  // Mission polling ref
  const missionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load player identity
  useEffect(() => {
    if (!sessionId) return;
    const stored = loadPlayer(sessionId);

    if (!stored) {
      router.replace(`/day-of-deception/play`);
      return;
    }

    setPlayerId(stored.playerId);
    setPlayerName(stored.playerName);
    setPlayerToken(stored.playerToken);
  }, [sessionId, router]);

  // ── Realtime ──────────────────────────────────────────────────────────────

  const { connected, onBroadcast, broadcast } = useRealtimeChannel({
    sessionId,
    userId: playerId || "",
    userName: playerName || "",
    isHost: false,
    channelName: getDayChannelName(sessionId),
  });

  const controls = useDayPlayerControls({
    sessionId,
    playerId: playerId || "",
    playerToken: playerToken || "",
    broadcast,
  });

  const {
    permission: pushPermission,
    subscribed: pushSubscribed,
    subscribe: subscribePush,
    supported: pushSupported,
    needsInstall: pushNeedsInstall,
  } = usePushNotifications({ playerId: playerId || "", sessionId });
  const [pushPromptDismissed, setPushPromptDismissed] = useState(false);

  // ── Timer ─────────────────────────────────────────────────────────────────

  const { remaining: timerRemainingRaw, running: timerRunning, startTimer, clearTimer } =
    useLiveTimer({});
  const timerRemaining = timerRemainingRaw ?? 0;

  // ── Realtime listeners ────────────────────────────────────────────────────

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.PHASE_CHANGE, (raw: unknown) => {
      const payload = raw as AnyPayload;
      setPhase(payload.phase);
      if (payload.phase === "voting") {
        setVoteTarget(null);
        setVoteSubmitted(false);
      }
    });
  }, [onBroadcast]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.PLAYERS_UPDATE, (raw: unknown) => {
      const payload = raw as AnyPayload;
      setPlayers(payload.players);
    });
  }, [onBroadcast]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.TIMER_START, (raw: unknown) => {
      const payload = raw as AnyPayload;
      startTimer(payload.duration);
    });
  }, [onBroadcast, startTimer]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.TIMER_STOP, () => {
      clearTimer();
    });
  }, [onBroadcast, clearTimer]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.EVENT_START, (raw: unknown) => {
      const payload = raw as AnyPayload;
      setEventData({
        eventName: payload.eventName,
        instructions: payload.instructions,
        durationMinutes: payload.durationMinutes,
        deceiverSecretMission: payload.deceiverSecretMission,
      });
    });
  }, [onBroadcast]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.EVENT_END, () => {
      setEventData(null);
    });
  }, [onBroadcast]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.VOTE_RESULT, (raw: unknown) => {
      const payload = raw as AnyPayload;
      setVoteResult({
        voteTally: payload.voteTally,
        voteDetails: payload.voteDetails || [],
        accusedId: payload.accusedId,
        accusedName: payload.accusedName,
        accusedRole: payload.accusedRole,
        tied: payload.tied,
        winner: payload.winner,
      });
    });
  }, [onBroadcast]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.ENDGAME, (raw: unknown) => {
      const payload = raw as AnyPayload;
      setEndgameData({ winner: payload.winner, players: payload.players });
    });
  }, [onBroadcast]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(DAY_HOST_EVENTS.PLAYER_KICKED, (raw: unknown) => {
      const payload = raw as AnyPayload;
      if (payload.playerId === playerId) {
        clearPlayer(sessionId);
        router.push("/day-of-deception/play");
      }
    });
  }, [onBroadcast, playerId, sessionId, router]);

  // ── Catch up with the game ────────────────────────────────────────────────
  // Live broadcasts are missed while the phone is closed or asleep, so pull a
  // snapshot from the server on open, whenever the app comes back to the
  // foreground, and when the realtime connection reconnects.

  const syncState = useCallback(async () => {
    if (!playerId || !playerToken) return;
    try {
      const params = new URLSearchParams({ sessionId, playerId, token: playerToken });
      const res = await fetch(`/api/day-of-deception/player-state?${params}`, { cache: "no-store" });
      // Kicked, bad token, or the game no longer exists
      if (res.status === 410 || res.status === 403 || res.status === 404) {
        clearPlayer(sessionId);
        router.replace("/day-of-deception/play");
        return;
      }
      if (res.status === 401) {
        // Signed out on this phone: sign back in, then we come right back
        router.replace("/day-of-deception/play?signin=1");
        return;
      }
      if (!res.ok) return;
      const s = await res.json();
      // Game is over: opening the app next time should go to the join screen
      if (s.finished) forgetLastSession(sessionId);

      setPhase(s.phase);
      setPlayers(s.players);
      if (s.role) {
        setMyRole(s.role);
        setFellowDeceivers(s.deceivers || []);
      }
      setEventData(s.event);
      if (s.phase === "voting") {
        setVoteSubmitted(!!s.voteSubmitted);
        if (s.voteTarget) setVoteTarget(s.voteTarget);
      }
      if (s.voteResult) setVoteResult(s.voteResult);
      if (s.endgame) setEndgameData(s.endgame);
      if (typeof s.timerSeconds === "number" && s.timerSeconds > 0) {
        startTimer(s.timerSeconds);
      } else if (s.phase !== "voting") {
        clearTimer();
      }
    } catch (err) {
      console.error("Failed to sync game state:", err);
    }
  }, [sessionId, playerId, playerToken, router, startTimer, clearTimer]);

  useEffect(() => {
    syncState();
  }, [syncState]);

  useEffect(() => {
    if (connected) syncState();
  }, [connected, syncState]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") syncState();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [syncState]);

  // ── Role fetching ─────────────────────────────────────────────────────────

  const fetchRole = useCallback(async () => {
    if (!playerId || !playerToken) return;
    try {
      const data = await controls.fetchMyRole();
      setMyRole(data.role);
      if (data.deceivers) {
        setFellowDeceivers(data.deceivers.filter((t) => t.id !== playerId));
      }
    } catch (err) {
      console.error("Failed to fetch role:", err);
    }
  }, [playerId, playerToken, controls]);

  // Fetch role when entering roles_revealed phase
  useEffect(() => {
    if (phase === "roles_revealed" && playerId && playerToken) {
      fetchRole();
    }
  }, [phase, playerId, playerToken, fetchRole]);

  // ── Mission polling (traitor only, during freeplay/event_active) ──────────

  const fetchMissions = useCallback(async () => {
    if (!playerId || !playerToken) return;
    try {
      const data = await controls.fetchMyMissions();
      setMissions(data);
    } catch (err) {
      console.error("Failed to fetch missions:", err);
    }
  }, [playerId, playerToken, controls]);

  useEffect(() => {
    if ((phase === "freeplay" || phase === "event_active") && myRole === "traitor" && playerId) {
      fetchMissions();
      missionPollRef.current = setInterval(fetchMissions, 10000);
      return () => {
        if (missionPollRef.current) clearInterval(missionPollRef.current);
      };
    }
    return () => {
      if (missionPollRef.current) clearInterval(missionPollRef.current);
    };
  }, [phase, myRole, playerId, fetchMissions]);

  // ── Vote submission ───────────────────────────────────────────────────────

  async function handleVoteSubmit() {
    if (!voteTarget || voteSubmitted) return;
    try {
      await controls.submitVote(voteTarget);
      setVoteSubmitted(true);
    } catch (err) {
      console.error("Vote submission error:", err);
    }
  }

  // ── Mission completion ────────────────────────────────────────────────────

  async function handleCompleteMission(missionId: string, proof?: string) {
    try {
      await controls.completeMission(missionId, proof);
      await fetchMissions();
    } catch (err) {
      console.error("Complete mission error:", err);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!playerId || !playerName) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-green-300 animate-pulse">Loading...</div>
      </div>
    );
  }

  const dodPlayerHelp = (
    <HowToPlayModal
      gameKey="howto_dod_player"
      title="How to Play Day of Deception"
      accentColor="red"
      sections={[
        {
          title: "Your Role",
          steps: [
            "You are secretly assigned as either Faithful or Deceiver",
            "Faithful: Work together to identify the Deceivers among you",
            "Deceiver: Blend in and avoid being caught while completing secret missions",
          ],
        },
        {
          title: "During the Day",
          steps: [
            "Complete missions sent by the host to earn Shadow Tokens",
            "Participate in group events — Deceivers may have secret objectives",
            "Pay attention to how others behave — look for suspicious actions",
          ],
        },
        {
          title: "Roundtable & Voting",
          steps: [
            "During the Roundtable, discuss openly who you suspect and why",
            "When voting starts, pick the player you think is a Deceiver",
            "The player with the most votes is revealed — were they Faithful or Deceiver?",
            "Faithfuls win by finding all Deceivers. Deceivers win by surviving.",
          ],
        },
      ]}
    />
  );

  // Notification prompt, shown in every phase until handled, so players who
  // rejoin mid-game still get asked.
  const pushPrompt = pushPromptDismissed || pushSubscribed || pushPermission === "denied" ? null : pushNeedsInstall ? (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-gray-900 border border-green-500/40 rounded-xl p-4 flex items-start gap-3 shadow-lg">
      <span className="text-2xl">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">Add this game to your home screen</p>
        <p className="text-white/60 text-xs mt-1">
          iPhones only send game alerts to home screen apps. Tap the Share button, then
          &ldquo;Add to Home Screen&rdquo;. Open it from there and sign in with the same account.
        </p>
      </div>
      <button
        onClick={() => setPushPromptDismissed(true)}
        className="shrink-0 text-white/40 hover:text-white text-sm"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  ) : pushSupported ? (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-gray-900 border border-green-500/40 rounded-xl p-4 flex items-center gap-3 shadow-lg">
      <span className="text-2xl">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">Enable notifications</p>
        <p className="text-white/50 text-xs">Get secret alerts even when your phone is locked</p>
      </div>
      <button
        onClick={subscribePush}
        className="shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Allow
      </button>
    </div>
  ) : null;

  return (
    <>
      {pushPrompt}
      {renderPhase()}
    </>
  );

  function renderPhase() {
  // Phase rendering
  if (phase === "lobby") {
    return (
      <>
        <div className="fixed top-4 right-4 z-40">{dodPlayerHelp}</div>
        <DayPlayerLobby players={players} playerName={playerName ?? ""} />
      </>
    );
  }

  if (phase === "roles_revealed") {
    return (
      <>
        <div className="fixed top-4 right-4 z-40">{dodPlayerHelp}</div>
        <DayPlayerRoleReveal
          role={myRole}
          fellowDeceivers={fellowDeceivers}
          loading={myRole === null}
        />
      </>
    );
  }

  if (phase === "freeplay") {
    return (
      <>
        <div className="fixed top-4 right-4 z-40">{dodPlayerHelp}</div>
        <DayPlayerFreeplay
          role={myRole}
          missions={missions}
          onCompleteMission={handleCompleteMission}
        />
      </>
    );
  }

  if (phase === "event_active") {
    return (
      <>
        <div className="fixed top-4 right-4 z-40">{dodPlayerHelp}</div>
        <DayPlayerEventActive
          eventData={eventData}
          role={myRole}
          timerRemaining={timerRemaining}
          timerRunning={timerRunning}
        />
      </>
    );
  }

  if (phase === "roundtable") {
    return (
      <>
      <div className="fixed top-4 right-4 z-40">{dodPlayerHelp}</div>
      <DayPlayerRoundtable
        timerRemaining={timerRemaining}
        timerRunning={timerRunning}
      />
      </>
    );
  }

  if (phase === "voting") {
    return (
      <>
        <div className="fixed top-4 right-4 z-40">{dodPlayerHelp}</div>
        <DayPlayerVoting
          players={players}
          myPlayerId={playerId ?? ""}
          selectedTarget={voteTarget}
          onSelectTarget={setVoteTarget}
          onSubmit={handleVoteSubmit}
          submitted={voteSubmitted}
          timerRemaining={timerRemaining}
          timerRunning={timerRunning}
        />
      </>
    );
  }

  if (phase === "reveal") {
    return (
      <>
        <div className="fixed top-4 right-4 z-40">{dodPlayerHelp}</div>
        <DayPlayerReveal voteResult={voteResult} myRole={myRole} />
      </>
    );
  }

  if (phase === "end" && endgameData) {
    return <DayPlayerEnd endgameData={endgameData} myRole={myRole} />;
  }

  // Fallback — waiting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-2xl text-green-300 animate-pulse mb-2">
          Waiting...
        </div>
        <p className="text-white/40 text-sm">
          {connected ? "Connected" : "Connecting..."}
        </p>
      </div>
    </div>
  );
  }
}
