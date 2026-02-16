"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PlayerStats } from "@/lib/data/usePlayerStats";

interface PointsPer10QuestionsChartProps {
  playerStat: PlayerStats;
}

export default function PointsPer10QuestionsChart({ playerStat }: PointsPer10QuestionsChartProps) {
  // Sort answers by timestamp
  const sortedAnswers = [...playerStat.answers].sort((a, b) => a.timestamp - b.timestamp);

  // Calculate rolling average points per 10 questions
  const chartData = sortedAnswers.map((answer, index) => {
    const startIndex = Math.max(0, index - 9); // Last 10 questions
    const window = sortedAnswers.slice(startIndex, index + 1);
    const totalPoints = window.reduce((sum, a) => sum + a.pointsEarned, 0);
    const avgPer10 = (totalPoints / window.length) * 10;

    return {
      index: index + 1,
      avgPer10: Math.round(avgPer10 * 10) / 10,
      windowSize: window.length,
      currentPoints: answer.pointsEarned,
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

  const overallAvgPer10 = playerStat.questionsAnswered > 0
    ? (playerStat.totalPoints / playerStat.questionsAnswered) * 10
    : 0;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="index"
          label={{ value: "Question Number", position: "insideBottom", offset: -5 }}
          stroke="#64748b"
        />
        <YAxis
          label={{ value: "Avg Points per 10Q", angle: -90, position: "insideLeft" }}
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
                    <p className="text-sm text-slate-700">
                      This question: <span className="font-semibold">{data.currentPoints > 0 ? "+" : ""}{data.currentPoints} pts</span>
                    </p>
                    <p className="text-sm text-slate-700 mt-1">
                      Rolling avg (last {data.windowSize}): <span className="font-semibold">{data.avgPer10} pts per 10Q</span>
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine
          y={overallAvgPer10}
          stroke="#94a3b8"
          strokeDasharray="5 5"
          label={{
            value: `Overall: ${overallAvgPer10.toFixed(1)}`,
            position: "right",
            fill: "#64748b",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="avgPer10"
          stroke="#8b5cf6"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorAvg)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
