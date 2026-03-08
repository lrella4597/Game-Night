import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:admin@gamenightapp.netlify.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
}

export async function sendPush(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    // 410 Gone means the subscription is no longer valid — ignore silently
    const status = (err as { statusCode?: number })?.statusCode;
    if (status !== 410) {
      console.error("Push send error:", err);
    }
  }
}

/** Send to all players in a session */
export async function sendPushToSession(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sessionId: string,
  payload: PushPayload
): Promise<void> {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("session_id", sessionId);

  if (!subs || subs.length === 0) return;
  await Promise.allSettled(subs.map((s: PushSubscriptionRecord) => sendPush(s, payload)));
}

/** Send to a single player */
export async function sendPushToPlayer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sessionId: string,
  playerId: string,
  payload: PushPayload
): Promise<void> {
  const { data: sub } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (!sub) return;
  await sendPush(sub as PushSubscriptionRecord, payload);
}
