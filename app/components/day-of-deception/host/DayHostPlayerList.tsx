"use client";

interface DayHostPlayerListProps {
  players: {
    id: string;
    displayName: string;
    avatarColor: string;
    isConnected?: boolean;
    shadowTokens?: number;
  }[];
  showTokens?: boolean;
  compact?: boolean;
}

export default function DayHostPlayerList({
  players,
  showTokens = false,
  compact = false,
}: DayHostPlayerListProps) {
  if (players.length === 0) {
    return (
      <p className="text-white/40 text-sm italic">No players to display.</p>
    );
  }

  // Compact mode: horizontal flex-wrap pills
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-green-900/30"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: player.avatarColor }}
            />
            <span className="text-sm font-medium text-white">
              {player.displayName}
            </span>
            {showTokens && player.shadowTokens !== undefined && (
              <span className="text-white/40 text-xs">
                ({player.shadowTokens})
              </span>
            )}
            {player.isConnected !== undefined && (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  player.isConnected ? "bg-green-500" : "bg-gray-500"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Full mode: vertical list with cards
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div
          key={player.id}
          className="rounded-lg p-3 flex items-center gap-3 bg-white/5 border border-green-900/30"
        >
          {/* Avatar Color Dot */}
          <span
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: player.avatarColor }}
          />

          {/* Name */}
          <span className="text-sm font-medium text-white flex-1 truncate">
            {player.displayName}
          </span>

          {/* Shadow Token Count */}
          {showTokens && player.shadowTokens !== undefined && (
            <div className="flex items-center gap-1.5 shrink-0">
              <svg
                className="w-4 h-4 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="text-white/60 text-sm">
                {player.shadowTokens}
              </span>
            </div>
          )}

          {/* Connection Status */}
          {player.isConnected !== undefined && (
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                player.isConnected ? "bg-green-500" : "bg-gray-500"
              }`}
              title={player.isConnected ? "Connected" : "Disconnected"}
            />
          )}
        </div>
      ))}
    </div>
  );
}
