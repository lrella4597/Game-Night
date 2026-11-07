-- ============================================================================
-- Push notifications: store each player's phone subscription
-- ============================================================================
-- The app saves a row here when a player taps "Allow" for notifications,
-- and the server reads it to send game alerts (roles, events, missions).
-- This table was never created, so notifications could not be delivered.
--
-- Run once in Supabase: SQL Editor > New query > paste > Run.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL,
  session_id UUID NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'day-of-deception',
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, session_id)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_session_idx
  ON push_subscriptions (session_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Same access model as the other Day of Deception tables (server routes use
-- the public key). An endpoint is useless without the server's private key.
DROP POLICY IF EXISTS "Anyone can read push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Anyone can insert push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete push_subscriptions" ON push_subscriptions;
CREATE POLICY "Anyone can read push_subscriptions" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert push_subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update push_subscriptions" ON push_subscriptions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete push_subscriptions" ON push_subscriptions FOR DELETE USING (true);

-- Make the new table visible to the API right away
NOTIFY pgrst, 'reload schema';
