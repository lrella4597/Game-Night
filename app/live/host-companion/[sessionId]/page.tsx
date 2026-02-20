"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRealtimeChannel } from "@/lib/live/useRealtimeChannel";
import { HOST_EVENTS, COMPANION_EVENTS } from "@/lib/live/channelEvents";
import { useLiveTimer } from "@/lib/live/useLiveTimer";
import LiveTimer from "@/app/components/live/shared/LiveTimer";
import type { GamePhase, LivePlayer } from "@/lib/live/types";

export default function HostCompanionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const token = searchParams.get("token") || "";

  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [players, setPlayers] = useState<LivePlayer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [currentClueText, setCurrentClueText] = useState<string>("");
  const [currentCategoryTitle, setCurrentCategoryTitle] = useState<string>("");
  const [currentClueValue, setCurrentClueValue] = useState<number>(0);
  const [currentAnswererName, setCurrentAnswererName] = useState<string>("");
  const [currentRound, setCurrentRound] = useState(1);
  const [ddPlayerName, setDdPlayerName] = useState<string>("");
  const [ddWager, setDdWager] = useState<number | null>(null);
  const [finalAnswer, setFinalAnswer] = useState<string>("");

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const { remaining: timerRemaining, running: timerRunning, startTimer } = useLiveTimer({});

  // Verify token on mount
  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch("/api/live/verify-host-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, token }),
        });
        if (res.ok) {
          setVerified(true);
        } else {
          setError("Invalid or expired companion link. Please scan the QR code again.");
        }
      } catch {
        setError("Failed to verify. Check your connection.");
      }
    }
    if (sessionId && token) {
      verify();
    } else {
      setError("Missing session or token.");
    }
  }, [sessionId, token]);

  const { connected, broadcast, onBroadcast } = useRealtimeChannel({
    sessionId,
    userId: `companion-${sessionId}`,
    userName: "Companion",
    isHost: false,
  });

  // Listen for phase changes
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.PHASE_CHANGE, (payload: unknown) => {
      const data = payload as { phase: GamePhase };
      setPhase(data.phase);
      if (data.phase === "board_select") {
        setCurrentAnswer("");
        setCurrentClueText("");
        setCurrentCategoryTitle("");
        setCurrentClueValue(0);
        setCurrentAnswererName("");
        setDdPlayerName("");
        setDdWager(null);
      }
    });
  }, [onBroadcast]);

  // Listen for clue selections → fetch answer
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.CLUE_SELECT, (payload: unknown) => {
      const data = payload as { catIdx: number; clueIdx: number; value: number; clueText?: string; categoryTitle?: string };
      setCurrentClueText(data.clueText || "");
      setCurrentCategoryTitle(data.categoryTitle || "");
      setCurrentClueValue(data.value);
      setCurrentAnswer("");

      // Fetch answer via secure API
      fetch("/api/live/companion-clue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          token: tokenRef.current,
          catIdx: data.catIdx,
          clueIdx: data.clueIdx,
          round: currentRound,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.answer) setCurrentAnswer(d.answer);
        })
        .catch(() => {});
    });
  }, [onBroadcast, sessionId, currentRound]);

  // Listen for timer
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.TIMER_START, (payload: unknown) => {
      const data = payload as { durationSeconds: number };
      if (data.durationSeconds) startTimer(data.durationSeconds);
    });
  }, [onBroadcast, startTimer]);

  // Listen for player updates
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.PLAYERS_UPDATE, (payload: unknown) => {
      const data = payload as { players: LivePlayer[] };
      if (data.players) setPlayers(data.players);
    });
  }, [onBroadcast]);

  // Listen for score updates
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.SCORE_UPDATE, (payload: unknown) => {
      const data = payload as { playerId: string; newScore: number };
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.playerId ? { ...p, score: data.newScore } : p))
      );
    });
  }, [onBroadcast]);

  // Listen for buzzer → get answerer name
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.BUZZER_OPEN, () => {
      setCurrentAnswererName("");
    });
  }, [onBroadcast]);

  // Listen for Daily Double
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.DAILY_DOUBLE, (payload: unknown) => {
      const data = payload as { playerId: string; playerName: string };
      setDdPlayerName(data.playerName);
      setDdWager(null);
    });
  }, [onBroadcast]);

  // Listen for DD wager (from player)
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast("dd_wager", (payload: unknown) => {
      const data = payload as { wager: number };
      setDdWager(data.wager);
    });
  }, [onBroadcast]);

  // Listen for round transitions
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.ROUND_TRANSITION, (payload: unknown) => {
      const data = payload as { round: number };
      setCurrentRound(data.round);
    });
  }, [onBroadcast]);

  // Listen for state updates (Final Jeopardy data)
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.STATE_UPDATE, (payload: unknown) => {
      const data = payload as Record<string, unknown>;
      if (data.finalCategory) setCurrentCategoryTitle(data.finalCategory as string);
      if (data.finalClue) setCurrentClueText(data.finalClue as string);
    });
  }, [onBroadcast]);

  // Listen for answer result → store answerer
  useEffect(() => {
    if (!onBroadcast) return;
    return onBroadcast(HOST_EVENTS.ANSWER_RESULT, (payload: unknown) => {
      const data = payload as { playerId: string; correct: boolean };
      if (!data.correct) {
        // After incorrect, buzzer reopens — clear answerer
        setCurrentAnswererName("");
      }
    });
  }, [onBroadcast]);

  // Companion sends commands to host
  function sendCompanionCommand(event: string, payload?: unknown) {
    broadcast(event, payload || {});
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <p className="text-red-300 text-xl">{error}</p>
      </div>
    );
  }

  if (!verified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-blue-200 text-xl animate-pulse">Verifying...</p>
      </div>
    );
  }

  // Sorted scores for display
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col min-h-screen bg-[#060CE9] text-white safe-area-inset">
      {/* Connection indicator */}
      <div className={`h-1 ${connected ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />

      {/* Header */}
      <div className="px-4 py-3 bg-black/20 flex items-center justify-between">
        <span className="text-sm font-bold text-[#FFD700]">Host Companion</span>
        <span className="text-xs text-blue-300 capitalize">{phase.replace(/_/g, " ")}</span>
      </div>

      {/* Main content - phone optimized */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-4">

        {/* Lobby / Prep */}
        {(phase === "lobby" || phase === "prep" || phase === "round_intro") && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-blue-200 text-lg text-center">
              {phase === "lobby" ? "Waiting for game to start..." :
               phase === "prep" ? "Host is preparing the board..." :
               "Round starting..."}
            </p>
            {sortedPlayers.length > 0 && (
              <div className="w-full max-w-sm">
                <p className="text-xs text-blue-300 mb-2">{sortedPlayers.length} player{sortedPlayers.length !== 1 ? "s" : ""}</p>
                {sortedPlayers.map((p) => (
                  <div key={p.id} className="flex justify-between py-1 text-sm">
                    <span>{p.displayName}</span>
                    <span className="font-bold">${p.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Board Select */}
        {phase === "board_select" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-blue-200 text-lg text-center">Select a clue on the main screen</p>
            {sortedPlayers.length > 0 && (
              <div className="w-full max-w-sm">
                {sortedPlayers.map((p) => (
                  <div key={p.id} className="flex justify-between py-1 text-sm">
                    <span>{p.displayName}</span>
                    <span className={`font-bold ${p.score >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ${p.score.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clue Display */}
        {phase === "clue_display" && (
          <div className="flex-1 flex flex-col gap-4">
            {/* Clue info */}
            {currentCategoryTitle && (
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider text-center">
                {currentCategoryTitle} — ${currentClueValue}
              </p>
            )}
            {currentClueText && (
              <p className="text-white text-lg font-semibold text-center leading-relaxed">
                {currentClueText}
              </p>
            )}

            {/* Answer (private!) */}
            {currentAnswer && (
              <div className="bg-green-600/20 border border-green-500/40 rounded-xl p-4 mt-2">
                <p className="text-[10px] text-green-300 uppercase tracking-wider mb-1">Answer</p>
                <p className="text-green-400 text-2xl font-bold text-center">{currentAnswer}</p>
              </div>
            )}

            {/* Open Buzzer button */}
            <button
              onClick={() => sendCompanionCommand(COMPANION_EVENTS.OPEN_BUZZER)}
              className="w-full py-4 rounded-xl font-bold text-lg bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg mt-auto"
            >
              Open Buzzer
            </button>
          </div>
        )}

        {/* Buzzer Open */}
        {phase === "buzzer_open" && (
          <div className="flex-1 flex flex-col gap-4">
            {currentAnswer && (
              <div className="bg-green-600/20 border border-green-500/40 rounded-xl p-4">
                <p className="text-[10px] text-green-300 uppercase tracking-wider mb-1">Answer</p>
                <p className="text-green-400 text-2xl font-bold text-center">{currentAnswer}</p>
              </div>
            )}
            {timerRunning && (
              <div className="flex justify-center">
                <LiveTimer remaining={timerRemaining} running={timerRunning} />
              </div>
            )}
            <p className="text-blue-200 text-center text-sm">Waiting for buzz...</p>
            <button
              onClick={() => sendCompanionCommand(COMPANION_EVENTS.SKIP_CLUE)}
              className="w-full py-3 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-all mt-auto"
            >
              Skip / Time&apos;s Up
            </button>
          </div>
        )}

        {/* Answer Check */}
        {phase === "answer_check" && (
          <div className="flex-1 flex flex-col gap-4">
            {currentAnswererName && (
              <p className="text-[#FFD700] text-center font-bold text-lg">{currentAnswererName} buzzed in!</p>
            )}
            {currentAnswer && (
              <div className="bg-green-600/20 border border-green-500/40 rounded-xl p-4">
                <p className="text-[10px] text-green-300 uppercase tracking-wider mb-1">Answer</p>
                <p className="text-green-400 text-2xl font-bold text-center">{currentAnswer}</p>
              </div>
            )}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => sendCompanionCommand(COMPANION_EVENTS.JUDGE_CORRECT)}
                className="flex-1 py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 text-white transition-all"
              >
                Correct
              </button>
              <button
                onClick={() => sendCompanionCommand(COMPANION_EVENTS.JUDGE_INCORRECT)}
                className="flex-1 py-4 rounded-xl font-bold text-lg bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                Incorrect
              </button>
            </div>
          </div>
        )}

        {/* Daily Double - Wager */}
        {phase === "daily_double_wager" && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 text-center">
              <p className="text-yellow-300 text-xl font-bold">Daily Double!</p>
              {ddPlayerName && <p className="text-white text-sm mt-1">{ddPlayerName} is wagering...</p>}
              {ddWager !== null && <p className="text-[#FFD700] text-2xl font-bold mt-2">Wager: ${ddWager.toLocaleString()}</p>}
            </div>
            {currentAnswer && (
              <div className="bg-green-600/20 border border-green-500/40 rounded-xl p-4">
                <p className="text-[10px] text-green-300 uppercase tracking-wider mb-1">Answer</p>
                <p className="text-green-400 text-2xl font-bold text-center">{currentAnswer}</p>
              </div>
            )}
            <button
              onClick={() => sendCompanionCommand(COMPANION_EVENTS.DD_SHOW_CLUE)}
              className="w-full py-4 rounded-xl font-bold text-lg bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg mt-auto"
            >
              Show Clue
            </button>
          </div>
        )}

        {/* Daily Double - Answer */}
        {phase === "daily_double_answer" && (
          <div className="flex-1 flex flex-col gap-4">
            {currentClueText && (
              <p className="text-white text-lg font-semibold text-center">{currentClueText}</p>
            )}
            {currentAnswer && (
              <div className="bg-green-600/20 border border-green-500/40 rounded-xl p-4">
                <p className="text-[10px] text-green-300 uppercase tracking-wider mb-1">Answer</p>
                <p className="text-green-400 text-2xl font-bold text-center">{currentAnswer}</p>
              </div>
            )}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={() => sendCompanionCommand(COMPANION_EVENTS.DD_CORRECT)}
                className="flex-1 py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 text-white transition-all"
              >
                Correct
              </button>
              <button
                onClick={() => sendCompanionCommand(COMPANION_EVENTS.DD_INCORRECT)}
                className="flex-1 py-4 rounded-xl font-bold text-lg bg-red-600 hover:bg-red-500 text-white transition-all"
              >
                Incorrect
              </button>
            </div>
          </div>
        )}

        {/* Final Jeopardy phases */}
        {(phase === "final_category" || phase === "final_wager" || phase === "final_clue" || phase === "final_draw" || phase === "final_locked" || phase === "final_reveal") && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-[#FFD700] text-xl font-bold">Final Jeopardy</p>
            {currentCategoryTitle && (
              <p className="text-blue-200 text-sm">{currentCategoryTitle}</p>
            )}
            {currentClueText && phase !== "final_category" && (
              <p className="text-white text-lg text-center font-semibold">{currentClueText}</p>
            )}
            {finalAnswer && (
              <div className="bg-green-600/20 border border-green-500/40 rounded-xl p-4 w-full">
                <p className="text-[10px] text-green-300 uppercase tracking-wider mb-1">Answer</p>
                <p className="text-green-400 text-2xl font-bold text-center">{finalAnswer}</p>
              </div>
            )}
            <p className="text-blue-300 text-sm text-center capitalize">
              {phase.replace(/_/g, " ")} — use main screen for controls
            </p>
          </div>
        )}

        {/* Game Over */}
        {phase === "game_over" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-[#FFD700] text-3xl font-bold">Game Over!</p>
            {sortedPlayers.length > 0 && (
              <div className="w-full max-w-sm">
                {sortedPlayers.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 text-lg">
                    <span className="text-[#FFD700] font-bold w-6">{idx + 1}.</span>
                    <span className="flex-1">{p.displayName}</span>
                    <span className="font-bold">${p.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
