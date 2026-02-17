import { createClient } from "@/lib/supabase/client";
import type { Team } from "@/app/data/teams";
import type { PlayerStats } from "@/app/data/playerStats";
import type { GameSettings } from "@/app/data/gameSettings";
import type { SavedBoard } from "@/app/data/savedBoards";
import type { BoardState } from "@/app/data/boardData";
import type { CategoryLibraryItem } from "@/app/data/categoryLibrary";
import type { FavoriteQuestion } from "@/app/data/favorites";

export interface MigrationResult {
  success: boolean;
  error?: string;
  itemsMigrated: {
    playerStats: number;
    teams: number;
    gameSettings: boolean;
    savedBoards: number;
    categoryLibrary: number;
    favorites: number;
    factCheckCache: number;
    currentBoard: boolean;
  };
}

const STORAGE_KEYS = {
  teams: "triviaMasters.teams.v1",
  playerStats: "triviaMasters.playerStats.v1",
  gameSettings: "triviaMasters.gameSettings.v1",
  savedBoards: "TRIVIA_MASTERS_SAVED_BOARDS",
  currentBoard: "trivia-masters-board",
  categoryLibrary: "triviaMasters.categories.v1",
  favorites: "TRIVIA_MASTERS_FAVORITES",
  factCheckCache: "TRIVIA_MASTERS_FACTCHECK_CACHE",
} as const;

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for fact-check cache

