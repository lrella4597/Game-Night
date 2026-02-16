"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getCategoryStats } from "@/app/data/playerStats";
import type { PlayerStats } from "@/lib/data/usePlayerStats";

interface CategoryPerformanceChartProps {
  playerStat: PlayerStats;
}

export default function CategoryPerformanceChart({ playerStat }: CategoryPerformanceChartProps) {
  const categoryStats = getCategoryStats(playerStat);

  // Sort by total points descending
  const chartData = [...categoryStats]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10) // Show top 10 categories
    .map(cat => ({
      category: cat.categoryName.length > 20
        ? cat.categoryName.substring(0, 20) + "..."
        : cat.categoryName,
      fullName: cat.categoryName,
      accuracy: Math.round(cat.accuracy * 10) / 10,
      points: Math.round(cat.totalPoints),
      correct: cat.questionsCorrect,
      answered: cat.questionsAnswered,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" stroke="#64748b" />
        <YAxis
          type="category"
          dataKey="category"
          width={150}
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
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-slate-700">
                      Points: <span className="font-semibold">{data.points > 0 ? "+" : ""}{data.points}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Accuracy: <span className="font-semibold">{data.accuracy}%</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Correct: <span className="font-semibold">{data.correct}/{data.answered}</span>
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="points" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => {
            const color = entry.points >= 0 ? "#10b981" : "#ef4444";
            return <Cell key={`cell-${index}`} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
