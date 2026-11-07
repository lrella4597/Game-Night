// Long structured chat responses must complete within Netlify's synchronous
// function window. Keep clue generation on Sonnet in its existing routes.
export const LONG_FORM_CHAT_MODEL = "claude-haiku-4-5-20251001";

// Customize Today pack pieces (18 small parallel calls). Quality matters most
// here: Sonnet 5.5 was clearly funnier and more tailored than Haiku 5.5 (which
// repeated ideas) on a real host request. With thinking off and low effort all
// pieces finished in 5.5-5.8s, inside Netlify's ~10s limit.
// Sonnet 5.5 rejects non-default temperature; thinking "between_tools" turns
// thinking off and is accepted at effort high or below.
export const PACK_PART_MODEL = "claude-sonnet-5-5";
