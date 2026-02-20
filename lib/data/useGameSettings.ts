"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { GameSettings, GameMode, PointMode } from "@/app/data/gameSettings";

export { DEFAULT_SETTINGS, type GameSettings, type GameMode, type PointMode } from "@/app/data/gameSettings";

export function useGameSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GameSettings>({
    mode: "ai",
    questionTimerSeconds: 45,
    stealTimerSeconds: 10,
    pointMode: "classic",
    flatPointValue: 100,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Load settings from Supabase
  const loadSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("game_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          mode: data.mode as GameMode,
          questionTimerSeconds: data.question_timer_seconds,
          stealTimerSeconds: data.steal_timer_seconds,
          pointMode: data.point_mode as PointMode,
          flatPointValue: data.flat_point_value,
        });
      }
    } catch (error) {
      console.error("Error loading game settings:", error);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings to Supabase
  const saveSettings = useCallback(
    async (newSettings: GameSettings) => {
      if (!user) return;

      try {
        await supabase.from("game_settings").upsert(
          {
            user_id: user.id,
            mode: newSettings.mode,
            question_timer_seconds: newSettings.questionTimerSeconds,
            steal_timer_seconds: newSettings.stealTimerSeconds,
            point_mode: newSettings.pointMode,
            flat_point_value: newSettings.flatPointValue,
          },
          { onConflict: "user_id" }
        );

        setSettings(newSettings);
      } catch (error) {
        console.error("Error saving game settings:", error);
      }
    },
    [user, supabase]
  );

  const setMode = useCallback(
    async (mode: GameMode) => {
      await saveSettings({ ...settings, mode });
    },
    [settings, saveSettings]
  );

  return {
    settings,
    loading,
    saveSettings,
    setMode,
    reload: loadSettings,
  };
}
