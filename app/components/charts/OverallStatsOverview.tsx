"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PlayerStats } from "@/lib/data/usePlayerStats";
import type { Team } from "@/lib/data/useTeams";

interface OverallStatsOverviewProps {
  playerStats: PlayerStats[];
  teams: Team[];
}

export default function OverallStatsOverview({ playerStats, teams }: OverallStatsOverviewProps) {
  // Calculate aggregate stats
  const totalQuestions = playerStats.reduce((sum, p) => sum + p.questionsAnswered, 0);
  const totalCorrect = playerStats.reduce((sum, p) => sum + p.questionsCorrect, 0);
  const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const totalPoints = playerStats.reduce((sum, p) => sum + p.totalPoints, 0);

  // Get all answers sorted by timestamp
  const allAnswers = playerStats
    .flatMap(p => p.answers.map(a => ({ ...a, playerName: p.playerName })))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Calculate rolling accuracy for all players combined (last 20 questions)
  const rollingAccuracyData = allAnswers.slice(-50).map((answer, index, arr) => {
    const window = arr.slice(Math.max(0, index - 19), index + 1);
    const correctInWindow = window.filter(a => a.correct).length;
    const accuracy = (correctInWindow / window.length) * 100;

    return {
      index: allAnswers.length - 50 + index + 1,
      accuracy: Math.round(accuracy * 10) / 10,
    };
  });

  // Player comparison data
  const playerComparisonData = playerStats
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 8) // Top 8 players
    .map(p => ({
      name: p.playerName.length > 12 ? p.playerName.substring(0, 12) + "..." : p.playerName,
      fullName: p.playerName,
      points: Math.round(p.totalPoints),
      accuracy: p.questionsAnswered > 0 ? (p.questionsCorrect / p.questionsAnswered) * 100 : 0,
      answered: p.questionsAnswered,
    }));

  // Team comparison data
  const teamComparisonData = teams
    .sort((a, b) => b.score - a.score)
    .map(t => {
      const teamColor = t.color;
      return {
        name: t.name.length > 12 ? t.name.substring(0, 12) + "..." : t.name,
        fullName: t.name,
        score: t.score,
        players: t.players.length,
        color: teamColor,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold tracking-tight uppercase text-slate-600 mb-2">
            Total Questions
          </div>
          <div className="text-3xl font-bold text-slate-900">{totalQuestions}</div>
          <div className="text-xs text-slate-500 mt-1">
            {totalCorrect} correct • {totalQuestions - totalCorrect} incorrect
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold tracking-tight uppercase text-slate-600 mb-2">
            Overall Accuracy
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {overallAccuracy.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across all {playerStats.length} player{playerStats.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold tracking-tight uppercase text-slate-600 mb-2">
            Total Points
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {totalPoints > 0 ? "+" : ""}
            {Math.round(totalPoints)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Combined across all players
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold tracking-tight uppercase text-slate-600 mb-2">
            Active Teams
          </div>
          <div className="text-3xl font-bold text-slate-900">{teams.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {teams.reduce((sum, t) => sum + t.players.length, 0)} total players
          </div>
        </div>
      </div>

      {/* Charts Row */}
      {allAnswers.length >= 20 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Game Accuracy Trend */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📊</span>
              <h3 className="font-semibold text-slate-900">Game Accuracy Trend</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Rolling accuracy across all players (last 50 questions)
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={rollingAccuracyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="index"
                  stroke="#64748b"
                  style={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#64748b"
                  style={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                          <p className="text-sm text-slate-700">
                            Question #{data.index}
                          </p>
                          <p className="text-sm font-semibold text-slate-900 mt-1">
                            Accuracy: {data.accuracy}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Team Scores Comparison */}
          {teamComparisonData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🏆</span>
                <h3 className="font-semibold text-slate-900">Team Scores</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Current standings
              </p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={teamComparisonData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" style={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    stroke="#64748b"
                    style={{ fontSize: 12 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-slate-900">{data.fullName}</p>
                            <p className="text-sm text-slate-700 mt-1">
                              Score: <span className="font-semibold">{data.score > 0 ? "+" : ""}{data.score}</span>
                            </p>
                            <p className="text-sm text-slate-700">
                              Players: <span className="font-semibold">{data.players}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {teamComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Top Players Comparison */}
      {playerComparisonData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">⭐</span>
            <h3 className="font-semibold text-slate-900">Top Players by Points</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Top 8 players ranked by total points earned
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={playerComparisonData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                stroke="#64748b"
                style={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                        <p className="font-semibold text-slate-900">{data.fullName}</p>
                        <p className="text-sm text-slate-700 mt-1">
                          Points: <span className="font-semibold">{data.points > 0 ? "+" : ""}{data.points}</span>
                        </p>
                        <p className="text-sm text-slate-700">
                          Accuracy: <span className="font-semibold">{data.accuracy.toFixed(1)}%</span>
                        </p>
                        <p className="text-sm text-slate-700">
                          Questions: <span className="font-semibold">{data.answered}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="points" radius={[0, 4, 4, 0]}>
                {playerComparisonData.map((entry, index) => {
                  const color = entry.points >= 0 ? "#10b981" : "#ef4444";
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
