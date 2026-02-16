export interface PlayerAnswer {
  questionId: string;
  questionText: string;
  categoryName: string;
  correct: boolean;
  pointsEarned: number; // Share of the points (e.g., 150 if 2 players split 300)
  timestamp: number;
  powerUpUsed?: string; // e.g., "doubleDown", "doubleDip", "phoneAFriend"
  gameSessionId?: string; // Track which game this was part of
}

export interface CategoryStats {
  categoryName: string;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  totalPoints: number;
  accuracy: number;
}

export interface PlayerStats {
  playerName: string;
  teamId: string;
  teamName: string;
  totalPoints: number;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsIncorrect: number;
  answers: PlayerAnswer[];
  highestSingleScore: number; // Biggest points earned on one question
  lowestSingleScore: number; // Biggest points lost on one question
  powerUpsUsed: {
    doubleDown: number;
    doubleDip: number;
    phoneAFriend: number;
  };
}

const STATS_KEY = "triviaMasters.playerStats.v1";

export function loadPlayerStats(): PlayerStats[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as PlayerStats[];
  } catch {
    return [];
  }
}

export function savePlayerStats(stats: PlayerStats[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordPlayerAnswer(
  playerName: string,
  teamId: string,
  teamName: string,
  questionId: string,
  questionText: string,
  categoryName: string,
  correct: boolean,
  pointsEarned: number,
  powerUpUsed?: string,
  gameSessionId?: string
): void {
  const stats = loadPlayerStats();

  // Find or create player stats
  let playerStat = stats.find((s) => s.playerName === playerName && s.teamId === teamId);

  if (!playerStat) {
    playerStat = {
      playerName,
      teamId,
      teamName,
      totalPoints: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      questionsIncorrect: 0,
      answers: [],
      highestSingleScore: 0,
      lowestSingleScore: 0,
      powerUpsUsed: {
        doubleDown: 0,
        doubleDip: 0,
        phoneAFriend: 0,
      },
    };
    stats.push(playerStat);
  }

  // Update stats
  playerStat.totalPoints += pointsEarned;
  playerStat.questionsAnswered += 1;
  if (correct) {
    playerStat.questionsCorrect += 1;
  } else {
    playerStat.questionsIncorrect += 1;
  }

  // Track highest/lowest scores
  if (pointsEarned > playerStat.highestSingleScore) {
    playerStat.highestSingleScore = pointsEarned;
  }
  if (pointsEarned < playerStat.lowestSingleScore) {
    playerStat.lowestSingleScore = pointsEarned;
  }

  // Track power-up usage
  if (powerUpUsed === "doubleDown") playerStat.powerUpsUsed.doubleDown += 1;
  if (powerUpUsed === "doubleDip") playerStat.powerUpsUsed.doubleDip += 1;
  if (powerUpUsed === "phoneAFriend") playerStat.powerUpsUsed.phoneAFriend += 1;

  // Add answer record
  playerStat.answers.push({
    questionId,
    questionText,
    categoryName,
    correct,
    pointsEarned,
    timestamp: Date.now(),
    powerUpUsed,
    gameSessionId,
  });

  // Update team name in case it changed
  playerStat.teamName = teamName;

  savePlayerStats(stats);
}

export function getPlayerStats(playerName: string, teamId: string): PlayerStats | null {
  const stats = loadPlayerStats();
  return stats.find((s) => s.playerName === playerName && s.teamId === teamId) || null;
}

export function getAllPlayerStats(): PlayerStats[] {
  return loadPlayerStats();
}

export function resetPlayerStats(): void {
  savePlayerStats([]);
}

export function resetTeamPlayerStats(teamId: string): void {
  const stats = loadPlayerStats();
  const filtered = stats.filter((s) => s.teamId !== teamId);
  savePlayerStats(filtered);
}

// ── Advanced metrics ──────────────────────────────────────────────────────────

export function getCategoryStats(playerStat: PlayerStats): CategoryStats[] {
  const categoryMap = new Map<string, CategoryStats>();

  playerStat.answers.forEach((answer) => {
    const existing = categoryMap.get(answer.categoryName);
    if (existing) {
      existing.questionsAnswered += 1;
      if (answer.correct) existing.questionsCorrect += 1;
      else existing.questionsIncorrect += 1;
      existing.totalPoints += answer.pointsEarned;
    } else {
      categoryMap.set(answer.categoryName, {
        categoryName: answer.categoryName,
        questionsAnswered: 1,
        questionsCorrect: answer.correct ? 1 : 0,
        questionsIncorrect: answer.correct ? 0 : 1,
        totalPoints: answer.pointsEarned,
        accuracy: 0,
      });
    }
  });

  // Calculate accuracy and return as array
  const categories = Array.from(categoryMap.values());
  categories.forEach((cat) => {
    cat.accuracy = cat.questionsAnswered > 0
      ? (cat.questionsCorrect / cat.questionsAnswered) * 100
      : 0;
  });

  return categories.sort((a, b) => b.accuracy - a.accuracy);
}

export function getAveragePointsPer10Questions(playerStat: PlayerStats): number {
  if (playerStat.questionsAnswered === 0) return 0;
  return (playerStat.totalPoints / playerStat.questionsAnswered) * 10;
}

export function getAccuracy(playerStat: PlayerStats): number {
  if (playerStat.questionsAnswered === 0) return 0;
  return (playerStat.questionsCorrect / playerStat.questionsAnswered) * 100;
}

export function getAveragePointsPerQuestion(playerStat: PlayerStats): number {
  if (playerStat.questionsAnswered === 0) return 0;
  return playerStat.totalPoints / playerStat.questionsAnswered;
}

export function getBestCategory(playerStat: PlayerStats): CategoryStats | null {
  const categories = getCategoryStats(playerStat);
  if (categories.length === 0) return null;
  // Best = highest accuracy with at least 2 questions
  const qualified = categories.filter((c) => c.questionsAnswered >= 2);
  if (qualified.length === 0) return categories[0];
  return qualified[0];
}

export function getWorstCategory(playerStat: PlayerStats): CategoryStats | null {
  const categories = getCategoryStats(playerStat);
  if (categories.length === 0) return null;
  // Worst = lowest accuracy with at least 2 questions
  const qualified = categories.filter((c) => c.questionsAnswered >= 2);
  if (qualified.length === 0) return categories[categories.length - 1];
  return qualified[qualified.length - 1];
}

export function getCurrentStreak(playerStat: PlayerStats): { type: "correct" | "incorrect" | "none"; count: number } {
  if (playerStat.answers.length === 0) return { type: "none", count: 0 };

  // Sort by timestamp (most recent first)
  const sorted = [...playerStat.answers].sort((a, b) => b.timestamp - a.timestamp);

  const firstAnswer = sorted[0];
  const streakType = firstAnswer.correct ? "correct" : "incorrect";
  let count = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].correct === firstAnswer.correct) {
      count++;
    } else {
      break;
    }
  }

  return { type: streakType, count };
}
