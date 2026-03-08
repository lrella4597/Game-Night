"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { Team, PowerUpKey } from "@/app/data/teams";

export { TEAM_COLORS, defaultTeam, type Team, type PowerUpKey } from "@/app/data/teams";

const DEBOUNCE_MS = 600;

export function useTeams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Debounce ref for batching rapid saves (e.g. typing team name)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<Team[] | null>(null);

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

  // Actually persist to Supabase (called by debounced or immediate save)
  const flushSave = useCallback(
    async (newTeams: Team[]) => {
      if (!user) return;

      try {
        // Get current team IDs in DB to detect deletions
        const { data: existing } = await supabase
          .from("teams")
          .select("id")
          .eq("user_id", user.id);

        const existingIds = new Set((existing || []).map((r) => r.id));
        const newIds = new Set(newTeams.map((t) => t.id));

        // Delete removed teams
        const toDelete = [...existingIds].filter((id) => !newIds.has(id));
        if (toDelete.length > 0) {
          await supabase
            .from("teams")
            .delete()
            .eq("user_id", user.id)
            .in("id", toDelete);
        }

        // Upsert all current teams (insert new ones, update existing)
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

          const { error } = await supabase
            .from("teams")
            .upsert(dbTeams, { onConflict: "id" });

          if (error) throw error;
        }
      } catch (error: unknown) {
        const e = error as { message?: string; code?: string; details?: string; hint?: string };
        console.error("Error saving teams:", e?.message, "| code:", e?.code, "| details:", e?.details, "| hint:", e?.hint, e);
      }
    },
    [user, supabase]
  );

  // Save teams — supports debounced saves (typing) and immediate saves (add/remove/score)
  const saveTeams = useCallback(
    async (newTeams: Team[], immediate: boolean = false) => {
      // Always update local state immediately (optimistic UI)
      setTeams(newTeams);
      pendingSave.current = newTeams;

      if (immediate) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = null;
        pendingSave.current = null;
        await flushSave(newTeams);
      } else {
        // Debounce — batch rapid changes (e.g. typing)
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          const toSave = pendingSave.current;
          pendingSave.current = null;
          saveTimer.current = null;
          if (toSave) flushSave(toSave);
        }, DEBOUNCE_MS);
      }
    },
    [flushSave]
  );

  // Flush any pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        if (pendingSave.current) {
          flushSave(pendingSave.current);
        }
      }
    };
  }, [flushSave]);

  // Helper functions — these are immediate saves (score, power-ups)
  const updateTeamScore = useCallback(
    async (teamId: string, delta: number) => {
      const newTeams = teams.map((t) => (t.id === teamId ? { ...t, score: t.score + delta } : t));
      await saveTeams(newTeams, true);
    },
    [teams, saveTeams]
  );

  const setTeamScore = useCallback(
    async (teamId: string, score: number) => {
      const newTeams = teams.map((t) => (t.id === teamId ? { ...t, score } : t));
      await saveTeams(newTeams, true);
    },
    [teams, saveTeams]
  );

  const togglePowerUp = useCallback(
    async (teamId: string, key: PowerUpKey) => {
      const newTeams = teams.map((t) =>
        t.id === teamId ? { ...t, powerUps: { ...t.powerUps, [key]: !t.powerUps[key] } } : t
      );
      await saveTeams(newTeams, true);
    },
    [teams, saveTeams]
  );

  const resetAllPowerUps = useCallback(async () => {
    const newTeams = teams.map((t) => ({
      ...t,
      powerUps: { doubleDown: false, doubleDip: false, phoneAFriend: false },
    }));
    await saveTeams(newTeams, true);
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
