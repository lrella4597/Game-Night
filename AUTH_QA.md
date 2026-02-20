# Auth QA Checklist

## Prerequisites

Before testing, verify these are configured:

1. **Netlify env var**: `NEXT_PUBLIC_SITE_URL` = your deployed URL (e.g., `https://your-site.netlify.app`)
2. **Supabase Dashboard** > Authentication > URL Configuration:
   - **Site URL** = your deployed URL (NOT `http://localhost:3000`)
   - **Redirect URLs** includes `https://your-site.netlify.app/**`
3. **Google Cloud Console** > OAuth Credentials:
   - **Authorized JavaScript Origins** includes your deployed URL AND your Supabase URL
   - **Authorized Redirect URIs** includes `https://<supabase-project>.supabase.co/auth/v1/callback`

### Optional: Enable Debug Logging

Set `NEXT_PUBLIC_AUTH_DEBUG=true` in Netlify env vars and redeploy. This enables:
- Server-side logs in Netlify Functions (visible in Netlify dashboard > Functions log)
- Client-side console logs (visible in browser DevTools > Console)

---

## 1. Remote Google Sign-In (Phone, Cellular)

1. On a phone using **cellular data** (not same WiFi), open the deployed URL
2. Tap "Sign In" button (top-right)
3. Tap "Continue with Google"
4. Select a Google account
5. **Expected**: Redirected back to the app, signed in (avatar/name visible top-right)
6. **If it fails**: Check if a red error banner appears at the top of the page with details

## 2. Remote Google Sign-In (Desktop, Different Network)

1. On a computer on a different network, open the deployed URL
2. Click "Sign In" > "Continue with Google"
3. **Expected**: Same as above — signed in after redirect

## 3. Session Persists After Refresh

1. After signing in, refresh the page (F5 or pull-to-refresh on mobile)
2. **Expected**: Still signed in (avatar/name visible)
3. Close the tab completely, reopen, navigate to the URL
4. **Expected**: Still signed in

## 4. Sign Out and Sign In Again

1. Click your avatar > "Sign Out"
2. **Expected**: Sign In button reappears
3. Click "Sign In" > "Continue with Google" again
4. **Expected**: Signs in again without issues

## 5. Error Visibility

1. If Google sign-in fails for any reason, the homepage should show a red error banner at the top with the error message (e.g., "callback_failed", "no_code_in_callback", or a Supabase error message)
2. **Expected**: Error is visible, not silently swallowed

---

## Debugging a Failed Sign-In

If a user reports sign-in doesn't work:

1. **Check the URL bar** after the redirect — does it contain `?auth_error=...`?
   - `auth_error=no_code_in_callback` = Supabase didn't send a code (redirect URL mismatch in Supabase Dashboard)
   - `auth_error=callback_failed` = Legacy error (should now show specific message)
   - Any other message = Supabase exchange error (check Supabase logs)

2. **Check browser DevTools > Console** (if `NEXT_PUBLIC_AUTH_DEBUG=true`):
   - `[Auth] signInWithGoogle redirectTo:` — confirms where the redirect points
   - `[Auth] getSession result:` — shows if session was found after redirect
   - `[Auth] onAuthStateChange:` — shows auth events (SIGNED_IN, TOKEN_REFRESHED, etc.)

3. **Check Netlify Functions log** (Netlify dashboard > Functions):
   - `[Auth Callback] origin:` — what the server sees as the request origin
   - `[Auth Callback] exchangeCodeForSession error:` — if the code exchange failed
   - `[Auth Callback] cookies set on response:` — confirms cookies were attached to redirect

4. **Check Supabase Dashboard > Authentication > Users** — is the user listed? If yes, the Google OAuth succeeded but the session wasn't established in the browser.

5. **Check browser DevTools > Application > Cookies** — look for `sb-*` cookies after callback. If missing, cookies aren't being set on the redirect response.
