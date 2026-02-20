"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { PlayerStats } from "@/app/data/playerStats";

export * from "@/app/data/playerStats";

export function usePlayerStats() {
  const { user } = useAuth();
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load player stats from Supabase
  const loadPlayerStats = useCallback(async () => {
    if (!user) {
      setPlayerStats([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("player_stats")
        .select("*, player_answers(*)")
        .eq("user_id", user.id);

      if (error) throw error;

      // Transform from database format to app format
      const transformedStats: PlayerStats[] = (data || []).map((dbStat) => ({
        playerName: dbStat.player_name,
        teamId: dbStat.team_id,
        teamName: dbStat.team_name,
        totalPoints: dbStat.total_points,
        questionsAnswered: dbStat.questions_answered,
        questionsCorrect: dbStat.questions_correct,
        questionsIncorrect: dbStat.questions_incorrect,
        highestSingleScore: dbStat.highest_single_score,
        lowestSingleScore: dbStat.lowest_single_score,
        powerUpsUsed: dbStat.power_ups_used,
        answers: (dbStat.player_answers || []).map((ans: any) => ({
          questionId: ans.question_id,
          questionText: ans.question_text,
          categoryName: ans.category_name,
          correct: ans.correct,
          pointsEarned: ans.points_earned,
          timestamp: new Date(ans.timestamp).getTime(),
          powerUpUsed: ans.power_up_used,
          gameSessionId: ans.game_session_id,
        })),
      }));

      setPlayerStats(transformedStats);
    } catch (error) {
      console.error("Error loading player stats:", error);
      setPlayerStats([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadPlayerStats();
  }, [loadPlayerStats]);

  // Record player answer
  const recordPlayerAnswer = useCallback(
    async (
      playerName: string,
      teamId: string,
      teamName: string,
      questionId: string,
      questionText: string,
      categoryName: string,
      correct: boolean,
      pointsEarned: number,
      powerUpUsed?: string,
      gameSessionId?: string
    ) => {
      if (!user) return;

      try {
        // Find or create player stat
        let playerStat = playerStats.find(
          (ps) => ps.playerName === playerName && ps.teamId === teamId
        );

        if (!playerStat) {
          // Create new player stat
          const { data: newStat } = await supabase
            .from("player_stats")
            .insert({
              user_id: user.id,
              player_name: playerName,
              team_id: teamId,
              team_name: teamName,
              total_points: pointsEarned,
              questions_answered: 1,
              questions_correct: correct ? 1 : 0,
              questions_incorrect: correct ? 0 : 1,
              highest_single_score: pointsEarned,
              lowest_single_score: pointsEarned,
              power_ups_used: { doubleDown: 0, doubleDip: 0, phoneAFriend: 0 },
            })
            .select()
            .single();

          if (newStat) {
            // Insert player answer
            await supabase.from("player_answers").insert({
              player_stat_id: newStat.id,
              user_id: user.id,
              question_id: questionId,
              question_text: questionText,
              category_name: categoryName,
              correct,
              points_earned: pointsEarned,
              timestamp: new Date().toISOString(),
              power_up_used: powerUpUsed,
              game_session_id: gameSessionId,
            });
          }
        } else {
          // Update existing player stat
          const { data: dbStat } = await supabase
            .from("player_stats")
            .select("id")
            .eq("user_id", user.id)
            .eq("player_name", playerName)
            .eq("team_id", teamId)
            .single();

          if (dbStat) {
            await supabase
              .from("player_stats")
              .update({
                total_points: playerStat.totalPoints + pointsEarned,
                questions_answered: playerStat.questionsAnswered + 1,
                questions_correct: playerStat.questionsCorrect + (correct ? 1 : 0),
                questions_incorrect: playerStat.questionsIncorrect + (correct ? 0 : 1),
                highest_single_score: Math.max(playerStat.highestSingleScore, pointsEarned),
                lowest_single_score: Math.min(playerStat.lowestSingleScore, pointsEarned),
              })
              .eq("id", dbStat.id);

            // Insert player answer
            await supabase.from("player_answers").insert({
              player_stat_id: dbStat.id,
              user_id: user.id,
              question_id: questionId,
              question_text: questionText,
              category_name: categoryName,
              correct,
              points_earned: pointsEarned,
              timestamp: new Date().toISOString(),
              power_up_used: powerUpUsed,
              game_session_id: gameSessionId,
            });
          }
        }

        await loadPlayerStats();
      } catch (error) {
        console.error("Error recording player answer:", error);
      }
    },
    [user, playerStats, supabase, loadPlayerStats]
  );

  const clearAllStats = useCallback(async () => {
    if (!user) return;
    try {
      // Delete player answers first (FK constraint)
      await supabase.from("player_answers").delete().eq("user_id", user.id);
      // Delete player stats
      await supabase.from("player_stats").delete().eq("user_id", user.id);
      // Clear legacy localStorage stats
      try { localStorage.removeItem("triviaMasters.playerStats.v1"); } catch {}
      setPlayerStats([]);
    } catch (error) {
      console.error("Error clearing stats:", error);
    }
  }, [user, supabase]);

  return {
    playerStats,
    loading,
    recordPlayerAnswer,
    clearAllStats,
    reload: loadPlayerStats,
  };
}
