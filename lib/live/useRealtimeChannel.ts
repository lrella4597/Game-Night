"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getChannelName } from "./channelEvents";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  [key: string]: Array<{
    id: string;
    name: string;
    isHost: boolean;
    presence_ref: string;
  }>;
}

interface UseRealtimeChannelOptions {
  sessionId: string;
  userId: string;
  userName: string;
  isHost: boolean;
  channelName?: string;
}

export function useRealtimeChannel({
  sessionId,
  userId,
  userName,
  isHost,
  channelName: channelNameOverride,
}: UseRealtimeChannelOptions) {
  const [connected, setConnected] = useState(false);
  const [presenceState, setPresenceState] = useState<PresenceState>({});
  // Incrementing this forces the channel effect to re-run (reconnect)
  const [reconnectKey, setReconnectKey] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listenersRef = useRef<Map<string, Set<(payload: unknown) => void>>>(new Map());
  const supabase = createClient();

  // On iOS Safari the WebSocket dies when the user switches apps.
  // Reconnect automatically when the tab/page comes back into view.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        setReconnectKey((k) => k + 1);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (!sessionId || !userId) return;

    const channelName = channelNameOverride ?? getChannelName(sessionId);
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: userId } },
    });

    // Track presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as unknown as PresenceState;
      setPresenceState({ ...state });
    });

    // Listen for broadcast events
    channel.on("broadcast", { event: "*" }, ({ event, payload }: { event: string; payload: unknown }) => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        listeners.forEach((cb) => cb(payload));
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        await channel.track({
          id: userId,
          name: userName,
          isHost,
        });
      } else {
        setConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
    };
  }, [sessionId, userId, userName, isHost, supabase, reconnectKey]);

  const broadcast = useCallback((event: string, payload: unknown) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event,
        payload,
      });
    }
  }, []);

  const onBroadcast = useCallback((event: string, callback: (payload: unknown) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // Return cleanup function
    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  return {
    connected,
    presenceState,
    broadcast,
    onBroadcast,
    channel: channelRef.current,
  };
}
