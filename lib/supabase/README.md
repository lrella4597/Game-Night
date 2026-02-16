# Supabase Setup Instructions

## Phase 1: Database Setup (Complete This First!)

### Step 1: Create Supabase Project

1. **Go to** [supabase.com](https://supabase.com)
2. **Click** "Start your project" (or "New Project" if you have an account)
3. **Sign up** or sign in with GitHub
4. **Create a new project:**
   - Organization: Create or select one
   - Project name: `jeopardy-game` (or your choice)
   - Database Password: **Save this somewhere safe!**
   - Region: Choose closest to you
   - Pricing Plan: **Free** (perfect for this app)
5. **Wait** for project to provision (~2 minutes)

### Step 2: Get Your API Credentials

Once your project is ready:

1. **Go to** Project Settings (gear icon in sidebar)
2. **Click** "API" in the left menu
3. **Copy these values:**

   ```
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon public key: eyJhbGci...
   ```

### Step 3: Add Credentials to Your App

1. **Open** `.env.local` in your project root
2. **Add** these lines (replace with your actual values):

   ```bash
   # Existing
   ANTHROPIC_API_KEY=sk-ant-...

   # Add these NEW lines:
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   ```

3. **Save** the file

### Step 4: Run the Database Schema

1. **In Supabase Dashboard**, click "SQL Editor" in the left sidebar
2. **Click** "New query"
3. **Open** `lib/supabase/schema.sql` in your code editor
4. **Copy ALL the SQL** from that file
5. **Paste** it into the Supabase SQL Editor
6. **Click** "Run" button (bottom right)
7. **Wait** for completion (~10 seconds)
8. **Verify** you see the success message:
   ```
   ✅ Database schema created successfully!
      - 11 tables created with RLS enabled
      - All policies configured
      - Helper functions and triggers added
   ```

### Step 5: Verify Tables Were Created

1. **Click** "Table Editor" in left sidebar
2. **You should see** these 11 tables:
   - profiles
   - game_settings
   - teams
   - player_stats
   - player_answers
   - boards
   - board_shares
   - category_library
   - favorite_questions
   - factcheck_cache
   - migration_status

### Step 6: Restart Your Dev Server

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it to pick up the new .env.local variables
npm run dev
```

---

## ✅ Phase 1 Complete!

You're now ready for **Phase 2: Authentication Setup**.

The database is ready with:
- ✅ 11 tables with proper relationships
- ✅ Row Level Security (users can only see their own data)
- ✅ Sharing support for game boards
- ✅ Migration tracking
- ✅ Auto-expiring fact-check cache

---

## What's Next?

I'll implement **Phase 2** which includes:
- Auth context provider
- Login/signup UI
- User profile header
- Session management

Just let me know when you've completed the steps above and I'll continue with Phase 2!

---

## Troubleshooting

**Problem:** SQL errors when running schema
- **Solution:** Make sure you copied the ENTIRE schema.sql file
- Try running it again (it's safe to re-run)

**Problem:** Can't find .env.local file
- **Solution:** Create it in the root of `jeopardy-app/` folder
- It should be at the same level as `package.json`

**Problem:** Dev server not picking up env vars
- **Solution:** Make sure you fully stopped and restarted the server
- The .env.local file should NOT be committed to git (it's in .gitignore)
