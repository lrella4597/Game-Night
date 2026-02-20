"use client";

import { useState } from "react";
import { useTeams, type Team } from "@/lib/data/useTeams";
import { usePlayerStats, type PlayerStats } from "@/lib/data/usePlayerStats";
import PlayerDetailView from "./PlayerDetailView";
import LoadingSpinner from "./LoadingSpinner";
import OverallStatsOverview from "./charts/OverallStatsOverview";

export default function PlayerStatsTab() {
  const { teams, loading: teamsLoading, saveTeams } = useTeams();
  const { playerStats, loading: statsLoading, clearAllStats } = usePlayerStats();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // If a player is selected, show their detail view
  if (selectedPlayer) {
    return (
      <PlayerDetailView
        playerStat={selectedPlayer}
        onBack={() => setSelectedPlayer(null)}
      />
    );
  }

  // Show loading state while data is loading
  if (teamsLoading || statsLoading) {
    return <LoadingSpinner message="Loading stats..." />;
  }

  // Calculate team stats
  const teamStats = teams.map((team) => {
    const powerUpsUsed = Object.values(team.powerUps).filter(Boolean).length;
    const powerUpsRemaining = 3 - powerUpsUsed;

    return {
      ...team,
      powerUpsUsed,
      powerUpsRemaining,
    };
  });

  // Sort by score (highest first)
  const sortedTeams = [...teamStats].sort((a, b) => b.score - a.score);

  // Sort players by total points
  const sortedPlayers = [...playerStats].sort((a, b) => b.totalPoints - a.totalPoints);

  if (teams.length === 0) {
    return (
      <div className="w-full max-w-4xl">
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm">
            No teams yet. Add teams in the Setup tab to see stats.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Player Stats
          </h2>
          <p className="text-slate-600 text-sm mt-0.5">
            Leaderboard and team statistics
          </p>
        </div>
        {(playerStats.length > 0 || teams.some(t => t.score !== 0)) && (
          <div className="relative">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all"
              >
                Reset All Stats
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-xs text-red-700">Reset all scores &amp; stats?</span>
                <button
                  onClick={async () => {
                    await clearAllStats();
                    // Reset all team scores and power-ups
                    const resetTeams = teams.map(t => ({
                      ...t,
                      score: 0,
                      powerUps: { doubleDown: false, doubleDip: false, phoneAFriend: false },
                    }));
                    await saveTeams(resetTeams);
                    setShowResetConfirm(false);
                  }}
                  className="px-2 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-all"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded transition-all"
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overall Stats Overview */}
      {playerStats.length > 0 && (
        <>
          <div className="pt-2">
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              Game Overview
            </h3>
            <p className="text-slate-600 text-sm mt-0.5">
              Overall game statistics and trends
            </p>
          </div>
          <OverallStatsOverview playerStats={playerStats} teams={teams} />
        </>
      )}

      {/* Leaderboards Section */}
      <div className="pt-4">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900">
          Leaderboards
        </h3>
        <p className="text-slate-600 text-sm mt-0.5">
          Current standings and rankings
        </p>
      </div>

      {/* Team Leaderboard */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-sm tracking-tight text-slate-900">
            Team Leaderboard
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {sortedTeams.map((team, index) => (
            <div
              key={team.id}
              className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                {index + 1}
              </div>

              {/* Color indicator */}
              <div
                className="w-4 h-4 rounded-full border-2 border-slate-200"
                style={{ backgroundColor: team.color }}
              />

              {/* Team name and players */}
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{team.name}</div>
                {team.players.length > 0 && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    {team.players.join(", ")}
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  {team.score > 0 ? "+" : ""}
                  {team.score}
                </div>
                <div className="text-xs text-slate-500">points</div>
              </div>

              {/* Power-ups */}
              <div className="text-right min-w-[80px]">
                <div className="text-sm font-semibold text-slate-900">
                  {team.powerUpsRemaining}/3
                </div>
                <div className="text-xs text-slate-500">power-ups</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Player Leaderboard */}
      {sortedPlayers.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-sm tracking-tight text-slate-900">
              Individual Player Leaderboard
            </h3>
            <p className="text-xs text-slate-500 italic">Click a player for detailed stats</p>
          </div>
          <div className="divide-y divide-slate-100">
            {sortedPlayers.map((player, index) => {
              const team = teams.find((t) => t.id === player.teamId);
              const accuracy = player.questionsAnswered > 0
                ? Math.round((player.questionsCorrect / player.questionsAnswered) * 100)
                : 0;

              return (
                <button
                  key={`${player.playerName}-${player.teamId}`}
                  onClick={() => setSelectedPlayer(player)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                    {index + 1}
                  </div>

                  {/* Team color indicator */}
                  {team && (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-slate-200"
                      style={{ backgroundColor: team.color }}
                    />
                  )}

                  {/* Player name and team */}
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{player.playerName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {player.teamName}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-900">
                      {player.totalPoints > 0 ? "+" : ""}
                      {Math.round(player.totalPoints)}
                    </div>
                    <div className="text-xs text-slate-500">points</div>
                  </div>

                  <div className="text-right min-w-[60px]">
                    <div className="text-sm font-semibold text-slate-900">
                      {player.questionsCorrect}/{player.questionsAnswered}
                    </div>
                    <div className="text-xs text-slate-500">{accuracy}% acc.</div>
                  </div>

                  <div className="text-slate-400 text-sm">→</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedTeams.map((team) => (
          <div
            key={team.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-5 h-5 rounded-full border-2 border-slate-200"
                style={{ backgroundColor: team.color }}
              />
              <h3 className="font-semibold text-slate-900">{team.name}</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Score</span>
                <span className="font-semibold text-slate-900">
                  {team.score > 0 ? "+" : ""}
                  {team.score}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Players</span>
                <span className="font-semibold text-slate-900">
                  {team.players.length}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Power-ups Used</span>
                <span className="font-semibold text-slate-900">
                  {team.powerUpsUsed}/3
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-2">Power-ups Status:</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className={`text-center py-1 rounded ${team.powerUps.doubleDown ? "bg-slate-100 text-slate-400" : "bg-green-50 text-green-700"}`}>
                    {team.powerUps.doubleDown ? "⚡ Used" : "⚡ Available"}
                  </div>
                  <div className={`text-center py-1 rounded ${team.powerUps.doubleDip ? "bg-slate-100 text-slate-400" : "bg-green-50 text-green-700"}`}>
                    {team.powerUps.doubleDip ? "🎯 Used" : "🎯 Available"}
                  </div>
                  <div className={`text-center py-1 rounded ${team.powerUps.phoneAFriend ? "bg-slate-100 text-slate-400" : "bg-green-50 text-green-700"}`}>
                    {team.powerUps.phoneAFriend ? "📞 Used" : "📞 Available"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
