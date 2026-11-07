// Long structured chat responses must complete within Netlify's synchronous
// function window. Keep clue generation on Sonnet in its existing routes.
export const LONG_FORM_CHAT_MODEL = "claude-haiku-4-5-20251001";

// Customize Today pack pieces (18 parallel calls). Quality is the priority:
// compared on a real host request, Opus 5.5 at medium effort wrote clearly the
// sharpest, most tailored missions (Haiku repeated itself; Sonnet and Opus at
// low effort were good but flatter). All pieces took ~18s, well inside the
// hosting limit (measured: 28s requests complete on Netlify).
// Opus 5.5 can't turn thinking off; effort controls depth.
export const PACK_PART_MODEL = "claude-opus-5-5";
export const PACK_PART_EFFORT = "medium" as const;
