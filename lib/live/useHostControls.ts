"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { HOST_EVENTS } from "./channelEvents";
import type { GamePhase, LiveGameState, LivePlayer } from "./types";

interface UseHostControlsOptions {
  sessionId: string;
  broadcast: (event: string, payload: unknown) => void;
}

export function useHostControls({ sessionId, broadcast }: UseHostControlsOptions) {
  const supabase = createClient();

  const updateGameState = useCallback(
    async (updates: Partial<LiveGameState>) => {
      // Convert camelCase to snake_case for DB
      const dbUpdates: Record<string, unknown> = {};
      if (updates.phase !== undefined) dbUpdates.phase = updates.phase;
      if (updates.currentRound !== undefined) dbUpdates.current_round = updates.currentRound;
      if (updates.currentCategoryIndex !== undefined) dbUpdates.current_category_index = updates.currentCategoryIndex;
      if (updates.currentClueIndex !== undefined) dbUpdates.current_clue_index = updates.currentClueIndex;
      if (updates.currentClueValue !== undefined) dbUpdates.current_clue_value = updates.currentClueValue;
      if (updates.cluesRevealed !== undefined) dbUpdates.clues_revealed = updates.cluesRevealed;
      if (updates.buzzerQueue !== undefined) dbUpdates.buzzer_queue = updates.buzzerQueue;
      if (updates.currentAnswererId !== undefined) dbUpdates.current_answerer_id = updates.currentAnswererId;
      if (updates.buzzerLocked !== undefined) dbUpdates.buzzer_locked = updates.buzzerLocked;
      if (updates.dailyDoubles !== undefined) dbUpdates.daily_doubles = updates.dailyDoubles;
      if (updates.lastAction !== undefined) dbUpdates.last_action = updates.lastAction;
      if (updates.finalRevealOrder !== undefined) dbUpdates.final_reveal_order = updates.finalRevealOrder;
      if (updates.finalRevealIndex !== undefined) dbUpdates.final_reveal_index = updates.finalRevealIndex;

      await supabase
        .from("live_game_state")
        .update(dbUpdates)
        .eq("session_id", sessionId);

      broadcast(HOST_EVENTS.STATE_UPDATE, updates);
    },
    [sessionId, supabase, broadcast]
  );

  const changePhase = useCallback(
    async (phase: GamePhase, data?: Record<string, unknown>) => {
      await updateGameState({ phase, lastAction: `phase:${phase}` });
      broadcast(HOST_EVENTS.PHASE_CHANGE, { phase, data });
    },
    [updateGameState, broadcast]
  );

  const selectClue = useCallback(
    async (catIdx: number, clueIdx: number, value: number, cluesRevealed: string[]) => {
      const clueKey = `${catIdx}-${clueIdx}`;
      const newRevealed = [...cluesRevealed, clueKey];

      await updateGameState({
        phase: "clue_display",
        currentCategoryIndex: catIdx,
        currentClueIndex: clueIdx,
        currentClueValue: value,
        cluesRevealed: newRevealed,
        buzzerQueue: [],
        currentAnswererId: null,
        buzzerLocked: true,
        lastAction: `clue:${catIdx}-${clueIdx}`,
      });

      broadcast(HOST_EVENTS.CLUE_SELECT, { catIdx, clueIdx, value });
      broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "clue_display" });
    },
    [updateGameState, broadcast]
  );

  const openBuzzer = useCallback(async () => {
    await updateGameState({
      phase: "buzzer_open",
      buzzerLocked: false,
      buzzerQueue: [],
    });
    broadcast(HOST_EVENTS.BUZZER_OPEN, {});
    broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "buzzer_open" });
  }, [updateGameState, broadcast]);

  const lockBuzzer = useCallback(async () => {
    await updateGameState({ buzzerLocked: true });
    broadcast(HOST_EVENTS.BUZZER_LOCK, {});
  }, [updateGameState, broadcast]);

  const judgeAnswer = useCallback(
    async (playerId: string, correct: boolean, value: number) => {
      const delta = correct ? value : -value;

      // Update player score in DB
      const { data: player } = await supabase
        .from("live_players")
        .select("score, correct_count, incorrect_count")
        .eq("id", playerId)
        .single();

      if (player) {
        const newScore = player.score + delta;
        await supabase
          .from("live_players")
          .update({
            score: newScore,
            correct_count: correct ? player.correct_count + 1 : player.correct_count,
            incorrect_count: correct ? player.incorrect_count : player.incorrect_count + 1,
          })
          .eq("id", playerId);

        broadcast(HOST_EVENTS.SCORE_UPDATE, { playerId, newScore, delta });
        broadcast(HOST_EVENTS.ANSWER_RESULT, { playerId, correct, delta });
      }

      if (correct) {
        // Correct answer → back to board
        await updateGameState({
          phase: "board_select",
          currentAnswererId: null,
          buzzerLocked: true,
          lastAction: `correct:${playerId}`,
        });
        broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "board_select" });
      } else {
        // Wrong answer → buzzer stays open for others (or back to board if no one left)
        await updateGameState({
          phase: "buzzer_open",
          currentAnswererId: null,
          lastAction: `incorrect:${playerId}`,
        });
        broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "buzzer_open" });
      }
    },
    [supabase, updateGameState, broadcast]
  );

  const skipClue = useCallback(async () => {
    await updateGameState({
      phase: "board_select",
      currentAnswererId: null,
      buzzerLocked: true,
      lastAction: "skip_clue",
    });
    broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "board_select" });
  }, [updateGameState, broadcast]);

  const startGame = useCallback(async () => {
    // Update session status
    await supabase
      .from("live_sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", sessionId);

    await changePhase("round_intro");
  }, [sessionId, supabase, changePhase]);

  const goToBoard = useCallback(async () => {
    await changePhase("board_select");
  }, [changePhase]);

  const endGame = useCallback(async () => {
    await supabase
      .from("live_sessions")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", sessionId);

    await changePhase("game_over");
    broadcast(HOST_EVENTS.GAME_OVER, {});
  }, [sessionId, supabase, changePhase, broadcast]);

  // ── Final Jeopardy controls ──────────────────────────────────────────────

  const startFinalJeopardy = useCallback(async () => {
    await changePhase("final_category");
  }, [changePhase]);

  const startFinalWager = useCallback(async () => {
    await changePhase("final_wager");
  }, [changePhase]);

  const showFinalClue = useCallback(async () => {
    await changePhase("final_clue");
  }, [changePhase]);

  const startFinalDraw = useCallback(async () => {
    await changePhase("final_draw");
  }, [changePhase]);

  const lockFinalAnswers = useCallback(async () => {
    await changePhase("final_locked");
  }, [changePhase]);

  const startFinalReveal = useCallback(
    async (playerIds: string[]) => {
      await supabase
        .from("live_game_state")
        .update({
          final_reveal_order: playerIds,
          final_reveal_index: -1,
          phase: "final_reveal",
        })
        .eq("session_id", sessionId);

      await updateGameState({
        finalRevealOrder: playerIds,
        finalRevealIndex: -1,
        phase: "final_reveal",
      });

      broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "final_reveal" });
    },
    [sessionId, supabase, updateGameState, broadcast]
  );

  const revealNextPlayer = useCallback(
    async (currentIndex: number) => {
      const nextIndex = currentIndex + 1;
      await supabase
        .from("live_game_state")
        .update({ final_reveal_index: nextIndex })
        .eq("session_id", sessionId);

      broadcast(HOST_EVENTS.FINAL_REVEAL_NEXT, { revealIndex: nextIndex });
      return nextIndex;
    },
    [sessionId, supabase, broadcast]
  );

  const judgeFinalAnswer = useCallback(
    async (playerId: string, correct: boolean, wager: number) => {
      const delta = correct ? wager : -wager;

      const { data: player } = await supabase
        .from("live_players")
        .select("score")
        .eq("id", playerId)
        .single();

      if (player) {
        const newScore = player.score + delta;
        await supabase
          .from("live_players")
          .update({
            score: newScore,
            final_correct: correct,
          })
          .eq("id", playerId);

        broadcast(HOST_EVENTS.SCORE_UPDATE, { playerId, newScore, delta });
      }
    },
    [supabase, broadcast]
  );

  // ── Daily Double controls ─────────────────────────────────────────────────

  const selectDailyDouble = useCallback(
    async (
      catIdx: number,
      clueIdx: number,
      value: number,
      cluesRevealed: string[],
      ddPlayerId: string,
      playerName: string
    ) => {
      const clueKey = `${catIdx}-${clueIdx}`;
      const newRevealed = [...cluesRevealed, clueKey];

      await updateGameState({
        phase: "daily_double_wager",
        currentCategoryIndex: catIdx,
        currentClueIndex: clueIdx,
        currentClueValue: value,
        cluesRevealed: newRevealed,
        currentAnswererId: ddPlayerId,
        buzzerQueue: [],
        buzzerLocked: true,
        lastAction: `daily_double:${catIdx}-${clueIdx}`,
      });

      broadcast(HOST_EVENTS.CLUE_SELECT, { catIdx, clueIdx, value });
      broadcast(HOST_EVENTS.DAILY_DOUBLE, { playerId: ddPlayerId, playerName, catIdx, clueIdx });
      broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "daily_double_wager" });
    },
    [updateGameState, broadcast]
  );

  const judgeDailyDouble = useCallback(
    async (playerId: string, correct: boolean, wager: number) => {
      const delta = correct ? wager : -wager;

      const { data: player } = await supabase
        .from("live_players")
        .select("score, correct_count, incorrect_count")
        .eq("id", playerId)
        .single();

      if (player) {
        const newScore = player.score + delta;
        await supabase
          .from("live_players")
          .update({
            score: newScore,
            correct_count: correct ? player.correct_count + 1 : player.correct_count,
            incorrect_count: correct ? player.incorrect_count : player.incorrect_count + 1,
          })
          .eq("id", playerId);

        broadcast(HOST_EVENTS.SCORE_UPDATE, { playerId, newScore, delta });
        broadcast(HOST_EVENTS.ANSWER_RESULT, { playerId, correct, delta });
      }

      await updateGameState({
        phase: "board_select",
        currentAnswererId: null,
        buzzerLocked: true,
        lastAction: `dd_${correct ? "correct" : "incorrect"}:${playerId}`,
      });
      broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "board_select" });
    },
    [supabase, updateGameState, broadcast]
  );

  const transitionToRound2 = useCallback(async () => {
    await updateGameState({
      phase: "round_intro",
      currentRound: 2,
      cluesRevealed: [],
      currentCategoryIndex: null,
      currentClueIndex: null,
      currentClueValue: null,
      buzzerQueue: [],
      currentAnswererId: null,
      buzzerLocked: true,
      lastAction: "round_transition:2",
    });

    broadcast(HOST_EVENTS.ROUND_TRANSITION, { round: 2 });
    broadcast(HOST_EVENTS.PHASE_CHANGE, { phase: "round_intro" });
  }, [updateGameState, broadcast]);

  return {
    startGame,
    goToBoard,
    selectClue,
    openBuzzer,
    lockBuzzer,
    judgeAnswer,
    skipClue,
    changePhase,
    endGame,
    updateGameState,
    startFinalJeopardy,
    startFinalWager,
    showFinalClue,
    startFinalDraw,
    lockFinalAnswers,
    startFinalReveal,
    revealNextPlayer,
    judgeFinalAnswer,
    selectDailyDouble,
    judgeDailyDouble,
    transitionToRound2,
  };
}
