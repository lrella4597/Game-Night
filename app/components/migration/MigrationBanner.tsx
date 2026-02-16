"use client";

import { useMigration } from "@/lib/migration/useMigration";

export default function MigrationBanner() {
  const { migrating, migrated, error } = useMigration();

  // Don't show banner if not migrating and no error
  if (!migrating && !error) {
    return null;
  }

  if (error) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <div className="font-semibold">Migration Error</div>
              <div className="text-sm opacity-90">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (migrating) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-6 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="animate-spin h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <div>
              <div className="font-semibold">Migrating your data to the cloud...</div>
              <div className="text-sm opacity-90">
                Moving teams, boards, stats, and settings to Supabase
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
