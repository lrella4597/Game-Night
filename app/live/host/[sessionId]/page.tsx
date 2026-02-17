"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel } from "@/lib/live/useRealtimeChannel";
import { HOST_EVENTS, PLAYER_EVENTS } from "@/lib/live/channelEvents";
import { useHostControls } from "@/lib/live/useHostControls";
import { useLiveTimer } from "@/lib/live/useLiveTimer";
import HostLobby from "@/app/components/live/host/HostLobby";
import HostScoreboard from "@/app/components/live/host/HostScoreboard";
import HostClueDisplay from "@/app/components/live/host/HostClueDisplay";
import HostBuzzerPhase from "@/app/components/live/host/HostBuzzerPhase";
import HostFinalCategory from "@/app/components/live/host/HostFinalCategory";
import HostFinalWager from "@/app/components/live/host/HostFinalWager";
import HostFinalClue from "@/app/components/live/host/HostFinalClue";
import HostFinalReveal from "@/app/components/live/host/HostFinalReveal";
import HostBoardPrep from "@/app/components/live/host/HostBoardPrep";
import HostRoundIntro from "@/app/components/live/host/HostRoundIntro";
import HostDailyDouble from "@/app/components/live/host/HostDailyDouble";
import LiveSoundControls from "@/app/components/live/host/LiveSoundControls";
import JeopardyBoard from "@/app/components/live/shared/JeopardyBoard";
import { isDailyDouble, generateDailyDoubles } from "@/lib/live/dailyDoubleUtils";
import { useSoundEffects } from "@/lib/audio/useSoundEffects";
import { useThinkMusic } from "@/lib/audio/useThinkMusic";
import type {
  LiveSession,
  LivePlayer,
  LiveSessionRow,
  LivePlayerRow,
  LiveGameState,
  LiveGameStateRow,
  GamePhase,
  BuzzerEntry,
  FinalJeopardyData,
} from "@/lib/live/types";
import {
  sessionFromRow as toSession,
  playerFromRow as toPlayer,
  gameStateFromRow as toGameState,
} from "@/lib/live/types";
import type { BoardState } from "@/app/data/boardData";

