self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "Game Night", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "game-notification",
      renotify: true,
      silent: false,
      data: { url: data.url || "/day-of-deception/play" },
    })
  );
});

// Tapping a notification brings the player back into their game.
// /day-of-deception/play forwards to the game this phone last joined.
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/day-of-deception/play";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
