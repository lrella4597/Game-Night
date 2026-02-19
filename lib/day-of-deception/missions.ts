export interface MissionTemplate {
  text: string;
  category: "social" | "conversational" | "sneaky";
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  // Social missions
  { text: "Give a genuine compliment to 3 different people within the next 15 minutes", category: "social" },
  { text: "Start a group conversation about a controversial topic (pineapple on pizza, etc.)", category: "social" },
  { text: "Convince someone to switch seats or positions with you", category: "social" },
  { text: "Get 3 people to agree with a completely made-up fact", category: "social" },
  { text: "Organize an impromptu group photo with at least 4 people", category: "social" },
  { text: "Get someone to tell you their most embarrassing story", category: "social" },
  { text: "Start a slow clap that at least 3 people join in on", category: "social" },

  // Conversational missions
  { text: "Casually use the word 'suspicious' in 3 separate conversations", category: "conversational" },
  { text: "Steer a conversation toward the topic of trust without anyone noticing", category: "conversational" },
  { text: "Get someone to say the word 'deceiver' without directly asking them to", category: "conversational" },
  { text: "Tell a story that is 90% true but has one key lie — see if anyone catches it", category: "conversational" },
  { text: "Whisper something to 2 different people to make others curious", category: "conversational" },
  { text: "Bring up a false rumor about what happened earlier and see who believes it", category: "conversational" },
  { text: "Ask 3 people who they think is suspicious and remember their answers", category: "conversational" },

  // Sneaky missions
  { text: "Move or hide someone's personal item (phone, drink) without them noticing for 5 minutes", category: "sneaky" },
  { text: "Get someone to leave the room/area on a made-up errand", category: "sneaky" },
  { text: "Secretly signal to your fellow deceiver(s) without anyone else noticing", category: "sneaky" },
  { text: "Blame someone else for something you did (harmless) and see if it sticks", category: "sneaky" },
  { text: "Pretend to receive a 'secret message' on your phone and act worried about it", category: "sneaky" },
  { text: "Point out suspicious behavior about a loyal player to cast doubt on them", category: "sneaky" },
];

export function getRandomMission(exclude?: string[]): MissionTemplate {
  const available = exclude
    ? MISSION_TEMPLATES.filter((m) => !exclude.includes(m.text))
    : MISSION_TEMPLATES;
  const pool = available.length > 0 ? available : MISSION_TEMPLATES;
  return pool[Math.floor(Math.random() * pool.length)];
}
