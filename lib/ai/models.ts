// Long structured chat responses must complete within Netlify's synchronous
// function window. Keep clue generation on Sonnet in its existing routes.
export const LONG_FORM_CHAT_MODEL = "claude-haiku-4-5-20251001";

// Customize Today pack pieces (many small parallel calls). Measured 3.5-5s
// for all pieces with thinking off at low effort, vs 7-10s on Haiku 4.5.
// Haiku 5.5 rejects non-default temperature and accepts thinking "disabled"
// only at effort high or below.
export const PACK_PART_MODEL = "claude-haiku-5-5";
