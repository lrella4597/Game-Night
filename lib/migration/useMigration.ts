"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { migrateLocalStorageToSupabase } from "./migrateLocalStorage";

export function useMigration() {
  const { user } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMigrated(false);
      return;
    }

    // Check if there's localStorage data to migrate
    const hasLocalStorageData =
      localStorage.getItem("triviaMasters.gameSettings.v1") ||
      localStorage.getItem("triviaMasters.teams.v1") ||
      localStorage.getItem("triviaMasters.playerStats.v1") ||
      localStorage.getItem("TRIVIA_MASTERS_SAVED_BOARDS") ||
      localStorage.getItem("trivia-masters-board") ||
      localStorage.getItem("triviaMasters.categories.v1") ||
      localStorage.getItem("TRIVIA_MASTERS_FAVORITES") ||
      localStorage.getItem("TRIVIA_MASTERS_FACTCHECK_CACHE");

    if (!hasLocalStorageData) {
      setMigrated(true);
      return;
    }

    // Run migration
    const runMigration = async () => {
      setMigrating(true);
      setError(null);

      try {
        const result = await migrateLocalStorageToSupabase(user.id);

        if (result.success) {
          setMigrated(true);
          console.log("Migration successful:", result.itemsMigrated);
        } else {
          setError(result.error || "Migration failed");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred during migration");
      } finally {
        setMigrating(false);
      }
    };

    runMigration();
  }, [user]);

  return { migrating, migrated, error };
}
