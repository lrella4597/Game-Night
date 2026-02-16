"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PlayerStats } from "@/lib/data/usePlayerStats";

interface CorrectIncorrectTrendChartProps {
  playerStat: PlayerStats;
}

export default function CorrectIncorrectTrendChart({ playerStat }: CorrectIncorrectTrendChartProps) {
  // Sort answers by timestamp
  const sortedAnswers = [...playerStat.answers].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate cumulative correct and incorrect
  const chartData = sortedAnswers.map((answer, index) => {
    const answersUpToNow = sortedAnswers.slice(0, index + 1);
    const correctCount = answersUpToNow.filter(a => a.correct).length;
    const incorrectCount = answersUpToNow.filter(a => !a.correct).length;

    return {
      index: index + 1,
      correct: correctCount,
      incorrect: incorrectCount,
      questionText: answer.questionText.substring(0, 50) + "...",
      wasCorrect: answer.correct,
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
          <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="colorIncorrect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="index"
          label={{ value: "Question Number", position: "insideBottom", offset: -5 }}
          stroke="#64748b"
        />
        <YAxis
          label={{ value: "Count", angle: -90, position: "insideLeft" }}
          stroke="#64748b"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const accuracy = data.index > 0
                ? ((data.correct / data.index) * 100).toFixed(1)
                : 0;
              return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                  <p className="font-semibold text-slate-900">Question #{data.index}</p>
                  <p className="text-sm text-slate-600 mt-1">{data.questionText}</p>
                  <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                    <p className={`text-sm font-semibold ${data.wasCorrect ? "text-green-700" : "text-red-700"}`}>
                      {data.wasCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </p>
                    <p className="text-sm text-green-700">
                      Total correct: {data.correct}
                    </p>
                    <p className="text-sm text-red-700">
                      Total incorrect: {data.incorrect}
                    </p>
                    <p className="text-sm text-slate-700 font-semibold">
                      Accuracy: {accuracy}%
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="correct"
          stackId="1"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#colorCorrect)"
          name="Correct"
        />
        <Area
          type="monotone"
          dataKey="incorrect"
          stackId="1"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#colorIncorrect)"
          name="Incorrect"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
