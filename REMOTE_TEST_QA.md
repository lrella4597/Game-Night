# Remote User QA Checklist

Test from a device on a **different network** (cellular data or different WiFi) to verify production deployment works for remote users.

---

## 1. Google OAuth Sign-In

### 1A. Remote Google sign-in
1. On a phone using cellular data (not same WiFi as the host), open the app URL
2. Tap "Sign in with Google"
3. Complete Google sign-in flow
4. **Expected**: Redirected back to the app on the production domain (NOT localhost)
5. **Expected**: User is signed in, can see their profile/dashboard

### 1B. Magic link sign-in
1. From a remote device, enter email and request a magic link
2. Open the magic link from the email
3. **Expected**: Opens the production domain, user is signed in

### 1C. Verify no localhost in redirect
1. Before signing in, open browser developer tools > Network tab
2. Sign in with Google
3. **Expected**: All redirects stay on the production domain or Supabase domain
4. **Expected**: No request to `localhost` or `127.0.0.1` anywhere in the flow

---

## 2. Live Jeopardy Remote Join

### 2A. Remote player join via code
1. Host creates a Live Jeopardy game on their computer
2. Remote player (different network) navigates to the app URL
3. Remote player enters the join code
4. **Expected**: Player joins the lobby successfully

### 2B. Remote player join via QR
1. Host shows the QR code on their screen
2. Remote player scans the QR code with their phone camera
3. **Expected**: QR code URL points to the production domain (not localhost)
4. **Expected**: Player lands on the join page, enters their name, joins the lobby

### 2C. Full remote game
1. Play through several clues with a remote player
2. **Expected**: Buzzer works, timer syncs, scores update
3. **Expected**: Clue text appears on player's phone
4. **Expected**: Latency is slightly higher but gameplay is functional

---

## 3. Day of Deception Remote Join

### 3A. Remote player join
1. Host creates a Day of Deception game
2. Remote player enters the join code from a different network
3. **Expected**: Player joins successfully

### 3B. QR code URL check
1. Inspect the QR code URL shown on the host's lobby screen
2. **Expected**: URL uses the production domain, not localhost or a local IP

---

## 4. Host Companion Remote Access

### 4A. Companion from cellular
1. Host creates and starts a Live Jeopardy game on their computer
2. Host scans the "Phone Controls" QR code with their phone (on cellular data)
3. **Expected**: Companion page loads, shows "Host Companion" header
4. **Expected**: Answer is visible, control buttons work

---

## 5. Environment Verification

### 5A. Check NEXT_PUBLIC_SITE_URL
1. In the hosting provider dashboard, verify `NEXT_PUBLIC_SITE_URL` is set to the production URL
2. **Expected**: Value matches the URL users visit (e.g., `https://your-app.vercel.app`)

### 5B. Supabase Redirect URLs
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. **Expected**: Site URL = production URL
3. **Expected**: Redirect URLs includes `https://your-app.vercel.app/**`

### 5C. Google Cloud Console
1. Go to Google Cloud Console > APIs & Services > Credentials
2. **Expected**: Authorized JavaScript Origins includes production URL
3. **Expected**: Authorized Redirect URIs includes Supabase callback URL