export default function HostPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { user, loading: authLoading } = useAuth();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [gameState, setGameState] = useState<LiveGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [finalData, setFinalData] = useState<FinalJeopardyData | null>(null);
  const [finalWagerStatus, setFinalWagerStatus] = useState<Record<string, boolean>>({});
  const [finalDrawStatus, setFinalDrawStatus] = useState<Record<string, boolean>>({});
  const [finalRevealIndex, setFinalRevealIndex] = useState(-1);
  const [generatingFinal, setGeneratingFinal] = useState(false);
  const [showFinalAnswer, setShowFinalAnswer] = useState(false);
  const [prepBoard, setPrepBoard] = useState<BoardState | null>(null);
  const [prepDjBoard, setPrepDjBoard] = useState<BoardState | null>(null);
  const [boardControllerId, setBoardControllerId] = useState<string | null>(null);
  const [ddWager, setDdWager] = useState<number | null>(null);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const { connected, presenceState, broadcast, onBroadcast } = useRealtimeChannel({
    sessionId,
    userId: user?.id || "",
    userName: "Host",
    isHost: true,
  });

  const hostControls = useHostControls({ sessionId, broadcast });
  const { play: playSound } = useSoundEffects();
  const { startThinkMusic, startFinalThinkMusic, startIntroMusic, stop: stopThinkMusic } = useThinkMusic();

  // Ref for playSound so buzz listener doesn't re-subscribe on settings change
  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;

  const phase: GamePhase = gameState?.phase || "lobby";
  const currentRound = gameState?.currentRound ?? 1;
  const board: BoardState | null =
    currentRound === 2
      ? session?.doubleJeopardyBoard || null
      : session?.boardData || null;

  // Timer
  const { remaining: timerRemaining, running: timerRunning, startTimer, clearTimer } = useLiveTimer({
    onExpire: () => {
      if (phase === "buzzer_open") {
        handleSkip();
      } else if (phase === "final_draw") {
        handleLockFinalAnswers();
      }
    },
  });

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchPlayers = useCallback(async () => {
    const { data: playerRows } = await supabase
      .from("live_players")
      .select("*")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });

    if (playerRows) {
      const updated = playerRows.map((r) => toPlayer(r as LivePlayerRow));
      setPlayers(updated);
      broadcast(HOST_EVENTS.PLAYERS_UPDATE, { players: updated });
    }
  }, [sessionId, supabase, broadcast]);

  const fetchGameState = useCallback(async () => {
    const { data: stateRow } = await supabase
      .from("live_game_state")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (stateRow) {
      setGameState(toGameState(stateRow as LiveGameStateRow));
    }
  }, [sessionId, supabase]);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || authLoading || !user) return;

    async function loadAll() {
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

      if (sessionRow.host_id !== user!.id) {
        setError("You are not the host of this session");
        setLoading(false);
        return;
      }

      setSession(toSession(sessionRow as LiveSessionRow));
      await fetchPlayers();
      await fetchGameState();
      setLoading(false);
    }

    loadAll();
  }, [sessionId, user, authLoading, supabase, fetchPlayers, fetchGameState]);

  // ── Real-time player detection ─────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId || loading) return;
    fetchPlayers();
  }, [presenceState, sessionId, loading, fetchPlayers]);

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(PLAYER_EVENTS.PLAYER_READY, () => fetchPlayers());
  }, [onBroadcast, fetchPlayers]);

  useEffect(() => {
    if (!sessionId || loading) return;
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, [sessionId, loading, fetchPlayers]);

  // ── Listen for buzzes ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(PLAYER_EVENTS.BUZZ, (payload: unknown) => {
      const data = payload as BuzzerEntry;
      setGameState((prev) => {
        if (!prev || prev.buzzerLocked) return prev;
        if (prev.buzzerQueue.some((e) => e.playerId === data.playerId)) return prev;
        const newQueue = [...prev.buzzerQueue, data].sort((a, b) => a.timestamp - b.timestamp);

        // Auto-select first buzzer
        if (!prev.currentAnswererId && newQueue.length > 0) {
          const firstBuzzer = newQueue[0];
          playSoundRef.current("buzz-in");
          supabase
            .from("live_game_state")
            .update({
              buzzer_queue: newQueue,
              current_answerer_id: firstBuzzer.playerId,
              phase: "answer_check",
            })
            .eq("session_id", sessionId);

          broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "answer_check" });
          clearTimer();

          return {
            ...prev,
            buzzerQueue: newQueue,
            currentAnswererId: firstBuzzer.playerId,
            phase: "answer_check" as GamePhase,
          };
        }

        return { ...prev, buzzerQueue: newQueue };
      });
    });
  }, [onBroadcast, sessionId, supabase, broadcast, clearTimer]);

  // ── Listen for Final Jeopardy wagers ──────────────────────────────────────
  // Player saves wager to DB via API route. Broadcast is just a status notification.

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(PLAYER_EVENTS.FINAL_WAGER, (payload: unknown) => {
      const data = payload as { playerId: string; wager: number };
      setFinalWagerStatus((prev) => ({ ...prev, [data.playerId]: true }));
    });
  }, [onBroadcast]);

  // ── Listen for Final Jeopardy drawings ──────────────────────────────────
  // Player saves drawing to DB via API route. Broadcast is just a status notification.

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(PLAYER_EVENTS.FINAL_DRAWING, (payload: unknown) => {
      const data = payload as { playerId: string };
      setFinalDrawStatus((prev) => ({ ...prev, [data.playerId]: true }));
    });
  }, [onBroadcast]);

  // ── Listen for Daily Double wagers ────────────────────────────────────────

  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(PLAYER_EVENTS.DD_WAGER, (payload: unknown) => {
      const data = payload as { playerId: string; wager: number };
      setDdWager(data.wager);
    });
  }, [onBroadcast]);

  // ── Board Prep actions ────────────────────────────────────────────────────

  async function handlePrepBoard(boardData: BoardState, djBoard?: BoardState) {
    // Save board to session for persistence
    const updates: Record<string, unknown> = {
      board_data: boardData as unknown as Record<string, unknown>,
    };
    if (djBoard) {
      updates.double_jeopardy_board = djBoard as unknown as Record<string, unknown>;
    }
    await supabase.from("live_sessions").update(updates).eq("id", sessionId);

    await supabase
      .from("live_game_state")
      .update({ phase: "prep", last_action: "prep_started" })
      .eq("session_id", sessionId);

    setPrepBoard(boardData);
    if (djBoard) setPrepDjBoard(djBoard);
    setSession((prev) => (prev ? { ...prev, boardData, ...(djBoard ? { doubleJeopardyBoard: djBoard } : {}) } : prev));
    setGameState((prev) => (prev ? { ...prev, phase: "prep" } : prev));

    broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "prep" });
  }

  async function handleFinalizePrep(finalBoard: BoardState, djBoard?: BoardState) {
    setPrepBoard(null);
    setPrepDjBoard(null);
    await handleStartGame(finalBoard, djBoard);
  }

  async function handleBackToLobby() {
    await supabase
      .from("live_game_state")
      .update({ phase: "lobby", last_action: "back_to_lobby" })
      .eq("session_id", sessionId);

    setPrepBoard(null);
    setPrepDjBoard(null);
    setGameState((prev) => (prev ? { ...prev, phase: "lobby" } : prev));

    broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "lobby" });
  }

  // ── Config update ─────────────────────────────────────────────────────────

  async function handleUpdateConfig(updates: Partial<import("@/lib/live/types").LiveSessionConfig>) {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.enableDoubleJeopardy !== undefined) dbUpdates.enable_double_jeopardy = updates.enableDoubleJeopardy;

    await supabase.from("live_sessions").update(dbUpdates).eq("id", sessionId);

    setSession((prev) =>
      prev ? { ...prev, config: { ...prev.config, ...updates } } : prev
    );
  }

  // ── Game actions ───────────────────────────────────────────────────────────

  async function handleStartGame(boardData: BoardState, djBoard?: BoardState) {
    const numCats = boardData.columns.length;
    const numRows = boardData.rowValues.length;
    const dailyDoubles = generateDailyDoubles(1, numCats, numRows);

    const sessionUpdates: Record<string, unknown> = {
      board_data: boardData as unknown as Record<string, unknown>,
      status: "active",
      started_at: new Date().toISOString(),
    };
    if (djBoard) {
      sessionUpdates.double_jeopardy_board = djBoard as unknown as Record<string, unknown>;
      sessionUpdates.enable_double_jeopardy = true;
    }

    await supabase.from("live_sessions").update(sessionUpdates).eq("id", sessionId);

    await supabase
      .from("live_game_state")
      .update({
        phase: "round_intro",
        current_round: 1,
        daily_doubles: dailyDoubles,
        clues_revealed: [],
        last_action: "game_started",
      })
      .eq("session_id", sessionId);

    setSession((prev) =>
      prev
        ? {
            ...prev,
            boardData,
            status: "active" as const,
            ...(djBoard ? { doubleJeopardyBoard: djBoard, config: { ...prev.config, enableDoubleJeopardy: true } } : {}),
          }
        : prev
    );
    setGameState((prev) =>
      prev
        ? { ...prev, phase: "round_intro" as GamePhase, currentRound: 1, dailyDoubles, cluesRevealed: [] }
        : prev
    );

    broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "round_intro" });
    broadcast(HOST_EVENTS.STATE_UPDATE, { phase: "round_intro", boardData });
    startIntroMusic();
  }

  function handleSelectClue(catIdx: number, clueIdx: number, value: number) {
    if (!gameState) return;
    setShowAnswer(false);
    clearTimer();

    // Check if this clue is a Daily Double
    if (isDailyDouble(catIdx, clueIdx, gameState.dailyDoubles)) {
      // Determine DD player: last correct answerer, or lowest-score player
      let ddPlayerId = boardControllerId;
      if (!ddPlayerId) {
        const sorted = [...players].sort((a, b) => a.score - b.score);
        ddPlayerId = sorted[0]?.id || null;
      }
      if (!ddPlayerId) return;

      const ddPlayer = players.find((p) => p.id === ddPlayerId);
      setDdWager(null);
      playSound("daily-double");

      hostControls.selectDailyDouble(
        catIdx, clueIdx, value, gameState.cluesRevealed,
        ddPlayerId, ddPlayer?.displayName || "Player"
      );
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              phase: "daily_double_wager" as GamePhase,
              currentCategoryIndex: catIdx,
              currentClueIndex: clueIdx,
              currentClueValue: value,
              cluesRevealed: [...prev.cluesRevealed, `${catIdx}-${clueIdx}`],
              currentAnswererId: ddPlayerId,
              buzzerQueue: [],
              buzzerLocked: true,
            }
          : prev
      );
      return;
    }

    // Normal clue selection
    playSound("clue-select");
    hostControls.selectClue(catIdx, clueIdx, value, gameState.cluesRevealed);
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            phase: "clue_display" as GamePhase,
            currentCategoryIndex: catIdx,
            currentClueIndex: clueIdx,
            currentClueValue: value,
            cluesRevealed: [...prev.cluesRevealed, `${catIdx}-${clueIdx}`],
            buzzerQueue: [],
            currentAnswererId: null,
            buzzerLocked: true,
          }
        : prev
    );
  }

  function handleOpenBuzzer() {
    hostControls.openBuzzer();
    const timerDuration = session?.config.clueTimerSeconds || 30;
    startTimer(timerDuration);
    playSound("buzzer-open");
    startThinkMusic(timerDuration);
    setGameState((prev) =>
      prev ? { ...prev, phase: "buzzer_open" as GamePhase, buzzerLocked: false, buzzerQueue: [] } : prev
    );
  }

  function handleCorrect() {
    if (!gameState?.currentAnswererId || !gameState.currentClueValue) return;
    clearTimer();
    stopThinkMusic();
    playSound("correct");
    setBoardControllerId(gameState.currentAnswererId);
    hostControls.judgeAnswer(gameState.currentAnswererId, true, gameState.currentClueValue);
    fetchPlayers();
    setGameState((prev) =>
      prev ? { ...prev, phase: "board_select" as GamePhase, currentAnswererId: null, buzzerLocked: true } : prev
    );
  }

  function handleIncorrect() {
    if (!gameState?.currentAnswererId || !gameState.currentClueValue) return;
    playSound("incorrect");
    hostControls.judgeAnswer(gameState.currentAnswererId, false, gameState.currentClueValue);
    fetchPlayers();
    setGameState((prev) =>
      prev ? { ...prev, phase: "buzzer_open" as GamePhase, currentAnswererId: null } : prev
    );
  }

  function handleSkip() {
    clearTimer();
    stopThinkMusic();
    playSound("times-up");
    hostControls.skipClue();
    setGameState((prev) =>
      prev ? { ...prev, phase: "board_select" as GamePhase, currentAnswererId: null, buzzerLocked: true } : prev
    );
  }

  function handleSelectAnswerer(playerId: string) {
    clearTimer();
    setGameState((prev) =>
      prev ? { ...prev, currentAnswererId: playerId, phase: "answer_check" as GamePhase } : prev
    );
    supabase
      .from("live_game_state")
      .update({ current_answerer_id: playerId, phase: "answer_check" })
      .eq("session_id", sessionId);
    broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "answer_check" });
  }

  // ── Daily Double actions ──────────────────────────────────────────────────

  function handleDdShowClue() {
    hostControls.changePhase("daily_double_answer");
    setGameState((prev) => (prev ? { ...prev, phase: "daily_double_answer" as GamePhase } : prev));
  }

  function handleDdCorrect() {
    if (!gameState?.currentAnswererId || ddWager === null) return;
    playSound("correct");
    setBoardControllerId(gameState.currentAnswererId);
    hostControls.judgeDailyDouble(gameState.currentAnswererId, true, ddWager);
    fetchPlayers();
    setDdWager(null);
    setGameState((prev) =>
      prev ? { ...prev, phase: "board_select" as GamePhase, currentAnswererId: null, buzzerLocked: true } : prev
    );
  }

  function handleDdIncorrect() {
    if (!gameState?.currentAnswererId || ddWager === null) return;
    playSound("incorrect");
    hostControls.judgeDailyDouble(gameState.currentAnswererId, false, ddWager);
    fetchPlayers();
    setDdWager(null);
    setGameState((prev) =>
      prev ? { ...prev, phase: "board_select" as GamePhase, currentAnswererId: null, buzzerLocked: true } : prev
    );
  }

  // ── Round transition ────────────────────────────────────────────────────

  function handleTransitionToRound2() {
    const djBoard = session?.doubleJeopardyBoard;
    if (!djBoard) return;

    const dailyDoubles = generateDailyDoubles(2, djBoard.columns.length, djBoard.rowValues.length);

    // Persist new DDs
    supabase
      .from("live_game_state")
      .update({ daily_doubles: dailyDoubles })
      .eq("session_id", sessionId);

    hostControls.transitionToRound2();
    startIntroMusic();
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            phase: "round_intro" as GamePhase,
            currentRound: 2,
            cluesRevealed: [],
            dailyDoubles,
            currentCategoryIndex: null,
            currentClueIndex: null,
            currentClueValue: null,
          }
        : prev
    );
    setBoardControllerId(null);
  }

  function handleRoundIntroProceed() {
    hostControls.goToBoard();
    setGameState((prev) => (prev ? { ...prev, phase: "board_select" as GamePhase } : prev));
  }

  // ── Final Jeopardy actions ─────────────────────────────────────────────────

  async function handleStartFinalJeopardy() {
    setGeneratingFinal(true);
    try {
      const res = await fetch("/api/live/generate-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Failed to generate Final Jeopardy");
      const data = await res.json();
      setFinalData({ category: data.category, clue: data.clue, answer: data.answer });
      setSession((prev) =>
        prev
          ? { ...prev, finalJeopardy: { category: data.category, clue: data.clue, answer: data.answer } }
          : prev
      );

      // Move to final_category phase
      await hostControls.startFinalJeopardy();
      setGameState((prev) => (prev ? { ...prev, phase: "final_category" } : prev));
      playSound("final-category");
    } catch (err) {
      console.error("Final Jeopardy generation error:", err);
    } finally {
      setGeneratingFinal(false);
    }
  }

  async function handleFinalWagerPhase() {
    setFinalWagerStatus({});
    await hostControls.startFinalWager();
    setGameState((prev) => (prev ? { ...prev, phase: "final_wager" } : prev));
    // Broadcast category data to players
    broadcast(HOST_EVENTS.STATE_UPDATE, { finalCategory: finalData?.category });
  }

  async function handleShowFinalClue() {
    await hostControls.showFinalClue();
    setGameState((prev) => (prev ? { ...prev, phase: "final_clue" } : prev));
    // Broadcast clue to players
    broadcast(HOST_EVENTS.STATE_UPDATE, { finalClue: finalData?.clue, finalCategory: finalData?.category });
  }

  async function handleStartFinalDraw() {
    setFinalDrawStatus({});
    await hostControls.startFinalDraw();
    setGameState((prev) => (prev ? { ...prev, phase: "final_draw" } : prev));
    const finalDuration = session?.config.finalTimerSeconds || 30;
    startTimer(finalDuration);
    startFinalThinkMusic(finalDuration);
    // Broadcast clue again in case players need it
    broadcast(HOST_EVENTS.STATE_UPDATE, { finalClue: finalData?.clue, finalCategory: finalData?.category });
  }

  async function handleLockFinalAnswers() {
    clearTimer();
    stopThinkMusic();
    playSound("times-up");
    await hostControls.lockFinalAnswers();
    setGameState((prev) => (prev ? { ...prev, phase: "final_locked" } : prev));
    // Refresh players to get latest drawings/wagers from DB
    await fetchPlayers();
  }

  async function handleStartFinalReveal() {
    // Sort players by score ascending (lowest revealed first for drama)
    const sorted = [...players].sort((a, b) => a.score - b.score);
    const order = sorted.map((p) => p.id);
    setFinalRevealIndex(-1);
    playSound("final-reveal");
    await hostControls.startFinalReveal(order);
    setGameState((prev) =>
      prev ? { ...prev, phase: "final_reveal", finalRevealOrder: order, finalRevealIndex: -1 } : prev
    );
  }

  async function handleRevealNext() {
    playSound("final-reveal");
    const newIndex = await hostControls.revealNextPlayer(finalRevealIndex);
    setFinalRevealIndex(newIndex);
    // Refresh players to get updated scores
    await fetchPlayers();
  }

  async function handleJudgeFinal(playerId: string, correct: boolean) {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    playSound(correct ? "correct" : "incorrect");
    await hostControls.judgeFinalAnswer(playerId, correct, player.finalWager || 0);
    // Refresh to get updated scores
    await fetchPlayers();
  }

  async function handleEndGame() {
    await hostControls.endGame();
    setGameState((prev) => (prev ? { ...prev, phase: "game_over" } : prev));
    playSound("game-over");
    // Final refresh
    await fetchPlayers();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl text-blue-200 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-xl text-red-300">{error}</p>
        <button
          onClick={() => router.push("/live")}
          className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          Back to Live Mode
        </button>
      </div>
    );
  }

  if (!session) return null;

  // ── Lobby phase ────────────────────────────────────────────────────────────

  if (phase === "lobby") {
    return (
      <HostLobby
        session={session}
        players={players}
        connected={connected}
        onStartGame={handleStartGame}
        onPrepBoard={handlePrepBoard}
        onUpdateConfig={handleUpdateConfig}
      />
    );
  }

  // ── Prep phase ──────────────────────────────────────────────────────────

  if (phase === "prep" && (prepBoard || session.boardData)) {
    return (
      <HostBoardPrep
        board={prepBoard || session.boardData!}
        djBoard={session.config.enableDoubleJeopardy ? (prepDjBoard || session.doubleJeopardyBoard || undefined) : undefined}
        playerCount={players.length}
        onFinalize={handleFinalizePrep}
        onBack={handleBackToLobby}
      />
    );
  }

  // ── Game phases ────────────────────────────────────────────────────────────

  const currentQuestion =
    board && gameState?.currentCategoryIndex != null && gameState?.currentClueIndex != null
      ? board.columns[gameState.currentCategoryIndex]?.questions[gameState.currentClueIndex]
      : null;

  const currentCategory =
    board && gameState?.currentCategoryIndex != null
      ? board.columns[gameState.currentCategoryIndex]
      : null;

  return (
    <div className="flex flex-col min-h-screen">
      <LiveSoundControls />
      <div className="flex-1">
        {/* Round intro */}
        {phase === "round_intro" && (
          <HostRoundIntro round={currentRound} onProceed={handleRoundIntroProceed} />
        )}

        {/* Board select */}
        {phase === "board_select" && board && (
          <div className="flex flex-col items-center py-8 px-4">
            <div className="flex items-center gap-4 mb-6 flex-wrap justify-center">
              <h2 className="text-2xl font-bold text-[#FFD700]">
                {currentRound === 2 ? "Double Jeopardy!" : "Select a Clue"}
              </h2>

              {session.config.enableDoubleJeopardy && currentRound === 1 && session.doubleJeopardyBoard && (
                <button
                  onClick={handleTransitionToRound2}
                  className="px-4 py-2 rounded-lg font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-all"
                >
                  Go to Double Jeopardy
                </button>
              )}

              <button
                onClick={handleStartFinalJeopardy}
                disabled={generatingFinal}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-all"
              >
                {generatingFinal ? "Generating..." : "Final Jeopardy!"}
              </button>
            </div>
            <JeopardyBoard
              board={board}
              cluesRevealed={gameState?.cluesRevealed || []}
              onSelectClue={handleSelectClue}
              interactive
            />
          </div>
        )}

        {/* Daily Double */}
        {(phase === "daily_double_wager" || phase === "daily_double_answer") && currentQuestion && currentCategory && gameState?.currentAnswererId && (
          <HostDailyDouble
            player={players.find((p) => p.id === gameState.currentAnswererId) || players[0]}
            categoryTitle={currentCategory.title}
            clueText={currentQuestion.question}
            clueValue={currentQuestion.value}
            answer={currentQuestion.answer}
            wager={ddWager}
            phase={phase as "daily_double_wager" | "daily_double_answer"}
            onShowClue={handleDdShowClue}
            onCorrect={handleDdCorrect}
            onIncorrect={handleDdIncorrect}
          />
        )}

        {/* Clue display */}
        {phase === "clue_display" && currentQuestion && currentCategory && (
          <HostClueDisplay
            categoryTitle={currentCategory.title}
            clueText={currentQuestion.question}
            clueValue={currentQuestion.value}
            answer={currentQuestion.answer}
            timerRemaining={timerRemaining}
            timerRunning={timerRunning}
            showAnswer={showAnswer}
            onOpenBuzzer={handleOpenBuzzer}
            onShowAnswer={() => setShowAnswer(true)}
            onSkip={handleSkip}
          />
        )}

        {/* Buzzer open */}
        {phase === "buzzer_open" && (
          <HostBuzzerPhase
            players={players}
            buzzerQueue={gameState?.buzzerQueue || []}
            currentAnswererId={null}
            clueValue={gameState?.currentClueValue || 0}
            onSelectAnswerer={handleSelectAnswerer}
            onCorrect={handleCorrect}
            onIncorrect={handleIncorrect}
            onSkip={handleSkip}
          />
        )}

        {/* Answer check */}
        {phase === "answer_check" && (
          <HostBuzzerPhase
            players={players}
            buzzerQueue={gameState?.buzzerQueue || []}
            currentAnswererId={gameState?.currentAnswererId || null}
            clueValue={gameState?.currentClueValue || 0}
            onSelectAnswerer={handleSelectAnswerer}
            onCorrect={handleCorrect}
            onIncorrect={handleIncorrect}
            onSkip={handleSkip}
          />
        )}

        {/* Final Jeopardy - Category reveal */}
        {phase === "final_category" && finalData && (
          <HostFinalCategory
            category={finalData.category}
            onProceedToWager={handleFinalWagerPhase}
          />
        )}

        {/* Final Jeopardy - Wager phase */}
        {phase === "final_wager" && (
          <HostFinalWager
            players={players}
            wagerStatus={finalWagerStatus}
            onShowClue={handleShowFinalClue}
          />
        )}

        {/* Final Jeopardy - Clue display */}
        {phase === "final_clue" && finalData && (
          <HostFinalClue
            category={finalData.category}
            clue={finalData.clue}
            answer={finalData.answer}
            timerRemaining={timerRemaining}
            timerRunning={timerRunning}
            showAnswer={showFinalAnswer}
            onStartDrawing={handleStartFinalDraw}
            onShowAnswer={() => setShowFinalAnswer(true)}
          />
        )}

        {/* Final Jeopardy - Drawing in progress */}
        {phase === "final_draw" && finalData && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
            <h2 className="text-3xl font-bold text-[#FFD700]">Players Are Drawing...</h2>
            <p className="text-blue-200">
              {Object.values(finalDrawStatus).filter(Boolean).length}/{players.length} submitted
            </p>
            {timerRunning && (
              <div className="mt-2">
                <div className="text-4xl font-bold tabular-nums text-white">{timerRemaining}s</div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl w-full">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    finalDrawStatus[p.id]
                      ? "bg-green-500/10 border-green-500/40"
                      : "bg-white/5 border-white/10 animate-pulse"
                  }`}
                >
                  <span className="text-white text-sm">{p.displayName}</span>
                  <span className={`text-xs ml-auto ${finalDrawStatus[p.id] ? "text-green-400" : "text-yellow-300/70"}`}>
                    {finalDrawStatus[p.id] ? "Done" : "Drawing..."}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={handleLockFinalAnswers}
              className="px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
            >
              {Object.values(finalDrawStatus).filter(Boolean).length === players.length
                ? "Lock & Reveal"
                : "Lock Answers Now"}
            </button>
          </div>
        )}

        {/* Final Jeopardy - Locked, ready to reveal */}
        {phase === "final_locked" && finalData && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
            <h2 className="text-3xl font-bold text-[#FFD700]">Answers Locked!</h2>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 max-w-2xl w-full text-center">
              <p className="text-sm text-green-300 uppercase tracking-wider mb-2">Correct Response</p>
              <p className="text-2xl text-green-400 font-bold">{finalData.answer}</p>
            </div>
            <button
              onClick={handleStartFinalReveal}
              className="px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
            >
              Begin Reveal
            </button>
          </div>
        )}

        {/* Final Jeopardy - Reveal one by one */}
        {phase === "final_reveal" && finalData && (
          <HostFinalReveal
            players={players}
            revealOrder={gameState?.finalRevealOrder || []}
            revealIndex={finalRevealIndex}
            answer={finalData.answer}
            onRevealNext={handleRevealNext}
            onJudge={handleJudgeFinal}
            onEndGame={handleEndGame}
          />
        )}

        {/* Game over */}
        {phase === "game_over" && (
          <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
            <h2 className="text-5xl font-bold text-[#FFD700]">Game Over!</h2>
            <div className="flex flex-col gap-3 mt-4">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-4 text-white text-xl">
                    <span className="text-[#FFD700] font-bold w-8">{idx + 1}.</span>
                    <span>{p.displayName}</span>
                    <span className="ml-auto font-bold">${p.score.toLocaleString()}</span>
                  </div>
                ))}
            </div>
            <button
              onClick={() => router.push("/live")}
              className="mt-8 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              Back to Live Mode
            </button>
          </div>
        )}
      </div>

      {/* Scoreboard (visible during regular gameplay, hidden during final reveal and game over) */}
      {!["game_over", "final_reveal", "final_locked"].includes(phase) && (
        <HostScoreboard players={players} currentAnswererId={gameState?.currentAnswererId} />
      )}
    </div>
  );
}
