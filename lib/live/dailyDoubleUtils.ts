import type { DailyDoubleLocation } from "./types";

/**
 * Generate Daily Double locations for a round.
 * Round 1: 1 DD. Round 2 (Double Jeopardy): 2 DDs.
 * Weighted toward bottom 3 rows (higher-value clues).
 */
export function generateDailyDoubles(
  round: number,
  numCategories: number,
  numRows: number
): DailyDoubleLocation[] {
  const count = round === 1 ? 1 : 2;
  const locations: DailyDoubleLocation[] = [];
  const used = new Set<string>();

  while (locations.length < count) {
    const catIdx = Math.floor(Math.random() * numCategories);

    // Weight toward bottom rows: top rows get weight 1, bottom 3 get weight 3
    const weights = Array.from({ length: numRows }, (_, i) =>
      i >= numRows - 3 ? 3 : 1
    );
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let clueIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        clueIdx = i;
        break;
      }
    }

    const key = `${catIdx}-${clueIdx}`;
    if (!used.has(key)) {
      used.add(key);
      locations.push({ catIdx, clueIdx });
    }
  }

  return locations;
}

/**
 * Check if a given clue position is a Daily Double.
 */
export function isDailyDouble(
  catIdx: number,
  clueIdx: number,
  dailyDoubles: DailyDoubleLocation[]
): boolean {
  return dailyDoubles.some(
    (dd) => dd.catIdx === catIdx && dd.clueIdx === clueIdx
  );
}
