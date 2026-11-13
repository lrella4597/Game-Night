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
import type { RevealState } from "@/app/components/day-of-deception/player/DayPlayerReveal";
import { BreakfastCard, MurderNews, OutBanner, RewardChoice, ShieldNews } from "@/app/components/day-of-deception/player/DayPlayerMurder";
import DayPlayerSecrets from "@/app/components/day-of-deception/player/DayPlayerSecrets";
import type { SecretExtras, SecretMurder } from "@/app/components/day-of-deception/player/DayPlayerSecrets";
import type { MurderState } from "@/app/components/day-of-deception/player/DayPlayerMurder";
import HostPanel from "@/app/components/day-of-deception/host/HostPanel";
import DayPlayerEnd from "@/app/components/day-of-deception/player/DayPlayerEnd";
import type { DayPhase, PlayerRole, DayMission } from "@/lib/day-of-deception/types";
import DodHelp from "@/app/components/day-of-deception/DodHelp";
import { Button, Icon, LoadingScreen, Screen } from "@/app/components/day-of-deception/ui";
import AboutYouCard from "@/app/components/day-of-deception/player/AboutYouCard";
import DayPlayerClues from "@/app/components/day-of-deception/player/DayPlayerClues";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { loadPlayer, clearPlayer, forgetLastSession } from "@/lib/day-of-deception/playerStorage";
import { useGameChanges } from "@/lib/day-of-deception/useGameChanges";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPayload = any;

interface PublicPlayer {
  id: string;
  displayName: string;
  avatarColor: string;
  isConnected: boolean;
  shadowTokens: number;
  eliminated?: string | null;
  shield?: boolean;
}

interface EventData {
  eventName: string;
  instructions: string;
  durationMinutes: number;
  deceiverSecretMission?: string;
}

interface EndgameData {
  winner: string;
  players: { id: string; displayName: string; role: string; shadowTokens: number }[];
}

