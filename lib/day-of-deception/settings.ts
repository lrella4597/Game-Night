import type { EventPackItem, MissionPackItem } from "@/lib/chat/types";

// Where the game is being played. The host picks one in the lobby and it
// decides which missions and events the game uses, so Traitors are never
// asked to do something the place makes impossible.
//
//   home:  everyone together with time to gather (the original lists)
//   out:   a bar, a restaurant, around town
//   event: a wedding or big party, with lots of people who aren't playing.
//          Everything is quick, quiet and done in passing.
export type GameSetting = "home" | "out" | "event";

export interface SettingInfo {
  key: GameSetting;
  label: string;
  blurb: string;
  /** Told to the Customize Today AI so it writes for the same place */
  aiHint: string;
}

export const GAME_SETTINGS: SettingInfo[] = [
  {
    key: "home",
    label: "At home",
    blurb: "House party or a trip. Everyone's together and can gather for events.",
    aiHint: "We're at home or staying somewhere together. Everyone can gather in one room for events.",
  },
  {
    key: "out",
    label: "Out and about",
    blurb: "Bar, restaurant, around town. Quick things you can do at a table.",
    aiHint:
      "We're out in public (bar, restaurant, around town). Missions and events must work at a table or on the move, take under 5 minutes and need no props.",
  },
  {
    key: "event",
    label: "Big event",
    blurb: "Wedding or big party. Easy, quiet things done in passing.",
    aiHint:
      "We're at a big event like a wedding, with lots of people who aren't playing. Missions must be easy, take a minute or two, be done in passing and never disrupt the event. Events must take under 5 minutes and never need everyone gathered in a circle.",
  },
];

export function isGameSetting(value: unknown): value is GameSetting {
  return value === "home" || value === "out" || value === "event";
}

type M = [text: string, category: MissionPackItem["category"]];
type E = [name: string, instructions: string, minutes: number];

const OUT_MISSIONS: M[] = [
  ["Clink glasses with two other players", "social"],
  ["Get another player to swap seats with you", "social"],
  ["Get another player to try a bite or a sip of what you ordered", "social"],
  ["Take a photo with at least two other players", "social"],
  ["Get another player to hold your drink or your coat for a minute", "sneaky"],
  ["Get another player to walk somewhere with you: the bar, outside, anywhere", "sneaky"],
  ["Compliment another player loudly enough that a third player hears it", "social"],
  ["Get two players to agree with a fact you made up", "conversational"],
  ["Get another player to tell a story about the last time they were out", "conversational"],
  ["Say the word 'honestly' three times in one conversation with another player", "conversational"],
  ["Get another player to pick the next round, song or place", "social"],
  ["Ask two players who they think is acting strange today", "conversational"],
];

const OUT_EVENTS: E[] = [
  ["Category Countdown", "The host names a category (cereals, car brands). Go around the table. Blank or repeat and you're out. Last one in wins.", 5],
  ["Rock Paper Scissors Ladder", "Play the player next to you, one round. Winners play winners until one is left. They win.", 4],
  ["Photo Hunt", "The host names something nearby (a red hat, a dog, a neon sign). First to show the host a photo of it wins.", 4],
  ["Lightning Lie", "Everyone tells the table one thing about their week, true or made up. The table votes for the best liar. They win.", 5],
  ["Host Trivia", "The host asks three questions about themselves. First to two right answers wins.", 4],
  ["Closest Guess", "The host asks a number question (how many steps to the door?). Everyone guesses out loud. Closest wins.", 3],
];

const EVENT_MISSIONS: M[] = [
  ["Clink glasses with two other players", "social"],
  ["Get a photo with another player", "social"],
  ["Compliment another player's outfit so a third player hears it", "social"],
  ["Get another player to take a photo of you", "social"],
  ["Bring another player a drink or a snack they didn't ask for", "social"],
  ["Get another player onto the dance floor, even for ten seconds", "social"],
  ["High-five or fist-bump two other players", "social"],
  ["Get another player to show you a photo on their phone", "sneaky"],
  ["Point something out across the room so another player looks", "sneaky"],
  ["Stand or sit next to a player you haven't been near in the last ten minutes", "sneaky"],
  ["Ask another player what the best part of today has been", "conversational"],
  ["Say the word 'honestly' three times in one conversation with another player", "conversational"],
  ["Tell another player a made-up fact about the venue and see if they buy it", "conversational"],
  ["Ask another player who the best-dressed person here is", "conversational"],
];

const EVENT_EVENTS: E[] = [
  ["Photo Finish", "First player to show the host a selfie with two other players wins.", 5],
  ["Scavenger Snap", "The host names one thing in the room (a flower, a bow tie, something blue). First to show the host a photo of it wins.", 4],
  ["Find the Host", "The host goes somewhere in the venue. First player to find them and tap their shoulder wins.", 5],
  ["Rock Paper Scissors Ladder", "Play the nearest player, one round. Winners find other winners until one is left. They win.", 5],
  ["One Question", "The host asks one question about today or the people it's for. First right answer told to the host wins.", 3],
  ["Dance Floor Dash", "First player the host spots on the dance floor with another player wins.", 5],
  ["Closest Guess", "The host asks a number question (how many tables? how many candles?). Tell the host your guess. Closest wins.", 3],
];

/**
 * The built-in missions and events for a setting, in the same shape as a
 * Customize Today pack. "home" returns null: the game uses its original lists.
 */
export function settingPack(setting: GameSetting): { missions: MissionPackItem[]; events: EventPackItem[] } | null {
  if (setting === "home") return null;
  const [missions, events] = setting === "out" ? [OUT_MISSIONS, OUT_EVENTS] : [EVENT_MISSIONS, EVENT_EVENTS];
  return {
    missions: missions.map(([text, category], i) => ({
      id: `${setting}-m${i}`,
      text,
      category,
      riskLevel: "low",
      tags: [setting],
    })),
    events: events.map(([name, instructions, durationMinutes], i) => ({
      id: `${setting}-e${i}`,
      name,
      instructions,
      durationMinutes,
      tags: [setting],
    })),
  };
}
