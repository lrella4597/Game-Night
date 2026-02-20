# Deployment Environment Variables & Configuration

## Environment Variables

### Required (`.env.local` or hosting provider dashboard)

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abc123.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Anthropic API key (server-side only) |

### Required for Production

| Variable | Example | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | **Full production URL** (no trailing slash). Used for OAuth redirects and auth callbacks. If omitted, falls back to `VERCEL_URL` on Vercel, or `localhost:3000` locally. |

> **This is the variable that fixes the "localhost redirect" bug for remote users.**

### Auto-Provided (Vercel)

| Variable | Set By | Description |
|---|---|---|
| `VERCEL_URL` | Vercel | Auto-injected deployment URL (no protocol). Used as fallback if `NEXT_PUBLIC_SITE_URL` is not set. |

---

## Supabase Dashboard Settings

Go to: **Supabase Dashboard > Authentication > URL Configuration**

### Site URL
Set this to your production URL:
```
https://your-app.vercel.app
```

### Redirect URLs
Add **all** of these (one per line):
```
https://your-app.vercel.app/**
http://localhost:3000/**
```

If you have custom domains, add them too:
```
https://your-custom-domain.com/**
```

> **Why this matters:** When a user clicks "Sign in with Google", Supabase receives a `redirectTo` URL from the client. Supabase validates it against the Redirect URLs allowlist. If the URL is not in the list, Supabase falls back to the **Site URL**. If Site URL is still `http://localhost:3000`, remote users get redirected to localhost after Google sign-in.

---

## Google Cloud Console Settings

Go to: **Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client ID**

### Authorized JavaScript Origins
```
https://your-app.vercel.app
https://abc123.supabase.co
http://localhost:3000
```

### Authorized Redirect URIs
```
https://abc123.supabase.co/auth/v1/callback
```

> The redirect URI points to **Supabase**, not your app directly. Supabase handles the OAuth callback and then redirects to your app's `/auth/callback` route.

---

## Deployment Checklist

1. Set `NEXT_PUBLIC_SITE_URL` in your hosting provider's environment variables
2. Update Supabase Dashboard > Authentication > URL Configuration:
   - Site URL = your production URL
   - Redirect URLs includes your production URL with `/**` wildcard
3. Update Google Cloud Console OAuth credentials:
   - Authorized JavaScript Origins includes your production URL and Supabase URL
   - Authorized Redirect URIs includes `https://<your-supabase-url>/auth/v1/callback`
4. Redeploy after changing environment variables
5. Test Google sign-in from a device that is NOT on your local network
