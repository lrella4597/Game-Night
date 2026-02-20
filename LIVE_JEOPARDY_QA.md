# Live Jeopardy QA Test Plan

## Prerequisites
1. Run `supabase-live-companion-migration.sql` in Supabase SQL Editor
2. Deploy the latest build
3. Have at least 2 devices (computer for host, phone for player)

---

## 1. Session Resilience

### 1A. Player survives tab close
1. Host creates a game, player joins on phone
2. Host starts the game
3. Player closes the browser tab completely
4. Player reopens browser and navigates to the join page
5. **Expected**: Auto-rejoin detects active session, redirects player back to game with score intact

### 1B. Player survives phone lock
1. Player is in an active game
2. Lock the phone for 10+ seconds
3. Unlock and return to the browser
4. **Expected**: Yellow "Reconnecting..." banner appears briefly, then player rejoins seamlessly

### 1C. Player survives page refresh
1. Player is in an active game (buzzer_open phase)
2. Pull-to-refresh or hit browser refresh
3. **Expected**: Page reloads, player reconnects with current score and phase

### 1D. Mid-game rejoin by name
1. Host creates game, player "Alice" joins
2. Host starts the game
3. Alice clears browser data (simulating new device)
4. Alice goes to join page, enters same code and name "Alice"
5. **Expected**: Reconnects as existing player, retains score

### 1E. Stale session cleanup
1. Host creates game, player joins
2. Host ends the game (game_over)
3. Player navigates to join page
4. **Expected**: Auto-rejoin fails (session ended), stale localStorage cleaned, normal join form shown

---

## 2. Timer on Player Phones

### 2A. Timer appears during buzzer
1. Host selects a clue, then clicks "Open Buzzer"
2. **Expected on player phone**: Timer countdown visible above the buzz button
3. **Expected**: Timer matches host timer (within ~1 second)

### 2B. Timer stops on buzz-in
1. Player buzzes in while timer is running
2. **Expected**: Host timer stops, phase changes to answer_check
3. **Expected on player phone**: Timer disappears, shows "Waiting for host to judge..."

### 2C. Timer expiry
1. Let the buzzer timer run to 0 without anyone buzzing
2. **Expected**: Host auto-skips, returns to board_select
3. **Expected on player phone**: Phase transitions back to "Host is selecting a clue..."

---

## 3. Player Clue Display

### 3A. Clue text appears on player phone
1. Host selects a clue on the board
2. **Expected on player phone**: Category name, dollar value, and clue text are displayed
3. **Expected**: "Get ready to buzz!" indicator shows below clue

### 3B. Clue persists during buzzer
1. Host opens the buzzer
2. **Expected on player phone**: Clue text remains visible above the buzz button
3. **Expected**: Timer appears alongside the clue

### 3C. Clue clears on board return
1. Host judges answer (correct) or skips
2. **Expected on player phone**: Returns to "Host is selecting a clue..." (clue text cleared)

### 3D. Answer is NEVER shown to players
1. During clue_display, buzzer_open, and answer_check phases
2. **Expected**: Player phone shows only the clue (question), never the answer
3. Inspect network tab: CLUE_SELECT broadcast payload should NOT contain answer

---

## 4. Host Companion

### 4A. Companion QR access
1. Host creates and starts a game
2. Click "Phone Controls" button in top-right corner
3. **Expected**: QR code modal appears
4. Scan QR with phone
5. **Expected**: Companion page loads, shows "Host Companion" header

### 4B. Answer display on companion
1. Host selects a clue on the main screen
2. **Expected on companion**: Shows category, value, clue text, AND the answer in green
3. **Expected**: Answer appears within 1-2 seconds (fetched via secure API)

### 4C. Companion "Open Buzzer" button
1. Companion shows "Open Buzzer" button during clue_display phase
2. Tap "Open Buzzer" on companion
3. **Expected**: Host screen transitions to buzzer_open, timer starts, players can buzz

### 4D. Companion "Correct" / "Incorrect" buttons
1. A player buzzes in (answer_check phase)
2. **Expected on companion**: Shows answerer name + answer + Correct/Incorrect buttons
3. Tap "Correct"
4. **Expected**: Host screen awards points, returns to board_select

### 4E. Companion "Skip" button
1. During buzzer_open, no one buzzes
2. Tap "Skip / Time's Up" on companion
3. **Expected**: Host screen returns to board_select

### 4F. Companion Daily Double flow
1. Host selects a Daily Double clue
2. **Expected on companion**: Shows "Daily Double!", player name, wager, answer, "Show Clue" button
3. Tap "Show Clue" → companion shows Correct/Incorrect buttons
4. Tap "Correct" → returns to board

### 4G. Companion token security
1. Try accessing companion URL without token param
2. **Expected**: Error message "Missing session or token"
3. Try accessing with wrong token
4. **Expected**: Error message "Invalid or expired companion link"

### 4H. Companion stays synced
1. Play through several clues using companion controls
2. **Expected**: Companion phase indicator matches host at all times
3. Player scores update on companion after each judgment

---

## 5. Remote Join (Different Network)

### 5A. Join from cellular
1. Host creates game on WiFi
2. Player turns off WiFi, uses cellular data
3. Player scans QR code or enters join code
4. **Expected**: Player joins successfully (Supabase Realtime works over internet)

### 5B. Full game over cellular
1. Play a complete game with player on cellular
2. **Expected**: Buzzing, scoring, timer, clue display all work normally
3. **Expected**: Latency may be slightly higher but gameplay is functional

---

## 6. Regression Checks

### 6A. Normal game flow
1. Play a full game: lobby → clues → Daily Double → round 2 → Final Jeopardy → game over
2. **Expected**: All existing functionality works as before

### 6B. Multiple players
1. Join 3+ players from different devices
2. **Expected**: All players see clues, can buzz, scores update correctly

### 6C. Kick player
1. Host kicks a player during the game
2. **Expected**: Player is redirected to join page, localStorage cleaned