// Phases where the clue card shows under the main screen
const CLUE_PHASES: DayPhase[] = ["freeplay", "event_active", "roundtable", "voting"];

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

  // The reveal (step by step), the murder, and whether I'm still in
  const [reveal, setReveal] = useState<RevealState | null>(null);
  const [murder, setMurder] = useState<MurderState & SecretMurder>({ status: null, victimName: null });
  const [breakfast, setBreakfast] = useState<{ checkedIn: boolean; waitingOn: number } | null>(null);
  const [endgameVote, setEndgameVote] = useState<{ mine: string | null; voted: number; voters: number } | null>(null);
  const [secretExtras, setSecretExtras] = useState<SecretExtras>({});
  const [gameLength, setGameLength] = useState<"day" | "weekend">("day");
  const [paused, setPaused] = useState(false);
  const [eliminated, setEliminated] = useState<string | null>(null);
  // The host plays too: their screen gets a Host button
  const [isHost, setIsHost] = useState(false);
  // Won an event with the shield on the line and hasn't chosen yet
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);

  // "About you" answers: null until we know, then whether to ask
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // Clues: bumped on every live change so the clue card refetches
  const [clueRefresh, setClueRefresh] = useState(0);

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
    error: pushError,
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
      if (typeof s.hasProfile === "boolean") setHasProfile((prev) => prev || s.hasProfile);
      if (s.role) {
        setMyRole(s.role);
        setFellowDeceivers(s.deceivers || []);
      }
      setEventData(s.event);
      if (s.phase === "voting") {
        setVoteSubmitted(!!s.voteSubmitted);
        if (s.voteTarget) setVoteTarget(s.voteTarget);
      }
      setReveal(s.reveal ?? null);
      if (s.murder) setMurder(s.murder);
      setBreakfast(s.breakfast ?? null);
      setEndgameVote(s.endgameVote ?? null);
      setSecretExtras(s.secretExtras ?? {});
      setGameLength(s.gameLength === "weekend" ? "weekend" : "day");
      setPaused(!!s.paused);
      setEliminated(s.eliminated ?? null);
      setIsHost(!!s.isHost);
      setPendingChoice(s.pendingChoice ?? null);
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

  // Live updates straight from the database: the game moves forward for
  // players even when the host's screen is asleep, and automatic missions
  // show up the moment the server sends them.
  useGameChanges(playerId ? sessionId : null, () => {
    syncState();
    setClueRefresh((n) => n + 1);
    if (myRole === "traitor") fetchMissions();
  });

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
    // Errors go back to the mission card so the Traitor sees them
    await controls.completeMission(missionId, proof);
    await fetchMissions();
  }

  async function playerAction(action: string, extra?: Record<string, unknown>) {
    const res = await fetch("/api/day-of-deception/player-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, playerId, token: playerToken, action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "That didn't work. Try again.");
    await syncState();
    return data;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!playerId || !playerName) {
    return <LoadingScreen />;
  }

  const dodPlayerHelp = (
    <DodHelp
      gameKey="howto_dod_player_v3"
      title="How to play"
      sections={[
        {
          title: "Keep it secret",
          steps: [
            "Your screen looks the same as everyone's. Your role, missions and anything private are under My secret",
            "My secret hides itself after 30 seconds. Check nobody's looking before you open it",
          ],
        },
        {
          title: "Each round",
          steps: [
            "The Traitors murder someone in plain sight, with a move like tossing them an apple. One murder per round",
            "Breakfast: everyone taps I'm here, then the victim is revealed",
            "Events: win a private clue, the shield-or-team-clue choice, a double vote, or a truth check (pick two players, learn if a Traitor is among them)",
            "Clues never name anyone. They say what the Traitors were told to do, so watch who does it",
            "Then the Roundtable",
          ],
        },
        {
          title: "Roundtable",
          steps: [
            "Lock your vote on your phone, then hold it up and say who and why",
            "The banished player says their piece and reveals for themselves if they were a Traitor",
            "Lose a Traitor and the rest can recruit someone",
            "With 4 or fewer left: end the game, or banish again. Ending needs everyone, and any Traitor left wins it",
          ],
        },
      ]}
    />
  );

  // Notification prompt, shown in every phase until handled, so players who
  // rejoin mid-game still get asked.
  const pushPrompt = pushPromptDismissed || pushSubscribed || pushPermission === "denied" ? null : pushNeedsInstall ? (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-[#16161B]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8C67A]/15 text-[#E8C67A]">
          <Icon name="plus" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-white">Add the game to your home screen</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/55">
            iPhones only send game alerts to home screen apps. Tap Share, then &ldquo;Add to Home Screen&rdquo;.
            Open it from there and sign in again.
          </p>
        </div>
        <button onClick={() => setPushPromptDismissed(true)} aria-label="Dismiss" className="-mr-1 -mt-1 p-1 text-white/35 hover:text-white">
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : pushSupported ? (
    <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-[#16161B]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8C67A]/15 text-[#E8C67A]">
          <Icon name="bell" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-white">Turn on alerts</p>
          <p className={`text-[13px] ${pushError ? "text-rose-300" : "text-white/50"}`}>
            {pushError ?? "Missions and clues, even when your phone is locked."}
          </p>
        </div>
        <Button size="sm" onClick={subscribePush}>
          Allow
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {pushPrompt}
      {isHost && <HostPanel sessionId={sessionId} broadcast={broadcast} mode="sheet" myPlayerId={playerId} />}
      {CLUE_PHASES.includes(phase) && playerId && playerToken ? (
        // The same look for every player: nothing on this screen says who you are
        <Screen tone="neutral" className="pb-16">
          <OutBanner how={eliminated} />
          {paused && (
            <p className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/70">
              🌙 The game is paused for the night. See you in the morning.
            </p>
          )}
          <BreakfastCard
            title={gameLength === "weekend" ? "☕ Breakfast" : "🔔 Gather round"}
            breakfast={breakfast}
            onCheckIn={async () => {
              await playerAction("check_in");
            }}
          />
          <MurderNews victimName={murder.victimName} isMe={eliminated === "murdered"} />
          <RewardChoice
            eventName={eliminated ? null : pendingChoice}
            onChoose={async (choice) => {
              await playerAction("reward_choice", { targetId: choice });
            }}
          />
          <ShieldNews names={players.filter((p) => p.shield && !p.eliminated).map((p) => (p.id === playerId ? "You" : p.displayName))} />
          <DayPlayerSecrets
            sessionId={sessionId}
            playerId={playerId}
            playerToken={playerToken}
            role={myRole}
            fellowTraitors={fellowDeceivers}
            missions={missions}
            murder={murder}
            extras={secretExtras}
            players={players}
            eliminated={eliminated}
            onCompleteMission={handleCompleteMission}
            onAction={playerAction}
          />
          {renderPhase()}
          <DayPlayerClues
            sessionId={sessionId}
            playerId={playerId}
            playerToken={playerToken}
            role={myRole}
            players={players}
            refreshKey={clueRefresh}
          />
        </Screen>
      ) : (
        renderPhase()
      )}
    </>
  );

  function renderPhase() {
  // Phase rendering
  if (phase === "lobby") {
    return (
      <>
        {dodPlayerHelp}
        <DayPlayerLobby players={players} playerName={playerName ?? ""}>
          {hasProfile === false && playerId && playerToken ? (
            <AboutYouCard
              sessionId={sessionId}
              playerId={playerId}
              playerToken={playerToken}
              onDone={() => setHasProfile(true)}
            />
          ) : null}
        </DayPlayerLobby>
      </>
    );
  }

  if (phase === "roles_revealed") {
    return (
      <>
        {dodPlayerHelp}
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
        {dodPlayerHelp}
        <DayPlayerFreeplay />
      </>
    );
  }

  if (phase === "event_active") {
    return (
      <>
        {dodPlayerHelp}
        <DayPlayerEventActive
          eventData={eventData}
          timerRemaining={timerRemaining}
          timerRunning={timerRunning}
        />
      </>
    );
  }

  if (phase === "roundtable") {
    return (
      <>
      {dodPlayerHelp}
      <DayPlayerRoundtable
        timerRemaining={timerRemaining}
        timerRunning={timerRunning}
      />
      </>
    );
  }

  if (phase === "voting" && eliminated) {
    return (
      <p className="py-16 text-center text-[15px] text-white/50">Voting is underway. You&apos;re out, so just watch.</p>
    );
  }

  if (phase === "voting") {
    return (
      <>
        {dodPlayerHelp}
        <DayPlayerVoting
          players={players.filter((p) => !p.eliminated && !p.shield)}
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
        {dodPlayerHelp}
        <DayPlayerReveal
          reveal={reveal}
          myRole={myRole}
          onRevealRole={async () => {
            await playerAction("reveal_role");
          }}
          endgameVote={eliminated ? null : endgameVote}
          onEndgameVote={async (v) => {
            await playerAction("endgame_vote", { targetId: v });
          }}
        />
      </>
    );
  }

  if (phase === "end" && endgameData) {
    return (
      <DayPlayerEnd endgameData={endgameData} myRole={myRole} recapQuery={`sessionId=${sessionId}&playerId=${playerId}&token=${encodeURIComponent(playerToken ?? "")}`} />
    );
  }

  // Fallback: waiting
  return <LoadingScreen label={connected ? "Waiting for the game" : "Connecting"} />;
  }
}
