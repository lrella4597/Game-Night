"use client";

import { useCallback, useEffect, useState } from "react";

interface UsePushNotificationsOptions {
  playerId: string;
  sessionId: string;
  gameType?: string;
}

export function usePushNotifications({
  playerId,
  sessionId,
  gameType = "day-of-deception",
}: UsePushNotificationsOptions) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  // iPhone Safari only allows web push once the site is added to the home screen
  const [needsInstall, setNeedsInstall] = useState(false);
  const [supported, setSupported] = useState(true);

  const saveSubscription = useCallback(
    async (sub: PushSubscription) => {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), playerId, sessionId, gameType }),
      });
    },
    [playerId, sessionId, gameType]
  );

  // On load: detect support, and if this phone already subscribed, re-link it
  // to this game so it keeps getting alerts after the app is reopened.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window) setPermission(Notification.permission);

    const hasPush = "serviceWorker" in navigator && "PushManager" in window;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!hasPush) {
      setSupported(false);
      setNeedsInstall(isIOS && !standalone);
      return;
    }

    if (!playerId || !sessionId) return;
    navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription())
      .then(async (sub) => {
        if (sub && Notification.permission === "granted") {
          setSubscribed(true);
          await saveSubscription(sub);
        }
      })
      .catch(() => {});
  }, [playerId, sessionId, saveSubscription]);

  async function subscribe() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        }));

      await saveSubscription(sub);
      setSubscribed(true);
    } catch (err) {
      console.error("Push subscription error:", err);
    }
  }

  return { permission, subscribed, subscribe, supported, needsInstall };
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}
