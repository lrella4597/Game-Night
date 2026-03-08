"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel } from "@/lib/live/useRealtimeChannel";
import { usePlayerControls } from "@/lib/live/usePlayerControls";
import { HOST_EVENTS, PLAYER_EVENTS } from "@/lib/live/channelEvents";
import { useLiveTimer } from "@/lib/live/useLiveTimer";
import LiveTimer from "@/app/components/live/shared/LiveTimer";
import PlayerLobby from "@/app/components/live/player/PlayerLobby";
import PlayerBuzzer from "@/app/components/live/player/PlayerBuzzer";
import PlayerWaiting from "@/app/components/live/player/PlayerWaiting";
import PlayerFinalWager from "@/app/components/live/player/PlayerFinalWager";
import PlayerFinalDraw from "@/app/components/live/player/PlayerFinalDraw";
import PlayerDailyDoubleWager from "@/app/components/live/player/PlayerDailyDoubleWager";
import type { LiveSession, LivePlayer, LiveSessionRow, LivePlayerRow, GamePhase } from "@/lib/live/types";
import { sessionFromRow as toSession, playerFromRow as toPlayer } from "@/lib/live/types";
import HowToPlayModal from "@/app/components/HowToPlayModal";

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
  const [reconnecting, setReconnecting] = useState(false);

  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");

  // Clue display state (Phase 3)
  const [currentClueText, setCurrentClueText] = useState<string>("");
  const [currentCategoryTitle, setCurrentCategoryTitle] = useState<string>("");
  const [currentClueValue, setCurrentClueValue] = useState<number>(0);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // Validate and rejoin on mount using localStorage
  useEffect(() => {
    async function initPlayer() {
      const storedId = localStorage.getItem(`live-player-id-${sessionId}`);
      const storedName = localStorage.getItem(`live-player-name-${sessionId}`);

      if (!storedId || !storedName) {
        router.push("/live/play");
        return;
      }

      // Attempt rejoin to validate session is still active
      try {
        const res = await fetch("/api/live/rejoin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: storedId, sessionId }),
        });

        if (res.ok) {
          const data = await res.json();
          setPlayerId(data.playerId);
          setPlayerName(data.playerName);
          if (data.currentPhase) setPhase(data.currentPhase);
        } else {
          // Session ended or player removed — clean up and redirect
          localStorage.removeItem(`live-player-id-${sessionId}`);
          localStorage.removeItem(`live-player-name-${sessionId}`);
          localStorage.removeItem(`live-player-token-${sessionId}`);
          router.push("/live/play");
          return;
        }
      } catch {
        // Network error — use stored values and hope for the best
        setPlayerId(storedId);
        setPlayerName(storedName);
      }
    }

    initPlayer();
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

  // Timer for buzzer countdown + final drawing
  const { remaining: timerRemaining, running: timerRunning, startTimer } = useLiveTimer({});

  // Reconnection banner: show when disconnected
  useEffect(() => {
    if (playerId && !loading) {
      setReconnecting(!connected);
    }
  }, [connected, playerId, loading]);

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
      if (data.phase === "clue_display" || data.phase === "board_select" || data.phase === "buzzer_open") {
        setHasBuzzed(false);
        setScoreDelta(null);
        setDdPlayerId(null);
      }
      // Clear clue text when returning to board
      if (data.phase === "board_select") {
        setCurrentClueText("");
        setCurrentCategoryTitle("");
        setCurrentClueValue(0);
      }
    });
  }, [onBroadcast]);

  // Listen for clue selection (Phase 3: receive clue text)
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.CLUE_SELECT, (payload: unknown) => {
      const data = payload as { catIdx: number; clueIdx: number; value: number; clueText?: string; categoryTitle?: string };
      if (data.clueText) setCurrentClueText(data.clueText);
      if (data.categoryTitle) setCurrentCategoryTitle(data.categoryTitle);
      if (data.value) setCurrentClueValue(data.value);
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
        localStorage.removeItem(`live-player-id-${sessionId}`);
        localStorage.removeItem(`live-player-name-${sessionId}`);
        localStorage.removeItem(`live-player-token-${sessionId}`);
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

  // Listen for timer starts (buzzer countdown + final drawing)
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

  const jeopardyPlayerHelp = (
    <HowToPlayModal
      gameKey="howto_jeopardy_player"
      title="How to Play Jeopardy"
      accentColor="blue"
      sections={[
        {
          title: "Joining",
          steps: [
            "Enter the join code from the host and pick a display name",
            "Wait in the lobby until the host starts the game",
          ],
        },
        {
          title: "Gameplay",
          steps: [
            "The host picks clues from the board — watch for the question",
            "When the buzzer opens, tap the BUZZ button as fast as you can",
            "If you buzz first, answer out loud — the host judges correct or incorrect",
            "Correct = earn points, Incorrect = lose points",
          ],
        },
        {
          title: "Special Rounds",
          steps: [
            "Daily Double: If chosen, you wager before answering alone",
            "Final Jeopardy: Wager any amount of your score, then draw or type your answer before time runs out",
          ],
        },
      ]}
    />
  );

  return (
    <div className="flex flex-col min-h-screen">
      <div className="fixed top-4 right-4 z-40">{jeopardyPlayerHelp}</div>

      {/* Reconnecting banner */}
      {reconnecting && (
        <div className="bg-yellow-500 text-black px-4 py-3 flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">Connection lost — trying to reconnect...</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-xs font-bold transition-all"
          >
            Tap here to rejoin now
          </button>
        </div>
      )}

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

        {/* Clue display - show clue text to players */}
        {phase === "clue_display" && (
          currentClueText ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
              <div className="text-center">
                {currentCategoryTitle && (
                  <p className="text-blue-300 text-sm font-semibold uppercase tracking-wider mb-1">
                    {currentCategoryTitle} — ${currentClueValue}
                  </p>
                )}
                <p className="text-white text-xl font-semibold leading-relaxed">
                  {currentClueText}
                </p>
              </div>
              <p className="text-yellow-300 text-sm animate-pulse mt-4">
                Get ready to buzz!
              </p>
            </div>
          ) : (
            <PlayerWaiting message="Reading clue... get ready to buzz!" player={currentPlayer} />
          )
        )}

        {/* Buzzer open - show clue + timer + buzzer */}
        {phase === "buzzer_open" && (
          <div className="flex flex-col min-h-[60vh]">
            {/* Clue text + timer at top */}
            {currentClueText && (
              <div className="px-6 pt-4 pb-2 text-center">
                {currentCategoryTitle && (
                  <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">
                    {currentCategoryTitle} — ${currentClueValue}
                  </p>
                )}
                <p className="text-white text-lg font-semibold leading-relaxed">
                  {currentClueText}
                </p>
                {timerRunning && (
                  <div className="mt-2">
                    <LiveTimer remaining={timerRemaining} running={timerRunning} />
                  </div>
                )}
              </div>
            )}
            {/* Buzzer */}
            <div className="flex-1">
              <PlayerBuzzer buzzerOpen onBuzz={handleBuzz} hasBuzzed={hasBuzzed} />
            </div>
          </div>
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
              onClick={() => {
                // Clean up localStorage for this session
                localStorage.removeItem(`live-player-id-${sessionId}`);
                localStorage.removeItem(`live-player-name-${sessionId}`);
                localStorage.removeItem(`live-player-token-${sessionId}`);
                router.push("/live");
              }}
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
