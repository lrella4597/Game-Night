"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { Team, PowerUpKey } from "@/app/data/teams";

export { TEAM_COLORS, defaultTeam, type Team, type PowerUpKey } from "@/app/data/teams";

export function useTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load teams from Supabase
  const loadTeams = useCallback(async () => {
    if (!user) {
      setTeams([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform from database format to app format
      const transformedTeams: Team[] = (data || []).map((dbTeam) => ({
        id: dbTeam.id,
        name: dbTeam.name,
        color: dbTeam.color,
        score: dbTeam.score,
        players: dbTeam.players || [],
        powerUps: dbTeam.power_ups || { doubleDown: false, doubleDip: false, phoneAFriend: false },
      }));

      setTeams(transformedTeams);
    } catch (error) {
      console.error("Error loading teams:", error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Save teams to Supabase
  const saveTeams = useCallback(
    async (newTeams: Team[]) => {
      if (!user) return;

      try {
        // Delete all existing teams
        await supabase.from("teams").delete().eq("user_id", user.id);

        // Insert new teams
        if (newTeams.length > 0) {
          const dbTeams = newTeams.map((team) => ({
            id: team.id,
            user_id: user.id,
            name: team.name,
            color: team.color,
            score: team.score,
            players: team.players,
            power_ups: team.powerUps,
          }));

          await supabase.from("teams").insert(dbTeams);
        }

        setTeams(newTeams);
      } catch (error) {
        console.error("Error saving teams:", error);
      }
    },
    [user, supabase]
  );

  // Helper functions
  const updateTeamScore = useCallback(
    async (teamId: string, delta: number) => {
      const newTeams = teams.map((t) => (t.id === teamId ? { ...t, score: t.score + delta } : t));
      await saveTeams(newTeams);
    },
    [teams, saveTeams]
  );

  const setTeamScore = useCallback(
    async (teamId: string, score: number) => {
      const newTeams = teams.map((t) => (t.id === teamId ? { ...t, score } : t));
      await saveTeams(newTeams);
    },
    [teams, saveTeams]
  );

  const togglePowerUp = useCallback(
    async (teamId: string, key: PowerUpKey) => {
      const newTeams = teams.map((t) =>
        t.id === teamId ? { ...t, powerUps: { ...t.powerUps, [key]: !t.powerUps[key] } } : t
      );
      await saveTeams(newTeams);
    },
    [teams, saveTeams]
  );

  const resetAllPowerUps = useCallback(async () => {
    const newTeams = teams.map((t) => ({
      ...t,
      powerUps: { doubleDown: false, doubleDip: false, phoneAFriend: false },
    }));
    await saveTeams(newTeams);
  }, [teams, saveTeams]);

  return {
    teams,
    loading,
    saveTeams,
    updateTeamScore,
    setTeamScore,
    togglePowerUp,
    resetAllPowerUps,
    reload: loadTeams,
  };
}
