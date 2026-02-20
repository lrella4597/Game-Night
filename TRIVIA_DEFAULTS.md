# Trivia Free-for-All: Default Board & Categories

## How Defaults Work

When a new user opens Trivia Free-for-All for the first time, two things happen automatically:

### 1. Default Categories (Database Trigger)

On sign-up, a Supabase trigger (`seed_default_categories`) inserts 6 categories into the user's `category_library`:

| Category | Description |
|----------|-------------|
| SCIENCE | Physics, chemistry, biology, astronomy |
| HISTORY | World history, wars, civilizations |
| POP CULTURE | Movies, TV, music, games |
| GEOGRAPHY | Countries, capitals, landmarks |
| SPORTS | Pro sports, athletes, records |
| FOOD & DRINK | Cooking, cuisines, beverages |

Each category includes a prompt template, difficulty guidance, answer format guidance, and example Q&A pairs used for AI question generation.

**Where defined:** `app/data/categoryLibrary.ts` (`DEFAULT_LIBRARY` export)

### 2. Default Board (Client-Side Auto-Init)

When the Play tab loads and finds no board with `is_current = true`, the `useBoards` hook (`lib/data/useBoards.ts`) automatically creates a starter board:

- 6 columns matching the 6 default categories
- 5 rows of pre-written questions per category (100-500 points)
- Each column's `categoryLibraryId` is linked to the user's actual category_library UUID

**Where defined:** `app/data/boardData.ts` (`DEFAULT_BOARD_STATE` export)

## How to Change Defaults

### Change default categories
Edit `app/data/categoryLibrary.ts` — update the `DEFAULT_LIBRARY` array. Also update the `seed_default_categories()` trigger in Supabase to match.

### Change default board questions
Edit `app/data/boardData.ts` — update the `DEFAULT_BOARD_STATE` constant. Each column's `title` must match a category name for the auto-linking to work.

### Add more default categories
1. Add to `DEFAULT_LIBRARY` in `app/data/categoryLibrary.ts`
2. Add matching column to `DEFAULT_BOARD_STATE` in `app/data/boardData.ts`
3. Update the `seed_default_categories()` trigger in Supabase

## Data Flow

```
User signs up
  -> Supabase trigger inserts 6 categories into category_library
  -> User opens Trivia Free-for-All
  -> useBoards hook queries boards table
  -> No current board found
  -> ensureDefaultBoard() runs:
     1. Fetches user's category_library
     2. Clones DEFAULT_BOARD_STATE
     3. Links each column to the real category UUID by name match
     4. Inserts as is_current=true board
  -> Play tab renders with 6 categories and 30 questions
```

## Idempotency

- The board auto-init only runs when no `is_current = true` board exists
- A ref guard (`initRef`) prevents double-creation from React strict mode
- The trigger `seed_default_categories` only fires on user creation (AFTER INSERT on auth.users)
- The backfill SQL only inserts categories for users with zero existing categories
