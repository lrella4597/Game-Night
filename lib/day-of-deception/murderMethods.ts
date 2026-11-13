// Murder in plain sight: the Traitors do one of these to their victim in
// front of everyone, then tap who they got. Small enough to pass unnoticed,
// specific enough that a sharp Faithful can remember who did it.
export const MURDER_METHODS: string[] = [
  "Toss something (an apple, a coaster, a pen) to them and have them catch it",
  "Get them to give you a high five",
  "Hand them a drink or snack and have them take it",
  "Get them to take a photo with you",
  "Tap them on the shoulder twice",
  "Get them to say your name out loud",
  "Get them to hold something for you",
  "Get them to fist bump you",
  "Get them to try on something of yours (hat, glasses, jacket)",
  "Get them to pass you something from across the room",
  "Get them to clink glasses with you",
  "Get them to wink back at you",
  "Get them to show you something on their phone",
  "Get them to sit next to you for a full minute",
  "Get them to laugh at a joke you tell just to them",
];

export function randomMurderMethod(exclude?: string | null): string {
  const pool = MURDER_METHODS.filter((m) => m !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}
