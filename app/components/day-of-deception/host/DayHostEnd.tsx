"use client";

interface DayHostEndProps {
  endgameData: {
    winner: string;
    players: {
      id: string;
      displayName: string;
      role: string;
      shadowTokens: number;
    }[];
  } | null;
}

export default function DayHostEnd({ endgameData }: DayHostEndProps) {
  if (!endgameData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-[#1a1f14]">
        <p className="text-white/40 text-lg">Loading game results...</p>
      </div>
    );
  }

  const traitors = endgameData.players.filter((p) => p.role === "traitor");
  const faithful = endgameData.players.filter((p) => p.role === "faithful");
  const isFaithfulWin = endgameData.winner === "faithful";

  const totalMissions = endgameData.players.reduce(
    (sum, p) => sum + p.shadowTokens,
    0
  );

  return (
    <div className="flex flex-col items-center min-h-screen py-8 px-4 bg-[#1a1f14]">
      {/* Winner Announcement */}
      <div className="flex flex-col items-center gap-6 mb-12 text-center">
        {/* Trophy Icon */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center ${
            isFaithfulWin
              ? "bg-green-600/20 border-2 border-green-500/50"
              : "bg-red-600/20 border-2 border-red-500/50"
          }`}
        >
          <svg
            className={`w-12 h-12 ${
              isFaithfulWin ? "text-green-500" : "text-red-500"
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </div>

        <h1
          className={`text-4xl md:text-5xl font-bold ${
            isFaithfulWin ? "text-green-500" : "text-red-500"
          }`}
        >
          {isFaithfulWin ? "The Loyal Win!" : "The Deceivers Win!"}
        </h1>

        <p className="text-white/60 text-lg max-w-md">
          {isFaithfulWin
            ? "The loyal successfully identified the deceivers among them!"
            : "The deceivers fooled the loyal and claimed victory!"}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-10">
        <div className="bg-white/5 rounded-xl border border-green-900/30 px-5 py-3 text-center">
          <p className="text-green-400 text-2xl font-bold">
            {endgameData.players.length}
          </p>
          <p className="text-white/40 text-xs uppercase tracking-wider">
            Players
          </p>
        </div>
        <div className="bg-white/5 rounded-xl border border-green-900/30 px-5 py-3 text-center">
          <p className="text-green-400 text-2xl font-bold">{traitors.length}</p>
          <p className="text-white/40 text-xs uppercase tracking-wider">
            Deceivers
          </p>
        </div>
        <div className="bg-white/5 rounded-xl border border-green-900/30 px-5 py-3 text-center">
          <p className="text-green-400 text-2xl font-bold">{totalMissions}</p>
          <p className="text-white/40 text-xs uppercase tracking-wider">
            Total Tokens
          </p>
        </div>
      </div>

      {/* Full Role Reveal */}
      <div className="w-full max-w-2xl">
        {/* Deceivers Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Deceivers ({traitors.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {traitors.map((player) => (
              <div
                key={player.id}
                className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-red-900/30"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">
                    {player.displayName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-red-600/30 text-red-400 border border-red-500/50">
                    Deceiver
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
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
              </div>
            ))}
          </div>
        </div>

        {/* Loyal Section */}
        <div>
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Loyal ({faithful.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {faithful.map((player) => (
              <div
                key={player.id}
                className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-green-900/30"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">
                    {player.displayName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-green-600/30 text-green-400 border border-green-500/50">
                    Loyal
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