export async function migrateLocalStorage(userId: string): Promise<MigrationResult> {
  const supabase = createClient();

  const result: MigrationResult = {
    success: false,
    itemsMigrated: {
      playerStats: 0,
      teams: 0,
      gameSettings: false,
      savedBoards: 0,
      categoryLibrary: 0,
      favorites: 0,
      factCheckCache: 0,
      currentBoard: false,
    },
  };

  try {
    // Check if already migrated
    const { data: migrationStatus } = await supabase
      .from("migration_status")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (migrationStatus && migrationStatus.migrated_at) {
      result.success = true;
      result.error = "Already migrated";
      return result;
    }

    // 1. Migrate Game Settings
    const gameSettingsData = localStorage.getItem(STORAGE_KEYS.gameSettings);
    if (gameSettingsData) {
      try {
        const settings: GameSettings = JSON.parse(gameSettingsData);
        await supabase.from("game_settings").upsert({
          user_id: userId,
          mode: settings.mode,
          question_timer_seconds: settings.questionTimerSeconds,
          steal_timer_seconds: settings.stealTimerSeconds,
          point_mode: settings.pointMode,
          flat_point_value: settings.flatPointValue,
        });
        result.itemsMigrated.gameSettings = true;
      } catch (e) {
        console.error("Error migrating game settings:", e);
      }
    }

    // 2. Migrate Teams
    const teamsData = localStorage.getItem(STORAGE_KEYS.teams);
    if (teamsData) {
      try {
        const teams: Team[] = JSON.parse(teamsData);
        for (const team of teams) {
          await supabase.from("teams").insert({
            user_id: userId,
            team_id: team.id,
            name: team.name,
            color: team.color,
            score: team.score,
            players: team.players,
            power_ups: team.powerUps,
          });
          result.itemsMigrated.teams++;
        }
      } catch (e) {
        console.error("Error migrating teams:", e);
      }
    }

    // 3. Migrate Player Stats
    const playerStatsData = localStorage.getItem(STORAGE_KEYS.playerStats);
    if (playerStatsData) {
      try {
        const playerStats: PlayerStats[] = JSON.parse(playerStatsData);
        for (const stat of playerStats) {
          // Insert player stat
          const { data: insertedStat, error: statError } = await supabase
            .from("player_stats")
            .insert({
              user_id: userId,
              player_name: stat.playerName,
              team_id: stat.teamId,
              team_name: stat.teamName,
              total_points: stat.totalPoints,
              questions_answered: stat.questionsAnswered,
              questions_correct: stat.questionsCorrect,
              questions_incorrect: stat.questionsIncorrect,
              highest_single_score: stat.highestSingleScore,
              lowest_single_score: stat.lowestSingleScore,
              power_ups_used: stat.powerUpsUsed,
            })
            .select()
            .single();

          if (statError) {
            console.error("Error inserting player_stats:", statError);
            continue;
          }

          if (insertedStat && stat.answers && stat.answers.length > 0) {
            // Insert player answers
            const answers = stat.answers.map((answer) => ({
              player_stat_id: insertedStat.id,
              user_id: userId,
              question_id: answer.questionId,
              question_text: answer.questionText,
              category_name: answer.categoryName,
              correct: answer.correct,
              points_earned: answer.pointsEarned,
              timestamp: new Date(answer.timestamp).toISOString(),
              power_up_used: answer.powerUpUsed,
              game_session_id: answer.gameSessionId,
            }));

            await supabase.from("player_answers").insert(answers);
          }

          result.itemsMigrated.playerStats++;
        }
      } catch (e) {
        console.error("Error migrating player stats:", e);
      }
    }

    // 4. Migrate Saved Boards
    const savedBoardsData = localStorage.getItem(STORAGE_KEYS.savedBoards);
    if (savedBoardsData) {
      try {
        const savedBoards: SavedBoard[] = JSON.parse(savedBoardsData);
        for (const board of savedBoards) {
          await supabase.from("boards").insert({
            user_id: userId,
            board_id: board.id,
            name: board.name,
            board_data: board.board,
            is_current: false,
            created_at: new Date(board.createdAt).toISOString(),
            updated_at: new Date(board.updatedAt).toISOString(),
          });
          result.itemsMigrated.savedBoards++;
        }
      } catch (e) {
        console.error("Error migrating saved boards:", e);
      }
    }

    // 5. Migrate Current Board
    const currentBoardData = localStorage.getItem(STORAGE_KEYS.currentBoard);
    if (currentBoardData) {
      try {
        const currentBoard: BoardState = JSON.parse(currentBoardData);
        await supabase.from("boards").insert({
          user_id: userId,
          board_id: `current-${Date.now()}`,
          name: "Current Board",
          board_data: currentBoard,
          is_current: true,
        });
        result.itemsMigrated.currentBoard = true;
      } catch (e) {
        console.error("Error migrating current board:", e);
      }
    }

    // 6. Migrate Category Library
    const categoriesData = localStorage.getItem(STORAGE_KEYS.categoryLibrary);
    if (categoriesData) {
      try {
        const categories: CategoryLibraryItem[] = JSON.parse(categoriesData);
        for (const category of categories) {
          await supabase.from("category_library").insert({
            user_id: userId,
            category_id: category.id,
            name: category.name,
            prompt_template: category.promptTemplate,
            difficulty_guidance: category.difficultyGuidance,
            answer_format_guidance: category.answerFormatGuidance,
            examples: category.examples,
            origin: "classic",
            created_at: new Date(category.createdAt || Date.now()).toISOString(),
          });
          result.itemsMigrated.categoryLibrary++;
        }
      } catch (e) {
        console.error("Error migrating categories:", e);
      }
    }

    // 7. Migrate Favorites
    const favoritesData = localStorage.getItem(STORAGE_KEYS.favorites);
    if (favoritesData) {
      try {
        const favorites: FavoriteQuestion[] = JSON.parse(favoritesData);
        for (const fav of favorites) {
          await supabase.from("favorite_questions").insert({
            user_id: userId,
            favorite_id: fav.id,
            category_name: fav.categoryName,
            question: fav.question,
            answer: fav.answer,
            value: fav.value,
            saved_at: new Date(fav.savedAt).toISOString(),
          });
          result.itemsMigrated.favorites++;
        }
      } catch (e) {
        console.error("Error migrating favorites:", e);
      }
    }

    // 8. Migrate Fact-Check Cache (only non-expired)
    const factCheckData = localStorage.getItem(STORAGE_KEYS.factCheckCache);
    if (factCheckData) {
      try {
        const factChecks: Array<{
          key: string;
          result: {
            verdict: string;
            confidence: number;
            explanation: string;
            supporting_facts: string[];
            common_confusions?: string[];
          };
          cachedAt: number;
        }> = JSON.parse(factCheckData);
        const now = Date.now();

        for (const entry of factChecks) {
          // Only migrate if not expired (7 days)
          if (now - entry.cachedAt <= TTL_MS) {
            await supabase.from("factcheck_cache").insert({
              user_id: userId,
              cache_key: entry.key,
              verdict: entry.result.verdict,
              confidence: entry.result.confidence,
              explanation: entry.result.explanation,
              supporting_facts: entry.result.supporting_facts,
              common_confusions: entry.result.common_confusions || [],
              cached_at: new Date(entry.cachedAt).toISOString(),
            });
            result.itemsMigrated.factCheckCache++;
          }
        }
      } catch (e) {
        console.error("Error migrating fact-check cache:", e);
      }
    }

    // Mark migration as complete
    await supabase.from("migration_status").upsert({
      user_id: userId,
      migrated_at: new Date().toISOString(),
    });

    // Clear localStorage keys after successful migration
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    result.success = true;
    return result;
  } catch (error: any) {
    result.success = false;
    result.error = error.message || "Migration failed";
    return result;
  }
}

export function hasLocalStorageData(): boolean {
  if (typeof window === "undefined") return false;

  // Check if any of the storage keys have data
  return Object.values(STORAGE_KEYS).some((key) => {
    const value = localStorage.getItem(key);
    return value !== null && value !== "[]" && value !== "{}";
  });
}
