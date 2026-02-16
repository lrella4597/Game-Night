import { createClient } from "@/lib/supabase/client";

interface MigrationResult {
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

export async function migrateLocalStorageToSupabase(userId: string): Promise<MigrationResult> {
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

    if (migrationStatus?.migrated) {
      result.success = true;
      return result;
    }

    // 1. Migrate Game Settings
    const gameSettingsData = localStorage.getItem("triviaMasters.gameSettings.v1");
    if (gameSettingsData) {
      try {
        const settings = JSON.parse(gameSettingsData);
        await supabase.from("game_settings").upsert({
          user_id: userId,
          mode: settings.mode || "manual",
          question_timer_seconds: settings.questionTimerSeconds || 45,
          steal_timer_seconds: settings.stealTimerSeconds || 10,
          point_mode: settings.pointMode || "classic",
          flat_point_value: settings.flatPointValue || 100,
        });
        result.itemsMigrated.gameSettings = true;
      } catch (e) {
        console.error("Error migrating game settings:", e);
      }
    }

    // 2. Migrate Teams
    const teamsData = localStorage.getItem("triviaMasters.teams.v1");
    if (teamsData) {
      try {
        const teams = JSON.parse(teamsData);
        for (const team of teams) {
          await supabase.from("teams").insert({
            user_id: userId,
            name: team.name,
            color: team.color,
            score: team.score || 0,
            players: team.players || [],
            power_ups: team.powerUps || { doubleDown: false, doubleDip: false, phoneAFriend: false },
          });
          result.itemsMigrated.teams++;
        }
      } catch (e) {
        console.error("Error migrating teams:", e);
      }
    }

    // 3. Migrate Player Stats
    const playerStatsData = localStorage.getItem("triviaMasters.playerStats.v1");
    if (playerStatsData) {
      try {
        const playerStats = JSON.parse(playerStatsData);
        for (const stat of playerStats) {
          // Insert player stat
          const { data: insertedStat } = await supabase
            .from("player_stats")
            .insert({
              user_id: userId,
              player_name: stat.playerName,
              team_id: stat.teamId,
              team_name: stat.teamName,
              total_points: stat.totalPoints || 0,
              questions_answered: stat.questionsAnswered || 0,
              questions_correct: stat.questionsCorrect || 0,
              questions_incorrect: stat.questionsIncorrect || 0,
              highest_single_score: stat.highestSingleScore || 0,
              lowest_single_score: stat.lowestSingleScore || 0,
              power_ups_used: stat.powerUpsUsed || { doubleDown: 0, doubleDip: 0, phoneAFriend: 0 },
            })
            .select()
            .single();

          if (insertedStat && stat.answers && stat.answers.length > 0) {
            // Insert player answers
            const answers = stat.answers.map((answer: any) => ({
              player_stat_id: insertedStat.id,
              user_id: userId,
              question_id: answer.questionId,
              question_text: answer.questionText,
              category_name: answer.categoryName,
              correct: answer.correct,
              points_earned: answer.pointsEarned || 0,
              timestamp: new Date(answer.timestamp).toISOString(),
              power_up_used: answer.powerUpUsed || null,
              game_session_id: answer.gameSessionId || null,
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
    const savedBoardsData = localStorage.getItem("TRIVIA_MASTERS_SAVED_BOARDS");
    if (savedBoardsData) {
      try {
        const savedBoards = JSON.parse(savedBoardsData);
        for (const board of savedBoards) {
          await supabase.from("boards").insert({
            user_id: userId,
            name: board.name,
            board_data: board,
            is_current: false,
          });
          result.itemsMigrated.savedBoards++;
        }
      } catch (e) {
        console.error("Error migrating saved boards:", e);
      }
    }

    // 5. Migrate Current Board
    const currentBoardData = localStorage.getItem("trivia-masters-board");
    if (currentBoardData) {
      try {
        const currentBoard = JSON.parse(currentBoardData);
        await supabase.from("boards").insert({
          user_id: userId,
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
    const categoriesData = localStorage.getItem("triviaMasters.categories.v1");
    if (categoriesData) {
      try {
        const categories = JSON.parse(categoriesData);
        for (const category of categories) {
          await supabase.from("category_library").insert({
            user_id: userId,
            name: category.name,
            prompt_template: category.promptTemplate || "",
            difficulty_guidance: category.difficultyGuidance || "",
            answer_format_guidance: category.answerFormatGuidance || "",
            examples: category.examples || "",
          });
          result.itemsMigrated.categoryLibrary++;
        }
      } catch (e) {
        console.error("Error migrating categories:", e);
      }
    }

    // 7. Migrate Favorites
    const favoritesData = localStorage.getItem("TRIVIA_MASTERS_FAVORITES");
    if (favoritesData) {
      try {
        const favorites = JSON.parse(favoritesData);
        for (const fav of favorites) {
          await supabase.from("favorite_questions").insert({
            user_id: userId,
            category_name: fav.categoryName,
            question: fav.question,
            answer: fav.answer,
            value: fav.value || 100,
          });
          result.itemsMigrated.favorites++;
        }
      } catch (e) {
        console.error("Error migrating favorites:", e);
      }
    }

    // 8. Migrate Fact-Check Cache (only non-expired)
    const factCheckData = localStorage.getItem("TRIVIA_MASTERS_FACTCHECK_CACHE");
    if (factCheckData) {
      try {
        const factChecks = JSON.parse(factCheckData);
        const now = Date.now();
        for (const check of factChecks) {
          // Only migrate if not expired (7 days)
          if (check.timestamp && now - check.timestamp < 7 * 24 * 60 * 60 * 1000) {
            await supabase.from("factcheck_cache").insert({
              user_id: userId,
              question: check.question,
              answer: check.answer,
              verdict: check.verdict,
              confidence: check.confidence || 0,
              explanation: check.explanation || "",
              supporting_facts: check.supportingFacts || [],
              common_confusions: check.commonConfusions || [],
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
      migrated: true,
      migrated_at: new Date().toISOString(),
      migration_data: result.itemsMigrated,
    });

    // Clear localStorage
    localStorage.removeItem("triviaMasters.gameSettings.v1");
    localStorage.removeItem("triviaMasters.teams.v1");
    localStorage.removeItem("triviaMasters.playerStats.v1");
    localStorage.removeItem("TRIVIA_MASTERS_SAVED_BOARDS");
    localStorage.removeItem("trivia-masters-board");
    localStorage.removeItem("triviaMasters.categories.v1");
    localStorage.removeItem("TRIVIA_MASTERS_FAVORITES");
    localStorage.removeItem("TRIVIA_MASTERS_FACTCHECK_CACHE");

    result.success = true;
    return result;
  } catch (error: any) {
    result.error = error.message;
    return result;
  }
}
