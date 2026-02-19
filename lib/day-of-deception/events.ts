export interface EventTemplate {
  name: string;
  instructions: string;
  durationMinutes: number;
  deceiverSecretMission?: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    name: "Two Truths and a Lie",
    instructions: "Each person shares three statements about themselves — two true, one false. The group guesses which is the lie.",
    durationMinutes: 15,
    deceiverSecretMission: "Make sure your lie is extremely believable — practice your deception skills.",
  },
  {
    name: "The Trust Circle",
    instructions: "Go around the group. Each person says who they trust the most and why. No defensiveness allowed!",
    durationMinutes: 10,
    deceiverSecretMission: "Name a loyal player as the person you trust least to plant seeds of doubt.",
  },
  {
    name: "Speed Alibi",
    instructions: "Pair up randomly. You have 2 minutes to create a fake alibi for where you both were last night. The group votes on the most convincing pair.",
    durationMinutes: 12,
    deceiverSecretMission: "Try to pair with a loyal player and subtly make them look suspicious.",
  },
  {
    name: "The Interrogation",
    instructions: "One volunteer sits in the hot seat. The group has 3 minutes to ask them anything. The hot seat player must answer truthfully (or try to get away with a lie).",
    durationMinutes: 15,
    deceiverSecretMission: "Volunteer for the hot seat or ask leading questions to deflect attention.",
  },
  {
    name: "Secret Ballot",
    instructions: "Everyone writes down anonymously who they think is a deceiver and why. The host reads them aloud (without revealing authors).",
    durationMinutes: 8,
    deceiverSecretMission: "Write a convincing accusation against an innocent loyal player.",
  },
  {
    name: "The Alliance",
    instructions: "Form groups of 3. Each group must agree on one person outside their group who seems suspicious. Present your case to everyone.",
    durationMinutes: 12,
    deceiverSecretMission: "Guide your group to suspect a loyal player.",
  },
  {
    name: "Desert Island",
    instructions: "If you were stranded on a desert island, which 3 people in this room would you bring? Go around and share — patterns might reveal something.",
    durationMinutes: 10,
  },
  {
    name: "Observation Challenge",
    instructions: "Everyone closes their eyes. The host asks questions about the room and other players. Who's the most observant?",
    durationMinutes: 8,
    deceiverSecretMission: "Try to be the most 'observant' person to build trust with the group.",
  },
  {
    name: "Story Chain",
    instructions: "Create a story together — each person adds one sentence. The catch: the story must be about a group of friends with a secret among them.",
    durationMinutes: 10,
    deceiverSecretMission: "Steer the story to make a loyal player's character seem suspicious.",
  },
  {
    name: "The Debate",
    instructions: "The host picks a silly topic (e.g., 'Is cereal a soup?'). Two teams debate. The group votes on the winner.",
    durationMinutes: 10,
    deceiverSecretMission: "Be the loudest, most charismatic debater to gain social capital.",
  },
  {
    name: "Mafia Mind Games",
    instructions: "Everyone stands in a circle. Look someone in the eye for 5 seconds. Then everyone simultaneously points at who they think is a deceiver.",
    durationMinutes: 5,
    deceiverSecretMission: "Point at a loyal player who seems nervous.",
  },
  {
    name: "Compliment Circle",
    instructions: "Go around and give a genuine compliment to the person on your left. Then share one thing you find suspicious about the person on your right.",
    durationMinutes: 10,
    deceiverSecretMission: "Use your 'suspicious' comment to plant real doubt about a loyal player.",
  },
  {
    name: "Body Language Detective",
    instructions: "Everyone takes turns making a statement like 'I am loyal.' The group tries to spot deception through body language.",
    durationMinutes: 12,
    deceiverSecretMission: "Practice your poker face — deliver your lie with absolute confidence.",
  },
  {
    name: "The Negotiator",
    instructions: "Each person gets a fictional scenario to negotiate (e.g., 'Convince the group to let you be team captain'). Best negotiator wins group respect.",
    durationMinutes: 12,
  },
  {
    name: "Whisper Network",
    instructions: "The host whispers a secret to one player. It must pass through every player via whisper. How much did it change? Discuss what this reveals about trust.",
    durationMinutes: 8,
    deceiverSecretMission: "Intentionally change the message when it reaches you to cause confusion.",
  },
];

export function getRandomEvent(exclude?: string[]): EventTemplate {
  const available = exclude
    ? EVENT_TEMPLATES.filter((e) => !exclude.includes(e.name))
    : EVENT_TEMPLATES;
  const pool = available.length > 0 ? available : EVENT_TEMPLATES;
  return pool[Math.floor(Math.random() * pool.length)];
}
