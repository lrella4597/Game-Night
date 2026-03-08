import type { GenerationState } from "@/lib/data/useGenerationState";

export interface GenerationContext {
  category: string;
  categoryPrompt: string;
  difficulty: number; // 1-10 scale
  mode: "generate" | "refresh";
  state: GenerationState;
}

/**
 * Creates the comprehensive system prompt for clue generation
 * This prompt enforces novelty, learns from favorites, and avoids dislikes
 */
export function buildClueGenerationPrompt(context: GenerationContext): string {
  const {
    category,
    categoryPrompt,
    difficulty,
    mode,
    state,
  } = context;

  return `You are a Jeopardy clue generator.

Your job is to generate EXACTLY ONE high-quality Jeopardy-style clue and response
for the given CATEGORY and requested DIFFICULTY (1–10).

You must follow ALL rules below strictly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Output JSON ONLY.
- No extra commentary.
- No markdown.
- Generate exactly ONE clue.

The JSON must match this schema exactly:

{
  "category": "${category}",
  "difficulty_1_to_10": ${difficulty},
  "clue": "...",
  "response": "...",
  "topic_tags": ["...", "..."],
  "quality_check": {
    "no_repeat_violation": true,
    "fits_category": true,
    "fits_requested_difficulty": true,
    "unambiguous": true,
    "favorite_style_match": true
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${categoryPrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUESTED DIFFICULTY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIFFICULTY: ${difficulty} out of 10

Difficulty guidance:
- 1–2: very easy / near-instant recall for most people
- 3–4: easy / common knowledge, light inference
- 5–6: medium / requires thought or familiarity
- 7–8: hard / knowledgeable players get it; still fair from the clue
- 9–10: very hard / deep cut, but still solvable with a strong clue (not obscure-for-obscure's-sake)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODE: ${mode.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${mode === "refresh" ? `
REFRESH MODE ACTIVE (EXTRA STRICT)

The user is explicitly asking for something NEW.

In refresh mode:
- The new response MUST be different from anything in SEEN.answers
- The new clue MUST NOT be a paraphrase of anything in SEEN.clues
- The new idea MUST NOT be in the same micro-topic cluster as recently seen content

Micro-topic clusters include (treat these as "too similar"):
- Same franchise/universe/series
- Same main character/artist/creator
- Same historical event (or trivial variant)
- Same company/product line
- Same famous quote/scene/album/episode
- Same "default obvious answer" for the category

Refresh must feel like a totally new direction, not a rewrite.
` : `
GENERATE MODE

Generate a fresh, high-quality clue that follows all anti-repeat rules below.
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE MEMORY (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEEN.answers: ${JSON.stringify(state.seen_answers.slice(-200))}
SEEN.topics: ${JSON.stringify(state.seen_topics.slice(-200))}
SEEN.clues: ${JSON.stringify(state.seen_clues.slice(-100))}

FAVORITES: ${JSON.stringify(state.favorite_clues.slice(-10))}
DISLIKES: ${JSON.stringify(state.disliked_clues.slice(-20))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTI-REPEAT RULES (VERY IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST NOT generate anything that repeats prior content.

Do NOT reuse:
- Any response in SEEN.answers
- Any topic/entity in SEEN.topics
- Any clue too similar to SEEN.clues
- Any answer that is a synonym, alternate spelling, alias, or near-duplicate of a seen answer
- Any "same concept, different phrasing" version of a prior clue

If something is even borderline repetitive, discard it and choose another idea.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAVORITES TRAINING (STYLE LEARNING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${state.favorite_clues.length > 0 ? `
FAVORITES represent clues the user loved.

You must imitate the patterns found in FAVORITES, such as:
- Clever but fair wording
- Indirect clues (not obvious giveaways)
- One unique hook
- Fun, interesting answer choices
- Good difficulty calibration

Your generated clue should feel like it belongs next to FAVORITES.
` : `
No favorites yet. Generate high-quality, clever clues that could become favorites.
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISLIKES TRAINING (NEVER AGAIN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${state.disliked_clues.length > 0 ? `
DISLIKES represent clues the user rejected.

You MUST NOT generate:
- Any response appearing in DISLIKES
- Any topic/entity similar to DISLIKES
- Any clue style that matches disliked patterns
- Any "same answer, different clue" variants of disliked entries

Common disliked patterns include:
- Too easy
- Too obvious
- Repetitive / not meaningfully new on refresh
- Ambiguous answers
- Boring "default" trivia
` : `
No dislikes yet. Avoid obvious, boring, or ambiguous clues.
`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOVELTY + QUALITY ENFORCEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before writing the final clue, do this internally:

1. Brainstorm 10–15 possible responses that fit CATEGORY + requested difficulty
2. Remove anything conflicting with SEEN or DISLIKES (including near-duplicates)
3. Score remaining ideas by:
   - novelty vs recently seen content
   - fairness / solvability
   - favorite-style similarity
   - category fit
   - match to requested difficulty
4. Choose the single best option and write the clue.

If you cannot find something fresh, broaden laterally within the category instead of repeating.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE JEOPARDY REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. The clue must match the CATEGORY.
2. The clue must match the requested difficulty scale (1–10).
3. The clue must clearly point to ONE correct response.
4. Avoid vague trivia, overly broad answers, or multiple valid responses.
5. The response must be specific (person/place/thing/title) and "Jeopardy-clean."
6. The clue should be solvable from information in the clue itself (no missing context).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL CLUE WRITING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- The clue must be short, punchy, and Jeopardy-authentic.
- Avoid giveaways (e.g., "In this show/movie/book…" or "This singer…") unless difficulty is intentionally low.
- Prefer less-obvious but still fair answers.
- The response must be clean and exact (standard name/title).
- Provide 2–5 topic_tags that describe the answer at a useful level (not too broad).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOW GENERATE ONE FINAL JEOPARDY CLUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Difficulty mapping from point values to 1-10 scale.
 * Returns a fixed difficulty of 7 for all questions — hard but fair.
 */
export function pointValueToDifficulty(_pointValue: number): number {
  return 7;
}
