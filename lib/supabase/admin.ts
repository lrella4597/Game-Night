import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only database client with full access (the service role key).
// Used by API routes for anything players do, so the database itself can
// refuse direct access to secret data (roles, missions, profiles) from
// browsers. Never import this from client components.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>;
let cached: AnyClient | null = null;

export function adminClient(): AnyClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  if (!cached) {
    cached = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/**
 * The client to read and write game data with: the admin client when the
 * service role key is configured, otherwise the given (signed-in user's)
 * client. Auth checks must still use the user's own client.
 */
export function dataClient(fallback: AnyClient): AnyClient {
  return adminClient() ?? fallback;
}

export function hasAdminKey(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
