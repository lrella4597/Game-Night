"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PlayerStats } from "@/lib/data/usePlayerStats";

interface AccuracyTrendChartProps {
  playerStat: PlayerStats;
  windowSize?: number; // Number of questions to calculate rolling accuracy
}

export default function AccuracyTrendChart({
  playerStat,
  windowSize = 10
}: AccuracyTrendChartProps) {
  // Sort answers by timestamp
  const sortedAnswers = [...playerStat.answers].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate rolling accuracy
  const chartData = sortedAnswers.map((answer, index) => {
    const startIndex = Math.max(0, index - windowSize + 1);
    const window = sortedAnswers.slice(startIndex, index + 1);
    const correctInWindow = window.filter(a => a.correct).length;
    const accuracy = (correctInWindow / window.length) * 100;

    return {
      index: index + 1,
      accuracy: Math.round(accuracy * 10) / 10,
      windowSize: window.length,
      correct: answer.correct,
      questionText: answer.questionText.substring(0, 50) + "...",
    };
  });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No data available yet
      </div>
    );
  }

  const overallAccuracy = playerStat.questionsAnswered > 0
    ? (playerStat.questionsCorrect / playerStat.questionsAnswered) * 100
    : 0;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="index"
          label={{ value: "Question Number", position: "insideBottom", offset: -5 }}
          stroke="#64748b"
        />
        <YAxis
          domain={[0, 100]}
          label={{ value: "Accuracy (%)", angle: -90, position: "insideLeft" }}
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
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className={`text-sm font-semibold ${data.correct ? "text-green-700" : "text-red-700"}`}>
                      {data.correct ? "✓ Correct" : "✗ Incorrect"}
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      Rolling accuracy (last {data.windowSize}): {data.accuracy}%
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine
          y={overallAccuracy}
          stroke="#94a3b8"
          strokeDasharray="5 5"
          label={{
            value: `Avg: ${overallAccuracy.toFixed(1)}%`,
            position: "right",
            fill: "#64748b",
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
