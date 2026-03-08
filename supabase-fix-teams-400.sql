-- Fix 400 errors on team saves.
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times.

-- ── 1. Ensure teams table has correct schema ──────────────────────────────────
-- If the table is still the old schema (team_id TEXT pk), recreate it.
-- If it already has id UUID pk, this block is a no-op.

DO $$
BEGIN
  -- Check if old 'team_id' column exists (old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teams'
      AND column_name = 'team_id'
  ) THEN
    RAISE NOTICE 'Old schema detected (team_id column). Dropping and recreating teams table.';
    DROP TABLE public.teams CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.teams (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL DEFAULT '#3B82F6',
  score      INTEGER     NOT NULL DEFAULT 0,
  players    TEXT[]      NOT NULL DEFAULT '{}',
  power_ups  JSONB       NOT NULL DEFAULT '{"doubleDown": false, "doubleDip": false, "phoneAFriend": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_user ON teams(user_id);

-- ── 2. Enable RLS and set clean policies ─────────────────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on teams (clean slate)
DO $$
DECLARE
  pol TEXT;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'teams'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON teams', pol);
  END LOOP;
END $$;

-- Single clean FOR ALL policy
CREATE POLICY "teams_owner_all"
  ON teams FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Ensure migration_status table exists ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.migration_status (
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  migrated    BOOLEAN     DEFAULT false,
  migrated_at TIMESTAMPTZ,
  migration_data JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE migration_status ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol TEXT;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'migration_status'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON migration_status', pol);
  END LOOP;
END $$;

CREATE POLICY "migration_status_owner"
  ON migration_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Remove duplicate teams (keep newest per user+name combo) ───────────────
DELETE FROM public.teams
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, name
             ORDER BY created_at DESC
           ) AS rn
    FROM public.teams
  ) ranked
  WHERE rn > 1
);

-- ── 5. Mark migration complete for all users who have teams in DB ─────────────
-- This stops the migration loop for users whose localStorage still has old data.
INSERT INTO public.migration_status (user_id, migrated, migrated_at)
SELECT DISTINCT user_id, true, NOW()
FROM public.teams
ON CONFLICT (user_id) DO UPDATE
  SET migrated = true,
      migrated_at = COALESCE(migration_status.migrated_at, NOW());

-- Done
DO $$
BEGIN
  RAISE NOTICE 'Teams table fixed. Duplicate teams removed. Migration status set.';
  RAISE NOTICE 'Team count: %', (SELECT COUNT(*) FROM public.teams);
END $$;
