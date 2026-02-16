"use client";

import { useState, useEffect } from "react";
import type { PlayerStats } from "../data/playerStats";
import {
  getCategoryStats,
  getAveragePointsPer10Questions,
  getAccuracy,
  getAveragePointsPerQuestion,
  getBestCategory,
  getWorstCategory,
  getCurrentStreak,
} from "../data/playerStats";
import { loadTeams } from "../data/teams";
import PerformanceTrendChart from "./charts/PerformanceTrendChart";
import AccuracyTrendChart from "./charts/AccuracyTrendChart";
import CategoryPerformanceChart from "./charts/CategoryPerformanceChart";
import PointsPer10QuestionsChart from "./charts/PointsPer10QuestionsChart";
import CorrectIncorrectTrendChart from "./charts/CorrectIncorrectTrendChart";

interface PlayerDetailViewProps {
  playerStat: PlayerStats;
  onBack: () => void;
}

export default function PlayerDetailView({ playerStat, onBack }: PlayerDetailViewProps) {
  const [teamColor, setTeamColor] = useState("#94a3b8");

  useEffect(() => {
    const teams = loadTeams();
    const team = teams.find((t) => t.id === playerStat.teamId);
    if (team) setTeamColor(team.color);
  }, [playerStat.teamId]);

  const accuracy = getAccuracy(playerStat);
  const avgPer10 = getAveragePointsPer10Questions(playerStat);
  const avgPerQuestion = getAveragePointsPerQuestion(playerStat);
  const categoryStats = getCategoryStats(playerStat);
  const bestCategory = getBestCategory(playerStat);
  const worstCategory = getWorstCategory(playerStat);
  const streak = getCurrentStreak(playerStat);

  return (
    <div className="w-full max-w-6xl flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg font-semibold text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full border-2 border-slate-200"
            style={{ backgroundColor: teamColor }}
          />
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {playerStat.playerName}
            </h2>
            <p className="text-slate-600 text-sm">{playerStat.teamName}</p>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Points */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold tracking-tight uppercase text-slate-600">
              Total Points
            </div>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {playerStat.totalPoints > 0 ? "+" : ""}
            {Math.round(playerStat.totalPoints)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            High: {playerStat.highestSingleScore} • Low: {playerStat.lowestSingleScore}
          </div>
        </div>

        {/* Accuracy */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold tracking-tight uppercase text-slate-600">
              Accuracy
            </div>
            <span className="text-2xl">🎯</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {accuracy.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {playerStat.questionsCorrect}/{playerStat.questionsAnswered} correct
          </div>
        </div>

        {/* Avg Points Per 10 Questions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold tracking-tight uppercase text-slate-600">
              Avg per 10Q
            </div>
            <span className="text-2xl">📈</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {avgPer10 > 0 ? "+" : ""}
            {Math.round(avgPer10)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {Math.round(avgPerQuestion)} per question
          </div>
        </div>

        {/* Current Streak */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="text-xs font-semibold tracking-tight uppercase text-slate-600">
              Current Streak
            </div>
            <span className="text-2xl">
              {streak.type === "correct" ? "🔥" : streak.type === "incorrect" ? "❄️" : "➖"}
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {streak.count}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {streak.type === "correct" ? "Correct answers" : streak.type === "incorrect" ? "Incorrect answers" : "No answers yet"}
          </div>
        </div>
      </div>

      {/* Best & Worst Categories */}
      {(bestCategory || worstCategory) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Best Category */}
          {bestCategory && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🌟</span>
                <h3 className="font-semibold text-green-900">Best Category</h3>
              </div>
              <div className="text-xl font-bold text-green-900 mb-1">
                {bestCategory.categoryName}
              </div>
              <div className="text-sm text-green-700">
                {bestCategory.accuracy.toFixed(1)}% accuracy •{" "}
                {bestCategory.questionsCorrect}/{bestCategory.questionsAnswered} correct •{" "}
                {bestCategory.totalPoints > 0 ? "+" : ""}
                {Math.round(bestCategory.totalPoints)} pts
              </div>
            </div>
          )}

          {/* Worst Category */}
          {worstCategory && worstCategory.categoryName !== bestCategory?.categoryName && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📉</span>
                <h3 className="font-semibold text-red-900">Needs Improvement</h3>
              </div>
              <div className="text-xl font-bold text-red-900 mb-1">
                {worstCategory.categoryName}
              </div>
              <div className="text-sm text-red-700">
                {worstCategory.accuracy.toFixed(1)}% accuracy •{" "}
                {worstCategory.questionsCorrect}/{worstCategory.questionsAnswered} correct •{" "}
                {worstCategory.totalPoints > 0 ? "+" : ""}
                {Math.round(worstCategory.totalPoints)} pts
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Trends Section */}
      {playerStat.answers.length >= 5 && (
        <>
          <div className="pt-4">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Performance Trends
            </h2>
            <p className="text-slate-600 text-sm mt-0.5">
              Visualize your progress and improvement over time
            </p>
          </div>

          {/* Performance Trend Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📈</span>
              <h3 className="font-semibold text-slate-900">Cumulative Points Over Time</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Track your total points earned throughout the game
            </p>
            <PerformanceTrendChart playerStat={playerStat} />
          </div>

          {/* Accuracy Trend Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🎯</span>
              <h3 className="font-semibold text-slate-900">Accuracy Trend (Rolling 10 Questions)</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              See how your accuracy changes over time. The line shows your accuracy for the last 10 questions at each point.
            </p>
            <AccuracyTrendChart playerStat={playerStat} />
          </div>

          {/* Points Per 10 Questions Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📊</span>
              <h3 className="font-semibold text-slate-900">Average Points Per 10 Questions</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Monitor your scoring efficiency. Higher values indicate you're answering more questions correctly or tackling harder questions.
            </p>
            <PointsPer10QuestionsChart playerStat={playerStat} />
          </div>

          {/* Correct vs Incorrect Over Time */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📉</span>
              <h3 className="font-semibold text-slate-900">Correct vs Incorrect Answers</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              See the breakdown of your correct and incorrect answers over time
            </p>
            <CorrectIncorrectTrendChart playerStat={playerStat} />
          </div>

          {/* Category Performance Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🏆</span>
              <h3 className="font-semibold text-slate-900">Category Performance</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Compare your total points earned across different categories (top 10 shown)
            </p>
            <CategoryPerformanceChart playerStat={playerStat} />
          </div>
        </>
      )}

      {/* Power-Up Usage */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">⚡</span>
          <h3 className="font-semibold text-slate-900">Power-Up Usage</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">Double Down</div>
            <div className="text-3xl font-bold text-slate-900">
              {playerStat.powerUpsUsed.doubleDown}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">Double Dip</div>
            <div className="text-3xl font-bold text-slate-900">
              {playerStat.powerUpsUsed.doubleDip}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">Phone a Friend</div>
            <div className="text-3xl font-bold text-slate-900">
              {playerStat.powerUpsUsed.phoneAFriend}
            </div>
          </div>
        </div>
      </div>

      {/* All Categories Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-sm tracking-tight text-slate-900">
            Category Breakdown
          </h3>
        </div>
        {categoryStats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No questions answered yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categoryStats.map((cat) => (
              <div
                key={cat.categoryName}
                className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{cat.categoryName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {cat.questionsAnswered} question{cat.questionsAnswered !== 1 ? "s" : ""} answered
                  </div>
                </div>
                <div className="text-right min-w-[80px]">
                  <div className="text-lg font-bold text-slate-900">
                    {cat.accuracy.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {cat.questionsCorrect}/{cat.questionsAnswered}
                  </div>
                </div>
                <div className="text-right min-w-[80px]">
                  <div className="text-lg font-bold text-slate-900">
                    {cat.totalPoints > 0 ? "+" : ""}
                    {Math.round(cat.totalPoints)}
                  </div>
                  <div className="text-xs text-slate-500">points</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Answers */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-sm tracking-tight text-slate-900">
            Recent Answers ({playerStat.answers.length})
          </h3>
        </div>
        {playerStat.answers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No answers yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {[...playerStat.answers]
              .sort((a, b) => b.timestamp - a.timestamp)
              .slice(0, 20)
              .map((answer, idx) => (
                <div
                  key={idx}
                  className="px-6 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      answer.correct
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {answer.correct ? "✓" : "✗"}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-900">{answer.questionText}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {answer.categoryName}
                      {answer.powerUpUsed && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                          ⚡ {answer.powerUpUsed}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${
                    answer.pointsEarned > 0 ? "text-green-700" : "text-red-700"
                  }`}>
                    {answer.pointsEarned > 0 ? "+" : ""}
                    {Math.round(answer.pointsEarned)}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
