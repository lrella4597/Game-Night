import type { MetadataRoute } from "next";

// Lets phones install the site as a home screen app. On iPhone this is also
// what unlocks push notifications (iOS only allows web push for installed apps).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/day-of-deception/play",
    name: "Day of Deception",
    short_name: "Deception",
    description: "All-day social deduction game",
    // Opens straight into the player's current game, or the join screen
    start_url: "/day-of-deception/play",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0D",
    theme_color: "#0A0A0D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
