"use client";

import PlayerAvatar from "@/app/components/live/shared/PlayerAvatar";
import ConnectionStatus from "@/app/components/live/shared/ConnectionStatus";
import type { LiveSession, LivePlayer } from "@/lib/live/types";

interface PlayerLobbyProps {
  session: LiveSession;
  players: LivePlayer[];
  playerId: string;
  playerName: string;
  connected: boolean;
  statusMessage?: string;
}

export default function PlayerLobby({
  session,
  players,
  playerId,
  playerName,
  connected,
  statusMessage,
}: PlayerLobbyProps) {
  const currentPlayer = players.find((p) => p.id === playerId);

  return (
    <div className="flex flex-col items-center min-h-screen py-8 px-4">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <ConnectionStatus connected={connected} />
      </div>

      {/* Player identity */}
      <div className="mb-8 text-center">
        {currentPlayer && (
          <div className="flex flex-col items-center gap-3">
            <PlayerAvatar
              name={currentPlayer.displayName}
              color={currentPlayer.avatarColor}
              size="lg"
              showName={false}
            />
            <h2 className="text-2xl font-bold text-white">
              {currentPlayer.displayName}
            </h2>
          </div>
        )}
      </div>

      {/* Waiting message */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-blue-200">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          {statusMessage || "Waiting for host to start the game..."}
        </div>
      </div>

      {/* Player list */}
      <div className="w-full max-w-md">
        <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider mb-3">
          Players in Lobby ({players.length})
        </h3>
        <div className="flex flex-col gap-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                player.id === playerId
                  ? "bg-[#FFD700]/20 border border-[#FFD700]/30"
                  : "bg-white/5 border border-white/5"
              }`}
            >
              <PlayerAvatar
                name={player.displayName}
                color={player.avatarColor}
                size="sm"
              />
              {player.id === playerId && (
                <span className="text-[#FFD700] text-xs font-medium ml-auto">
                  You
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
