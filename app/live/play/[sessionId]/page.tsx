"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel } from "@/lib/live/useRealtimeChannel";
import { usePlayerControls } from "@/lib/live/usePlayerControls";
import { HOST_EVENTS, PLAYER_EVENTS } from "@/lib/live/channelEvents";
import { useLiveTimer } from "@/lib/live/useLiveTimer";
import PlayerLobby from "@/app/components/live/player/PlayerLobby";
import PlayerBuzzer from "@/app/components/live/player/PlayerBuzzer";
import PlayerWaiting from "@/app/components/live/player/PlayerWaiting";
import PlayerFinalWager from "@/app/components/live/player/PlayerFinalWager";
import PlayerFinalDraw from "@/app/components/live/player/PlayerFinalDraw";
import PlayerDailyDoubleWager from "@/app/components/live/player/PlayerDailyDoubleWager";
import type { LiveSession, LivePlayer, LiveSessionRow, LivePlayerRow, GamePhase } from "@/lib/live/types";
import { sessionFromRow as toSession, playerFromRow as toPlayer } from "@/lib/live/types";

export default function PlayerGamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [scoreDelta, setScoreDelta] = useState<{ delta: number; correct: boolean } | null>(null);

  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    const storedId = sessionStorage.getItem(`live-player-id-${sessionId}`);
    const storedName = sessionStorage.getItem(`live-player-name-${sessionId}`);

    if (!storedId || !storedName) {
      router.push("/live/play");
      return;
    }

    setPlayerId(storedId);
    setPlayerName(storedName);
  }, [sessionId, router]);

  const { connected, broadcast, onBroadcast } = useRealtimeChannel({
    sessionId,
    userId: playerId,
    userName: playerName,
    isHost: false,
  });

  const { buzz, submitFinalWager, submitFinalDrawing, submitDailyDoubleWager } = usePlayerControls({ playerId, sessionId, broadcast });

  // Final Jeopardy state
  const [finalCategory, setFinalCategory] = useState<string>("");
  const [finalClue, setFinalClue] = useState<string>("");
  const [finalSubmitted, setFinalSubmitted] = useState(false);

  // Daily Double state
  const [ddPlayerId, setDdPlayerId] = useState<string | null>(null);
  const [ddCategory, setDdCategory] = useState<string>("");
  const [ddMaxClueValue, setDdMaxClueValue] = useState<number>(500);

  // Timer for final drawing
  const { remaining: timerRemaining, running: timerRunning, startTimer } = useLiveTimer({});

  // Notify host when connected
  useEffect(() => {
    if (connected && playerId) {
      broadcast(PLAYER_EVENTS.PLAYER_READY, { playerId });
    }
  }, [connected, playerId, broadcast]);

  // Load session data
  useEffect(() => {
    if (!sessionId || !playerId) return;

    async function loadData() {
      const { data: sessionRow, error: sessionErr } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionErr || !sessionRow) {
        setError("Session not found");
        setLoading(false);
        return;
      }

      setSession(toSession(sessionRow as LiveSessionRow));

      // Check if game already started
      const { data: stateRow } = await supabase
        .from("live_game_state")
        .select("phase")
        .eq("session_id", sessionId)
        .single();

      if (stateRow) {
        setPhase(stateRow.phase as GamePhase);
      }

      const { data: playerRows } = await supabase
        .from("live_players")
        .select("*")
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true });

      if (playerRows) {
        setPlayers(playerRows.map((r) => toPlayer(r as LivePlayerRow)));
        const me = playerRows.find((r) => r.id === playerId);
        if (me) setCurrentScore(me.score);
      }

      setLoading(false);
    }

    loadData();
  }, [sessionId, playerId, supabase]);

  // Listen for phase changes
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.PHASE_CHANGE, (payload: unknown) => {
      const data = payload as { phase: GamePhase };
      setPhase(data.phase);
      // Reset buzzer state on new clue/phase
      if (data.phase === "clue_display" || data.phase === "board_select") {
        setHasBuzzed(false);
        setScoreDelta(null);
        setDdPlayerId(null);
      }
    });
  }, [onBroadcast]);

  // Listen for buzzer open
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.BUZZER_OPEN, () => {
      setHasBuzzed(false);
    });
  }, [onBroadcast]);

  // Listen for Daily Double announcements
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.DAILY_DOUBLE, (payload: unknown) => {
      const data = payload as { playerId: string; playerName: string; categoryTitle?: string };
      setDdPlayerId(data.playerId);
      if (data.categoryTitle) setDdCategory(data.categoryTitle);
    });
  }, [onBroadcast]);

  // Listen for round transitions
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.ROUND_TRANSITION, (payload: unknown) => {
      const data = payload as { round: number };
      setDdMaxClueValue(data.round === 2 ? 1000 : 500);
    });
  }, [onBroadcast]);

  // Listen for player updates
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.PLAYERS_UPDATE, (payload: unknown) => {
      const data = payload as { players: LivePlayer[] };
      if (data.players) {
        setPlayers(data.players);
        const me = data.players.find((p) => p.id === playerId);
        if (me) setCurrentScore(me.score);
      }
    });
  }, [onBroadcast, playerId]);

  // Listen for score updates
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.SCORE_UPDATE, (payload: unknown) => {
      const data = payload as { playerId: string; newScore: number; delta: number };
      if (data.playerId === playerId) {
        setCurrentScore(data.newScore);
      }
    });
  }, [onBroadcast, playerId]);

  // Listen for answer results (show feedback)
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.ANSWER_RESULT, (payload: unknown) => {
      const data = payload as { playerId: string; correct: boolean; delta: number };
      if (data.playerId === playerId) {
        setScoreDelta({ delta: data.delta, correct: data.correct });
        setTimeout(() => setScoreDelta(null), 3000);
      }
    });
  }, [onBroadcast, playerId]);

  // Listen for kick
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.PLAYER_KICKED, (payload: unknown) => {
      const data = payload as { playerId: string };
      if (data.playerId === playerId) {
        sessionStorage.removeItem(`live-player-id-${sessionId}`);
        sessionStorage.removeItem(`live-player-name-${sessionId}`);
        router.push("/live/play");
      }
    });
  }, [onBroadcast, playerId, sessionId, router]);

  // Listen for state updates (Final Jeopardy data)
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.STATE_UPDATE, (payload: unknown) => {
      const data = payload as Record<string, unknown>;
      if (data.finalCategory) setFinalCategory(data.finalCategory as string);
      if (data.finalClue) setFinalClue(data.finalClue as string);
    });
  }, [onBroadcast]);

  // Listen for timer starts (used for final drawing countdown)
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.TIMER_START, (payload: unknown) => {
      const data = payload as { durationSeconds: number };
      if (data.durationSeconds) startTimer(data.durationSeconds);
    });
  }, [onBroadcast, startTimer]);

  function handleSubmitFinalWager(wager: number) {
    submitFinalWager(wager);
  }

  function handleSubmitFinalDrawing(drawingDataUrl: string, textAnswer?: string) {
    setFinalSubmitted(true);
    submitFinalDrawing(drawingDataUrl, textAnswer);
  }

  function handleSubmitDdWager(wager: number) {
    submitDailyDoubleWager(wager);
  }

  function handleBuzz() {
    buzz();
    setHasBuzzed(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-blue-200 animate-pulse">Joining game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-red-300">{error}</p>
        <button
          onClick={() => router.push("/live/play")}
          className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!session) return null;

  // ── Lobby ──────────────────────────────────────────────────────────────────

  if (phase === "lobby" || phase === "prep") {
    return (
      <PlayerLobby
        session={session}
        players={players}
        playerId={playerId}
        playerName={playerName}
        connected={connected}
        statusMessage={phase === "prep" ? "Host is preparing the board..." : undefined}
      />
    );
  }

  // ── Game phases ────────────────────────────────────────────────────────────

  const currentPlayer = players.find((p) => p.id === playerId);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Score header */}
      <div className="bg-black/30 px-4 py-3 flex items-center justify-between">
        <span className="text-white font-medium">{playerName}</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold tabular-nums ${currentScore >= 0 ? "text-green-400" : "text-red-400"}`}>
            ${currentScore.toLocaleString()}
          </span>
          {scoreDelta && (
            <span
              className={`text-sm font-bold animate-bounce ${
                scoreDelta.correct ? "text-green-300" : "text-red-300"
              }`}
            >
              {scoreDelta.delta > 0 ? "+" : ""}
              {scoreDelta.delta}
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {/* Round intro */}
        {phase === "round_intro" && (
          <PlayerWaiting message="Get ready for the next round!" player={currentPlayer} />
        )}

        {/* Board select - waiting */}
        {phase === "board_select" && (
          <PlayerWaiting message="Host is selecting a clue..." player={currentPlayer} />
        )}

        {/* Clue display - waiting for buzzer */}
        {phase === "clue_display" && (
          <PlayerWaiting message="Reading clue... get ready to buzz!" player={currentPlayer} />
        )}

        {/* Buzzer open */}
        {phase === "buzzer_open" && (
          <PlayerBuzzer buzzerOpen onBuzz={handleBuzz} hasBuzzed={hasBuzzed} />
        )}

        {/* Answer check */}
        {phase === "answer_check" && (
          <PlayerWaiting
            message={hasBuzzed ? "Waiting for host to judge..." : "Someone is answering..."}
            player={currentPlayer}
          />
        )}

        {/* Daily Double - I'm the DD player: show wager input */}
        {phase === "daily_double_wager" && ddPlayerId === playerId && (
          <PlayerDailyDoubleWager
            currentScore={currentScore}
            maxClueValue={ddMaxClueValue}
            category={ddCategory || "Daily Double"}
            onSubmitWager={handleSubmitDdWager}
          />
        )}

        {/* Daily Double - I'm NOT the DD player */}
        {phase === "daily_double_wager" && ddPlayerId !== playerId && (
          <PlayerWaiting message="Daily Double! Another player is wagering..." player={currentPlayer} />
        )}

        {/* Daily Double - Answer phase */}
        {phase === "daily_double_answer" && (
          <PlayerWaiting
            message={ddPlayerId === playerId ? "You're answering the Daily Double!" : "Daily Double in progress..."}
            player={currentPlayer}
          />
        )}

        {/* Final Jeopardy - Category reveal */}
        {phase === "final_category" && (
          <PlayerWaiting message="Final Jeopardy is coming..." player={currentPlayer} />
        )}

        {/* Final Jeopardy - Wager */}
        {phase === "final_wager" && (
          <PlayerFinalWager
            currentScore={currentScore}
            category={finalCategory}
            onSubmitWager={handleSubmitFinalWager}
          />
        )}

        {/* Final Jeopardy - Clue display (before drawing opens) */}
        {phase === "final_clue" && (
          <PlayerWaiting message="Final Jeopardy clue revealed! Get ready to answer..." player={currentPlayer} />
        )}

        {/* Final Jeopardy - Drawing */}
        {phase === "final_draw" && (
          <PlayerFinalDraw
            clue={finalClue}
            category={finalCategory}
            timerRemaining={timerRemaining}
            timerRunning={timerRunning}
            onSubmit={handleSubmitFinalDrawing}
            disabled={finalSubmitted}
          />
        )}

        {/* Final Jeopardy - Locked / Reveal */}
        {(phase === "final_locked" || phase === "final_reveal") && (
          <PlayerWaiting
            message={phase === "final_locked" ? "Answers locked! Waiting for reveal..." : "Host is revealing answers..."}
            player={currentPlayer}
          />
        )}

        {/* Game over */}
        {phase === "game_over" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <h2 className="text-3xl font-bold text-[#FFD700]">Game Over!</h2>
            <p className="text-2xl font-bold text-white">
              Final Score: ${currentScore.toLocaleString()}
            </p>
            <button
              onClick={() => router.push("/live")}
              className="mt-4 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
