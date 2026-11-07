import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dataClient } from "@/lib/supabase/admin";

// Checks that the request really comes from this player.
//
// Players who joined with an account (user_id set) must be signed in as that
// account. The old playerId:sessionId token is still required, but on its own
// it is easy to guess, so it is no longer enough for account-linked players.
export async function verifyPlayer(
  supabase: SupabaseClient,
  sessionId: string,
  playerId: string,
  token: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const fail = (error: string, status: number) => ({
    ok: false as const,
    response: NextResponse.json({ error }, { status }),
  });

  if (token !== `${playerId}:${sessionId}`) return fail("Invalid token", 403);

  // Data reads go through the admin client (when configured); the sign-in
  // check below must use the player's own client.
  const db = dataClient(supabase);

  let { data: player, error } = await db
    .from("traitors_day_players")
    .select("id, user_id")
    .eq("id", playerId)
    .eq("session_id", sessionId)
    .maybeSingle();

  // Database not migrated yet (no user_id column): fall back to the old check
  // rather than locking everyone out.
  if (error) {
    const fallback = await db
      .from("traitors_day_players")
      .select("id")
      .eq("id", playerId)
      .eq("session_id", sessionId)
      .maybeSingle();
    player = fallback.data ? { ...fallback.data, user_id: null } : null;
    error = fallback.error;
    if (error) return fail("Could not check player", 500);
  }

  // Kicked, or the game was reset
  if (!player) return fail("Player not in this game", 410);

  if (player.user_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Sign in to keep playing", 401);
    if (user.id !== player.user_id) return fail("This player belongs to another account", 403);
  }

  return { ok: true };
}
