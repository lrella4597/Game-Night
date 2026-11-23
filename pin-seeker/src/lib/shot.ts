import { dist, pathInfo, pathLength, pointAlong, surfaceAt, type Hole, type Surface, type Vec } from "./course.ts";

/** Within this many yards of the pin: one putt. */
export const ONE_PUTT_R = 2.5;
/** Within this many yards: two putts. Anywhere else on the green: three. */
export const TWO_PUTT_R = 7.5;
/** |accuracy error| at or under this is a pure strike. */
export const PURE_WINDOW = 2.5;
/** Power meter overshoot ceiling (1 = exactly the aimed distance). */
export const MAX_POWER = 1.15;

export type Lie = Surface;

export function maxDistance(lie: Lie): number {
  switch (lie) {
    case "tee":
    case "fairway":
      return 265;
    case "rough":
      return 215;
    case "bunker":
      return 140;
    default:
      return 60;
  }
}

export function clubFor(distance: number, lie: Lie): string {
  if (lie === "bunker") return distance > 60 ? "Gap wedge" : "Sand wedge";
  if (distance > 235 && lie === "tee") return "Driver";
  if (distance > 215) return "3 wood";
  if (distance > 190) return "Hybrid";
  if (distance > 170) return "5 iron";
  if (distance > 150) return "7 iron";
  if (distance > 125) return "9 iron";
  if (distance > 95) return "Pitching wedge";
  if (distance > 55) return "Gap wedge";
  return "Lob wedge";
}

/** A sensible default target: the pin if reachable, else the farthest point on the centerline in range. */
export function defaultAim(hole: Hole, ball: Vec, lie: Lie): Vec {
  const reach = maxDistance(lie);
  if (dist(ball, hole.pin) <= reach) return { ...hole.pin };
  const total = pathLength(hole.path);
  const start = pathInfo(ball, hole.path).along;
  let best = pointAlong(hole.path, Math.min(total, start + 40));
  for (let s = start; s <= total; s += 2) {
    const p = pointAlong(hole.path, s);
    if (dist(ball, p) <= reach * 0.92) best = p;
  }
  return best;
}

export function clampAim(ball: Vec, aim: Vec, lie: Lie): Vec {
  const reach = maxDistance(lie);
  const d = dist(ball, aim);
  if (d <= reach || d === 0) return aim;
  return { x: ball.x + ((aim.x - ball.x) / d) * reach, y: ball.y + ((aim.y - ball.y) / d) * reach };
}

export type ShotOutcome =
  | { kind: "rest"; at: Vec; surface: Surface }
  | { kind: "holed"; at: Vec }
  | { kind: "water"; at: Vec }
  | { kind: "out"; at: Vec };

export type ShotResult = {
  landing: Vec;
  /** Points the ball rolls through after landing (may be empty). */
  roll: Vec[];
  outcome: ShotOutcome;
  pure: boolean;
  carry: number;
};

export type SwingInput = {
  hole: Hole;
  ball: Vec;
  lie: Lie;
  aim: Vec;
  /** Fraction of the aimed distance, 0..MAX_POWER. */
  power: number;
  /** Signed accuracy error in meter percent. Positive = early (pulls left), negative = late (pushes right). */
  error: number;
};

function rollFraction(surface: Surface): number {
  switch (surface) {
    case "fairway":
    case "tee":
      return 0.11;
    case "green":
      return 0.06;
    case "rough":
      return 0.03;
    default:
      return 0;
  }
}

export function simulateShot({ hole, ball, lie, aim, power, error }: SwingInput): ShotResult {
  const aimDist = Math.max(1, dist(ball, aim));
  const dir = { x: (aim.x - ball.x) / aimDist, y: (aim.y - ball.y) / aimDist };
  const left = { x: -dir.y, y: dir.x };
  const pure = Math.abs(error) <= PURE_WINDOW;

  const lieFactor = lie === "rough" ? 0.93 : lie === "bunker" ? 0.86 : 1;
  const mishit = pure ? 1 : 1 - Math.min(0.3, (Math.abs(error) - PURE_WINDOW) * 0.014);
  const carry = aimDist * Math.max(0.05, Math.min(MAX_POWER, power)) * lieFactor * mishit;

  // Pull/push grows with distance; wind drifts the ball in flight.
  const lateral = pure ? 0 : error * 0.0085 * carry;
  const windScale = carry / 250;
  const landing = {
    x: ball.x + dir.x * carry + left.x * lateral + hole.wind.x * 1.2 * windScale,
    y: ball.y + dir.y * carry + left.y * lateral + hole.wind.y * 1.2 * windScale,
  };

  if (dist(landing, hole.pin) <= 0.55) {
    return { landing, roll: [], outcome: { kind: "holed", at: { ...hole.pin } }, pure, carry };
  }

  const landSurface = surfaceAt(hole, landing);
  if (landSurface === "water") return { landing, roll: [], outcome: { kind: "water", at: landing }, pure, carry };
  if (landSurface === "trees") return { landing, roll: [], outcome: { kind: "out", at: landing }, pure, carry };

  let remaining = carry * rollFraction(landSurface) * Math.max(0.35, Math.min(1, carry / 150)) * (pure ? 1.75 : 1);
  const flight = { x: landing.x - ball.x, y: landing.y - ball.y };
  const fl = Math.hypot(flight.x, flight.y) || 1;
  const rdir = { x: flight.x / fl, y: flight.y / fl };

  const roll: Vec[] = [];
  let pos = { ...landing };
  const STEP = 0.5;
  while (remaining > 0) {
    pos = { x: pos.x + rdir.x * STEP, y: pos.y + rdir.y * STEP };
    remaining -= STEP;
    roll.push(pos);
    const s = surfaceAt(hole, pos);
    const toPin = dist(pos, hole.pin);
    if (toPin <= 0.45 || (toPin <= 0.75 && remaining < 7)) {
      roll.push({ ...hole.pin });
      return { landing, roll, outcome: { kind: "holed", at: { ...hole.pin } }, pure, carry };
    }
    if (s === "water") return { landing, roll, outcome: { kind: "water", at: pos }, pure, carry };
    if (s === "trees") return { landing, roll, outcome: { kind: "out", at: pos }, pure, carry };
    if (s === "bunker") break;
    if (s === "rough") remaining -= STEP * 2.5;
  }
  return { landing, roll, outcome: { kind: "rest", at: pos, surface: surfaceAt(hole, pos) }, pure, carry };
}

export function puttsFor(hole: Hole, at: Vec): 1 | 2 | 3 {
  const d = dist(at, hole.pin);
  if (d <= ONE_PUTT_R) return 1;
  if (d <= TWO_PUTT_R) return 2;
  return 3;
}

export function scoreName(strokes: number, par: number): string {
  if (strokes === 1) return "Hole in one!";
  const diff = strokes - par;
  if (diff <= -3) return "Albatross!";
  if (diff === -2) return "Eagle!";
  if (diff === -1) return "Birdie";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double bogey";
  return `+${diff}`;
}

export function formatToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

export function parseToPar(s: string | null): number | null {
  if (s == null) return null;
  const t = s.trim().replace("−", "-");
  if (t.toUpperCase() === "E") return 0;
  const n = Number(t);
  return Number.isInteger(n) && Math.abs(n) <= 60 ? n : null;
}
