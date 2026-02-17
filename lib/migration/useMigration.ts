"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { migrateLocalStorage, hasLocalStorageData } from "./migrateLocalStorage";

export function useMigration() {
  const { user } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setMigrated(false);
      setMigrating(false);
      setError(null);
      return;
    }

    // Check if there's localStorage data to migrate
    if (!hasLocalStorageData()) {
      setMigrated(true);
      return;
    }

    // Run migration
    const runMigration = async () => {
      setMigrating(true);
      setError(null);

      try {
        const result = await migrateLocalStorage(user.id);

        if (result.success) {
          setMigrated(true);
          if (result.error !== "Already migrated") {
            console.log("Migration successful:", result.itemsMigrated);
          }
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
