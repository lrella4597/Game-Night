-- ============================================================================
-- GOOGLE OAUTH MIGRATION
-- ============================================================================
-- Adds avatar_url to profiles and updates the auto-create trigger
-- to handle Google OAuth metadata (full_name, avatar_url, etc.)
-- ============================================================================

-- 1. Add avatar_url column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Update the handle_new_user trigger function to pull Google OAuth data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(
      EXCLUDED.display_name,
      public.profiles.display_name
    ),
    avatar_url = COALESCE(
      EXCLUDED.avatar_url,
      public.profiles.avatar_url
    ),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add INSERT policy for profiles (needed for the trigger)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- DONE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Google OAuth migration complete!';
  RAISE NOTICE '  - avatar_url column added to profiles';
  RAISE NOTICE '  - handle_new_user trigger updated for Google metadata';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Enable Google provider in Supabase Dashboard > Auth > Providers';
  RAISE NOTICE '  2. Add Google Client ID and Secret from Google Cloud Console';
  RAISE NOTICE '  3. Set redirect URL in Google Cloud Console';
END $$;
