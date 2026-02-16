"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";

export interface Theme {
  id: string;
  name: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    boardBackground: string;
    tileBackground: string;
    tileText: string;
    tileBorder: string;
    cardBackground: string;
    cardBorder: string;
  };
}

export const PRESET_THEMES: Theme[] = [
  {
    id: "modern-lime",
    name: "Modern Lime (Default)",
    colors: {
      background: "#F7F8FA",
      foreground: "#0B1220",
      accent: "#D7FF2F",
      boardBackground: "#F7F8FA",
      tileBackground: "#0B1220",
      tileText: "#FFFFFF",
      tileBorder: "#1E293B",
      cardBackground: "#FFFFFF",
      cardBorder: "#E2E8F0",
    },
  },
  {
    id: "classic-jeopardy",
    name: "Classic Jeopardy",
    colors: {
      background: "#060CE9",
      foreground: "#FFFFFF",
      accent: "#FFD700",
      boardBackground: "#060CE9",
      tileBackground: "#060CE9",
      tileText: "#FFD700",
      tileBorder: "#000000",
      cardBackground: "#1E3A8A",
      cardBorder: "#3B82F6",
    },
  },
  {
    id: "dark-mode",
    name: "Dark Mode",
    colors: {
      background: "#0F172A",
      foreground: "#F1F5F9",
      accent: "#10B981",
      boardBackground: "#1E293B",
      tileBackground: "#334155",
      tileText: "#F1F5F9",
      tileBorder: "#475569",
      cardBackground: "#1E293B",
      cardBorder: "#334155",
    },
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    colors: {
      background: "#E0F2FE",
      foreground: "#0C4A6E",
      accent: "#06B6D4",
      boardBackground: "#BAE6FD",
      tileBackground: "#0369A1",
      tileText: "#E0F2FE",
      tileBorder: "#075985",
      cardBackground: "#FFFFFF",
      cardBorder: "#7DD3FC",
    },
  },
  {
    id: "sunset-glow",
    name: "Sunset Glow",
    colors: {
      background: "#FFF7ED",
      foreground: "#431407",
      accent: "#F97316",
      boardBackground: "#FFEDD5",
      tileBackground: "#EA580C",
      tileText: "#FFF7ED",
      tileBorder: "#C2410C",
      cardBackground: "#FFFFFF",
      cardBorder: "#FDBA74",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    colors: {
      background: "#F0FDF4",
      foreground: "#14532D",
      accent: "#22C55E",
      boardBackground: "#DCFCE7",
      tileBackground: "#16A34A",
      tileText: "#F0FDF4",
      tileBorder: "#15803D",
      cardBackground: "#FFFFFF",
      cardBorder: "#86EFAC",
    },
  },
  {
    id: "royal-purple",
    name: "Royal Purple",
    colors: {
      background: "#FAF5FF",
      foreground: "#3B0764",
      accent: "#A855F7",
      boardBackground: "#F3E8FF",
      tileBackground: "#7C3AED",
      tileText: "#FAF5FF",
      tileBorder: "#6D28D9",
      cardBackground: "#FFFFFF",
      cardBorder: "#C4B5FD",
    },
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    colors: {
      background: "#FFFFFF",
      foreground: "#000000",
      accent: "#FF0000",
      boardBackground: "#FFFFFF",
      tileBackground: "#000000",
      tileText: "#FFFFFF",
      tileBorder: "#000000",
      cardBackground: "#FFFFFF",
      cardBorder: "#000000",
    },
  },
];

export function useTheme() {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<Theme>(PRESET_THEMES[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCurrentTheme(PRESET_THEMES[0]);
      setLoading(false);
      return;
    }
    loadTheme();
  }, [user]);

  async function loadTheme() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("game_settings")
        .select("theme_colors")
        .eq("user_id", user!.id)
        .single();

      // Silently handle common expected errors:
      // - PGRST116: No rows (user hasn't saved settings yet)
      // - 42703: Column doesn't exist (migration not applied)
      // - 42P01: Table doesn't exist
      if (error) {
        const ignorableCodes = ["PGRST116", "42703", "42P01"];
        if (!ignorableCodes.includes(error.code || "")) {
          console.warn("Theme loading issue (using fallback):", error.message || error);
        }

        // Try loading from localStorage as fallback
        const localTheme = localStorage.getItem("trivia_masters_theme");
        if (localTheme) {
          try {
            const parsedTheme = JSON.parse(localTheme);
            setCurrentTheme(parsedTheme);
            setLoading(false);
            return;
          } catch {
            // Invalid JSON, continue to default
          }
        }

        setCurrentTheme(PRESET_THEMES[0]);
        setLoading(false);
        return;
      }

      if (data?.theme_colors) {
        // Custom theme stored in database
        setCurrentTheme({
          id: "custom",
          name: "Custom",
          colors: data.theme_colors,
        });
      } else {
        // Try localStorage fallback
        const localTheme = localStorage.getItem("trivia_masters_theme");
        if (localTheme) {
          try {
            const parsedTheme = JSON.parse(localTheme);
            setCurrentTheme(parsedTheme);
          } catch {
            setCurrentTheme(PRESET_THEMES[0]);
          }
        } else {
          setCurrentTheme(PRESET_THEMES[0]);
        }
      }
    } catch (err) {
      // Try localStorage fallback
      const localTheme = localStorage.getItem("trivia_masters_theme");
      if (localTheme) {
        try {
          const parsedTheme = JSON.parse(localTheme);
          setCurrentTheme(parsedTheme);
        } catch {
          setCurrentTheme(PRESET_THEMES[0]);
        }
      } else {
        setCurrentTheme(PRESET_THEMES[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function applyTheme(theme: Theme) {
    // Update CSS variables
    const root = document.documentElement;
    root.style.setProperty("--background", theme.colors.background);
    root.style.setProperty("--foreground", theme.colors.foreground);
    root.style.setProperty("--accent", theme.colors.accent);
    root.style.setProperty("--board-background", theme.colors.boardBackground);
    root.style.setProperty("--tile-background", theme.colors.tileBackground);
    root.style.setProperty("--tile-text", theme.colors.tileText);
    root.style.setProperty("--tile-border", theme.colors.tileBorder);
    root.style.setProperty("--card-background", theme.colors.cardBackground);
    root.style.setProperty("--card-border", theme.colors.cardBorder);

    setCurrentTheme(theme);

    // Save to database (silently fail if migration not applied)
    if (user) {
      try {
        const supabase = createClient();

        // Use upsert to create or update the settings row
        const { error } = await supabase
          .from("game_settings")
          .upsert(
            { user_id: user.id, theme_colors: theme.colors },
            { onConflict: "user_id" }
          );

        // If column doesn't exist (migration not applied), show helpful message
        if (error?.code === "42703") {
          console.info(
            "💡 Theme not saved: Apply the database migration to persist themes.\n" +
            "   Run: supabase-theme-settings-migration.sql in Supabase SQL Editor"
          );
        } else if (error) {
          console.warn("Theme save issue:", error.message || error);
        } else {
          console.log("✅ Theme saved successfully!");
        }
      } catch (err) {
        // Silently ignore - theme still works locally
      }
    }
  }

  // Apply theme on initial load
  useEffect(() => {
    if (!loading) {
      applyTheme(currentTheme);
    }
  }, [loading]);

  function selectPreset(presetId: string) {
    const preset = PRESET_THEMES.find((t) => t.id === presetId);
    if (preset) {
      applyTheme(preset);
    }
  }

  function customizeColor(colorKey: keyof Theme["colors"], hexValue: string) {
    const updatedTheme: Theme = {
      id: "custom",
      name: "Custom",
      colors: {
        ...currentTheme.colors,
        [colorKey]: hexValue,
      },
    };

    // Only apply to CSS, don't save to DB yet
    const root = document.documentElement;
    root.style.setProperty("--background", updatedTheme.colors.background);
    root.style.setProperty("--foreground", updatedTheme.colors.foreground);
    root.style.setProperty("--accent", updatedTheme.colors.accent);
    root.style.setProperty("--board-background", updatedTheme.colors.boardBackground);
    root.style.setProperty("--tile-background", updatedTheme.colors.tileBackground);
    root.style.setProperty("--tile-text", updatedTheme.colors.tileText);
    root.style.setProperty("--tile-border", updatedTheme.colors.tileBorder);
    root.style.setProperty("--card-background", updatedTheme.colors.cardBackground);
    root.style.setProperty("--card-border", updatedTheme.colors.cardBorder);

    setCurrentTheme(updatedTheme);
  }

  async function saveTheme() {
    // Always save to localStorage as a fallback
    try {
      localStorage.setItem("trivia_masters_theme", JSON.stringify(currentTheme));
    } catch (err) {
      console.warn("Could not save to localStorage:", err);
    }

    if (user) {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("game_settings")
          .upsert(
            { user_id: user.id, theme_colors: currentTheme.colors },
            { onConflict: "user_id" }
          );

        if (error?.code === "42703") {
          console.info(
            "💡 Theme saved locally! To persist across devices, apply the database migration.\n" +
            "   Run: supabase-theme-settings-migration.sql in Supabase SQL Editor"
          );
          // Still return success because localStorage save worked
          return { success: true, localOnly: true };
        } else if (error) {
          console.warn("Theme save issue (saved locally):", error.message || error);
          // Still return success because localStorage save worked
          return { success: true, localOnly: true };
        } else {
          console.log("✅ Theme saved to database!");
          return { success: true };
        }
      } catch (err) {
        // localStorage save succeeded, so still return success
        return { success: true, localOnly: true };
      }
    }

    // Not logged in but localStorage save worked
    return { success: true, localOnly: true };
  }

  return {
    currentTheme,
    loading,
    presets: PRESET_THEMES,
    selectPreset,
    customizeColor,
    applyTheme,
    saveTheme,
  };
}
