import type { CategoryLibraryItem } from "../data/categoryLibrary";

/**
 * Assembles a structured prompt string from all category fields.
 * This is the text sent to the AI provider (or the stub).
 */
export function assemblePrompt(
  category: CategoryLibraryItem,
  rowValues: number[]
): string {
  const sorted = [...rowValues].sort((a, b) => a - b);
  const parts: string[] = [];

  if (category.promptTemplate) {
    parts.push(category.promptTemplate);
  }

  if (category.difficultyGuidance) {
    parts.push(`Difficulty guidance: ${category.difficultyGuidance}`);
  }

  if (category.answerFormatGuidance) {
    parts.push(`Answer format: ${category.answerFormatGuidance}`);
  }

  if (category.examples) {
    parts.push(`Few-shot examples:\n${category.examples}`);
  }

  parts.push(
    `Generate one unique question per point value, ordered from easiest ($${sorted[0]}) to hardest ($${sorted[sorted.length - 1]}). Point values: ${sorted.join(", ")}.`
  );

  return parts.join("\n\n");
}
