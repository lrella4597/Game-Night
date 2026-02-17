"use client";

import { useState, useEffect } from "react";
import JoinCode from "@/app/components/live/shared/JoinCode";
import PlayerAvatar from "@/app/components/live/shared/PlayerAvatar";
import ConnectionStatus from "@/app/components/live/shared/ConnectionStatus";
import BoardPicker from "@/app/components/live/host/BoardPicker";
import type { LiveSession, LivePlayer, LiveSessionConfig } from "@/lib/live/types";
import type { BoardState } from "@/app/data/boardData";

interface HostLobbyProps {
  session: LiveSession;
  players: LivePlayer[];
  connected: boolean;
  onStartGame?: (board: BoardState, djBoard?: BoardState) => Promise<void>;
  onPrepBoard?: (board: BoardState, djBoard?: BoardState) => void;
  onUpdateConfig?: (config: Partial<LiveSessionConfig>) => void;
}

export default function HostLobby({ session, players, connected, onStartGame, onPrepBoard, onUpdateConfig }: HostLobbyProps) {
  const [starting, setStarting] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<BoardState | null>(null);
  const [selectedDJBoard, setSelectedDJBoard] = useState<BoardState | null>(null);
  const [enableDJ, setEnableDJ] = useState(session.config.enableDoubleJeopardy);

  // Auto-detect pre-loaded board (e.g. from community "Play Now")
  useEffect(() => {
    if (session.boardData && !selectedBoard) {
      setSelectedBoard(session.boardData);
    }
    if (session.doubleJeopardyBoard && !selectedDJBoard) {
      setSelectedDJBoard(session.doubleJeopardyBoard);
      setEnableDJ(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.boardData, session.doubleJeopardyBoard]);

  function handleToggleDJ() {
    const next = !enableDJ;
    setEnableDJ(next);
    if (!next) setSelectedDJBoard(null);
    onUpdateConfig?.({ enableDoubleJeopardy: next });
  }

  async function handleStart() {
    if (!onStartGame || !selectedBoard) return;
    if (enableDJ && !selectedDJBoard) return;
    setStarting(true);
    try {
      await onStartGame(selectedBoard, enableDJ ? selectedDJBoard ?? undefined : undefined);
    } catch {
      setStarting(false);
    }
  }

  const boardsReady = selectedBoard !== null && (!enableDJ || selectedDJBoard !== null);
  const canStart = players.length >= 1 && boardsReady && onStartGame !== undefined;

  return (
    <div className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Header bar */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-blue-200">Host Lobby</h2>
        <ConnectionStatus connected={connected} />
      </div>

      {/* Join code + QR */}
      <div className="mb-10">
        <JoinCode joinCode={session.joinCode} sessionId={session.id} />
      </div>

      {/* Two-column layout: Players + Board */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Player list */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Players ({players.length}/{session.config.maxPlayers})
          </h3>

          {players.length === 0 ? (
            <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
              <p className="text-blue-300">Waiting for players to join...</p>
              <p className="text-blue-400 text-sm mt-1">Share the code or QR above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-white/10 rounded-xl p-3 flex items-center gap-3 border border-white/5"
                >
                  <PlayerAvatar name={player.displayName} color={player.avatarColor} size="md" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Board selection */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            {enableDJ ? "Round 1 Board" : "Game Board"}{" "}
            {selectedBoard && <span className="text-green-400 text-sm font-normal ml-2">Ready!</span>}
          </h3>

          {selectedBoard ? (
            <div className="bg-white/5 rounded-xl border border-green-500/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-green-400 font-medium">Board loaded</p>
                <button
                  onClick={() => setSelectedBoard(null)}
                  className="text-blue-300 text-sm hover:text-white transition-colors"
                >
                  Change
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedBoard.columns.map((col) => (
                  <span
                    key={col.id}
                    className="px-2 py-1 rounded bg-[#060CE9]/60 text-[#FFD700] text-xs font-medium border border-[#FFD700]/20"
                  >
                    {col.title}
                  </span>
                ))}
              </div>
              <p className="text-blue-400 text-xs mt-2">
                {selectedBoard.columns.length} categories, {selectedBoard.rowValues.length} clues each
              </p>
            </div>
          ) : (
            <BoardPicker onBoardReady={setSelectedBoard} />
          )}

          {/* Double Jeopardy toggle */}
          <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableDJ}
              onChange={handleToggleDJ}
              className="w-5 h-5 rounded accent-[#FFD700]"
            />
            <span className="text-white font-medium text-sm">Enable Double Jeopardy (2nd Round)</span>
          </label>

          {/* Round 2 Board */}
          {enableDJ && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Round 2 Board{" "}
                {selectedDJBoard && <span className="text-green-400 text-sm font-normal ml-2">Ready!</span>}
              </h3>

              {selectedDJBoard ? (
                <div className="bg-white/5 rounded-xl border border-green-500/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-green-400 font-medium">Board loaded</p>
                    <button
                      onClick={() => setSelectedDJBoard(null)}
                      className="text-blue-300 text-sm hover:text-white transition-colors"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDJBoard.columns.map((col) => (
                      <span
                        key={col.id}
                        className="px-2 py-1 rounded bg-[#060CE9]/60 text-[#FFD700] text-xs font-medium border border-[#FFD700]/20"
                      >
                        {col.title}
                      </span>
                    ))}
                  </div>
                  <p className="text-blue-400 text-xs mt-2">
                    {selectedDJBoard.columns.length} categories, {selectedDJBoard.rowValues.length} clues each
                  </p>
                </div>
              ) : (
                <BoardPicker onBoardReady={setSelectedDJBoard} rowValues={[400, 800, 1200, 1600, 2000]} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-3">
        {canStart && (
          <div className="flex gap-3 flex-wrap justify-center">
            {onPrepBoard && (
              <button
                onClick={() => {
                  if (selectedBoard) onPrepBoard(selectedBoard, enableDJ ? selectedDJBoard ?? undefined : undefined);
                }}
                disabled={starting}
                className="px-6 py-3 rounded-xl font-bold text-base bg-white/10 text-white hover:bg-white/20 border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Review &amp; Edit Board{enableDJ ? "s" : ""}
              </button>
            )}
            <button
              onClick={handleStart}
              disabled={starting}
              className="px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              title="Start the game immediately"
            >
              {starting ? "Starting..." : "Start Game"}
            </button>
          </div>
        )}
        {players.length < 1 && (
          <p className="text-blue-400 text-sm">Need at least 1 player to start</p>
        )}
        {players.length >= 1 && !boardsReady && (
          <p className="text-yellow-300/70 text-sm">
            {!selectedBoard
              ? "Generate or load a board to start"
              : enableDJ && !selectedDJBoard
              ? "Generate or load a Round 2 board to start"
              : ""}
          </p>
        )}
      </div>
    </div>
  );
}
