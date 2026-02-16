"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PlayerStats } from "@/lib/data/usePlayerStats";

interface PerformanceTrendChartProps {
  playerStat: PlayerStats;
}

export default function PerformanceTrendChart({ playerStat }: PerformanceTrendChartProps) {
  // Sort answers by timestamp and calculate cumulative points
  const sortedAnswers = [...playerStat.answers].sort((a, b) => a.timestamp - b.timestamp);

  const chartData = sortedAnswers.map((answer, index) => {
    const cumulativePoints = sortedAnswers
      .slice(0, index + 1)
      .reduce((sum, a) => sum + a.pointsEarned, 0);

    return {
      index: index + 1,
      points: answer.pointsEarned,
      cumulativePoints: Math.round(cumulativePoints),
      questionText: answer.questionText.substring(0, 50) + "...",
      category: answer.categoryName,
      correct: answer.correct,
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="index"
          label={{ value: "Question Number", position: "insideBottom", offset: -5 }}
          stroke="#64748b"
        />
        <YAxis
          label={{ value: "Cumulative Points", angle: -90, position: "insideLeft" }}
          stroke="#64748b"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-slate-900">Question #{data.index}</p>
                  <p className="text-sm text-slate-600 mt-1">{data.questionText}</p>
                  <p className="text-xs text-slate-500 mt-1">{data.category}</p>
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className={`text-sm font-semibold ${data.correct ? "text-green-700" : "text-red-700"}`}>
                      {data.correct ? "✓ Correct" : "✗ Incorrect"} • {data.points > 0 ? "+" : ""}{data.points} pts
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      Total: {data.cumulativePoints} pts
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulativePoints"
          stroke="#3b82f6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPoints)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
