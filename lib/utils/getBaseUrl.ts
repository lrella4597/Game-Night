/**
 * Returns the application's base URL (no trailing slash).
 *
 * Server-side priority:
 *   1. NEXT_PUBLIC_SITE_URL  (explicitly configured by deployer)
 *   2. VERCEL_URL            (auto-set by Vercel — needs https:// prefix)
 *   3. http://localhost:3000  (local dev fallback)
 *
 * Client-side: always uses window.location.origin (the actual domain the
 * user is on), which is correct in every environment.
 */
export function getBaseUrl(): string {
  // Client — always trust the browser's actual origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server — explicit env var first
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }

  // Vercel auto-injects VERCEL_URL (without protocol)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local dev fallback
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
