// Ball flight, bounce and roll. Units: yards and seconds. Pure logic, no DOM.
import {
  dist,
  heightAt,
  pathInfo,
  pathLength,
  pointAlong,
  pondAt,
  slopeAt,
  surfaceAt,
  windAt,
  type Hole,
  type Surface,
  type Tree,
  type Vec,
} from "./course.ts";

export type Vec3 = { x: number; y: number; z: number };

export const G = 10.73; // yd/s^2
const DRAG = 0.0032; // quadratic drag, 1/yd
const MPH = 0.4889 * 1.8; // yd/s per mph, exaggerated so wind matters
const DT = 1 / 120;
export const CUP_R = 0.1;
export const PURE_WINDOW = 2.5;
export const MAX_POWER = 1.15;
export const PUTT_MAX_POWER = 1.6;

export type Club = { name: string; short: string; max: number; loft: number };
export const CLUBS: Club[] = [
  { name: "Driver", short: "Dr", max: 268, loft: 14 },
  { name: "3 wood", short: "3W", max: 240, loft: 17 },
  { name: "Hybrid", short: "Hy", max: 215, loft: 20 },
  { name: "5 iron", short: "5i", max: 195, loft: 24 },
  { name: "7 iron", short: "7i", max: 170, loft: 29 },
  { name: "9 iron", short: "9i", max: 145, loft: 35 },
  { name: "Pitching wedge", short: "PW", max: 122, loft: 41 },
  { name: "Gap wedge", short: "GW", max: 98, loft: 47 },
  { name: "Sand wedge", short: "SW", max: 75, loft: 50 },
  { name: "Lob wedge", short: "LW", max: 50, loft: 52 },
];
export const PUTTER: Club = { name: "Putter", short: "Pt", max: 40, loft: 0 };

export function maxDistance(lie: Surface): number {
  switch (lie) {
    case "tee":
      return 268;
    case "fairway":
    case "fringe":
      return 240;
    case "rough":
      return 215;
    case "bunker":
      return 160;
    case "woods":
      return 150;
    default:
      return 60;
  }
}

/** How much of the full distance a lie gives you. */
export function lieFactor(lie: Surface): number {
  switch (lie) {
    case "rough":
      return 0.9;
    case "bunker":
      return 0.8;
    case "woods":
      return 0.72;
    default:
      return 1;
  }
}

export function clubFor(distance: number, lie: Surface): Club {
  const allowed = CLUBS.filter((c) => (c.name !== "Driver" || lie === "tee") && c.max <= maxDistance(lie) + 1);
  let pick = allowed[0];
  for (const c of allowed) if (c.max >= distance) pick = c;
  if (lie === "bunker" && distance < 60) return CLUBS[8];
  return pick;
}

export function isPuttLie(lie: Surface): boolean {
  return lie === "green";
}

// ---------- surfaces ----------

type SurfaceFeel = { restitution: number; retain: number; roll: number };
function feel(s: Surface): SurfaceFeel {
  switch (s) {
    case "green":
      return { restitution: 0.22, retain: 0.62, roll: 0.95 };
    case "fringe":
      return { restitution: 0.24, retain: 0.55, roll: 2.6 };
    case "fairway":
    case "tee":
      return { restitution: 0.28, retain: 0.55, roll: 4.2 };
    case "rough":
      return { restitution: 0.14, retain: 0.32, roll: 9 };
    case "woods":
      return { restitution: 0.18, retain: 0.35, roll: 10 };
    case "bunker":
      return { restitution: 0.03, retain: 0.12, roll: 14 };
    default:
      return { restitution: 0.25, retain: 0.6, roll: 3 };
  }
}

// ---------- trees ----------

const treeGrids = new WeakMap<Hole, Map<string, Tree[]>>();
function treesNear(hole: Hole, x: number, y: number): Tree[] {
  let grid = treeGrids.get(hole);
  if (!grid) {
    grid = new Map();
    for (const t of hole.trees) {
      const k = `${Math.floor(t.x / 20)},${Math.floor(t.y / 20)}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k)!.push(t);
    }
    treeGrids.set(hole, grid);
  }
  const gx = Math.floor(x / 20);
  const gy = Math.floor(y / 20);
  const out: Tree[] = [];
  for (let i = -1; i <= 1; i++)
    for (let j = -1; j <= 1; j++) {
      const c = grid.get(`${gx + i},${gy + j}`);
      if (c) out.push(...c);
    }
  return out;
}

// ---------- launch solver ----------

function carryFor(speed: number, loftDeg: number): number {
  const a = (loftDeg * Math.PI) / 180;
  let vx = speed * Math.cos(a);
  let vz = speed * Math.sin(a);
  let x = 0;
  let z = 0;
  for (let i = 0; i < 4000; i++) {
    const v = Math.hypot(vx, vz);
    vx += -DRAG * v * vx * DT;
    vz += (-G - DRAG * v * vz) * DT;
    x += vx * DT;
    z += vz * DT;
    if (z < 0 && vz < 0) return x;
  }
  return x;
}

const speedCache = new Map<string, number>();
/** Launch speed that carries `distance` on flat ground in still air. */
export function launchSpeed(distance: number, loftDeg: number): number {
  const key = `${loftDeg}|${Math.round(distance * 2)}`;
  const hit = speedCache.get(key);
  if (hit) return hit;
  let lo = 1;
  let hi = 250;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    if (carryFor(mid, loftDeg) < distance) lo = mid;
    else hi = mid;
  }
  speedCache.set(key, (lo + hi) / 2);
  return (lo + hi) / 2;
}

// ---------- simulation ----------

export type ShotEvent = { t: number; kind: "strike" | "bounce" | "tree" | "pin" | "lip" | "splash" | "cup" | "sand" };

export type Outcome =
  | { kind: "rest"; at: Vec3; surface: Surface }
  | { kind: "holed"; at: Vec3 }
  | { kind: "water"; at: Vec3; drop: Vec3 }
  | { kind: "ob"; at: Vec3 };

export type Trajectory = {
  frames: Vec3[]; // sampled at 60 fps
  landingIndex: number; // first ground contact frame
  events: ShotEvent[];
  outcome: Outcome;
  carry: number;
  total: number;
  pure: boolean;
};

export type Mods = { calm?: boolean; turbo?: boolean; magnet?: boolean };

export type SwingInput = {
  hole: Hole;
  start: Vec;
  lie: Surface;
  heading: number; // radians from +y toward +x
  distance: number; // aimed carry
  club: Club;
  power: number; // 1 = the aimed distance
  error: number; // meter percent; + early (pulls left), - late (pushes right)
  mods?: Mods;
  /** Random number source for lie flyers (defaults to Math.random). */
  rand?: () => number;
};

export const headingVec = (h: number): Vec => ({ x: Math.sin(h), y: Math.cos(h) });

function dropFromWater(hole: Hole, entry: Vec, from: Vec): Vec3 {
  const d = dist(entry, from) || 1;
  const ux = (from.x - entry.x) / d;
  const uy = (from.y - entry.y) / d;
  let p = { ...entry };
  for (let s = 0; s < d; s += 0.5) {
    p = { x: entry.x + ux * s, y: entry.y + uy * s };
    const sf = surfaceAt(hole, p);
    if (sf !== "water" && sf !== "bunker") {
      p = { x: p.x + ux * 2, y: p.y + uy * 2 };
      break;
    }
  }
  return { x: p.x, y: p.y, z: heightAt(hole, p.x, p.y) };
}

function finish(
  hole: Hole,
  frames: Vec3[],
  landingIndex: number,
  events: ShotEvent[],
  outcome: Outcome,
  start: Vec,
  pure: boolean,
): Trajectory {
  const land = frames[Math.max(0, landingIndex)] ?? frames[frames.length - 1];
  const end = frames[frames.length - 1];
  return {
    frames,
    landingIndex: landingIndex < 0 ? frames.length - 1 : landingIndex,
    events,
    outcome,
    carry: dist(start, land),
    total: dist(start, end),
    pure,
  };
}

type SimState = { x: number; y: number; z: number; vx: number; vy: number; vz: number };

/** Roll a ball along the ground until it stops, holes, or leaves play. */
function rollOut(
  hole: Hole,
  s: SimState,
  t0: number,
  frames: Vec3[],
  events: ShotEvent[],
  mods: Mods,
  rand: () => number,
  startStep: number,
): { outcome: Outcome; t: number } {
  let t = t0;
  let step = startStep;
  let lipped = false;
  const capture = mods.magnet ? CUP_R * 3.2 : CUP_R;
  const captureSpeed = mods.magnet ? 4 : 1.9;
  for (let i = 0; i < 120 * 40; i++) {
    const surf = surfaceAt(hole, s);
    if (surf === "water") {
      events.push({ t, kind: "splash" });
      return { outcome: { kind: "water", at: { x: s.x, y: s.y, z: s.z }, drop: { x: 0, y: 0, z: 0 } }, t };
    }
    if (surf === "ob") return { outcome: { kind: "ob", at: { x: s.x, y: s.y, z: s.z } }, t };
    const f = feel(surf);
    const sl = slopeAt(hole, s.x, s.y);
    const speed = Math.hypot(s.vx, s.vy);
    const ax = -(5 / 7) * G * sl.x;
    const ay = -(5 / 7) * G * sl.y;
    const slopeAcc = Math.hypot(ax, ay);

    const dPin = Math.hypot(s.x - hole.pin.x, s.y - hole.pin.y);
    if (dPin < capture) {
      if (speed < captureSpeed) {
        events.push({ t, kind: "cup" });
        frames.push({ x: hole.pin.x, y: hole.pin.y, z: heightAt(hole, hole.pin.x, hole.pin.y) - 0.1 });
        return { outcome: { kind: "holed", at: { x: hole.pin.x, y: hole.pin.y, z: s.z } }, t };
      }
      if (!lipped && dPin < CUP_R) {
        lipped = true;
        events.push({ t, kind: "lip" });
        const ang = (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.6);
        const c = Math.cos(ang);
        const sn = Math.sin(ang);
        const nvx = (s.vx * c - s.vy * sn) * 0.55;
        const nvy = (s.vx * sn + s.vy * c) * 0.55;
        s.vx = nvx;
        s.vy = nvy;
      }
    }

    if (speed < 0.06) {
      if (slopeAcc < f.roll * 1.15) {
        frames.push({ x: s.x, y: s.y, z: s.z });
        return { outcome: { kind: "rest", at: { x: s.x, y: s.y, z: s.z }, surface: surf }, t };
      }
      s.vx += ax * DT;
      s.vy += ay * DT;
    } else {
      const fr = Math.min(speed / DT, f.roll);
      s.vx += (ax - (s.vx / speed) * fr) * DT;
      s.vy += (ay - (s.vy / speed) * fr) * DT;
    }
    s.x += s.vx * DT;
    s.y += s.vy * DT;
    s.z = heightAt(hole, s.x, s.y);
    t += DT;
    step++;
    if (step % 2 === 0) frames.push({ x: s.x, y: s.y, z: s.z });
  }
  const surf = surfaceAt(hole, s);
  return { outcome: { kind: "rest", at: { x: s.x, y: s.y, z: s.z }, surface: surf }, t };
}

export function simulateShot(input: SwingInput): Trajectory {
  const { hole, start, lie, club, mods = {} } = input;
  const rand = input.rand ?? Math.random;
  let error = input.error;
  // Bad lies add a bit of unpredictability.
  if (lie === "rough") error += (rand() - 0.5) * 4;
  if (lie === "woods") error += (rand() - 0.5) * 9;
  if (lie === "bunker") error *= 1.4;
  const pure = Math.abs(input.error) <= PURE_WINDOW;
  if (pure) error = 0;

  const mishit = pure ? 1 : 1 - Math.min(0.28, (Math.abs(error) - PURE_WINDOW) * 0.013);
  const flyer = lie === "rough" ? 0.95 + rand() * 0.1 : 1;
  const power = Math.max(0.05, Math.min(MAX_POWER, input.power));
  const speedFactor = Math.sqrt(power * lieFactor(lie) * mishit * flyer * (mods.turbo ? 1.15 : 1));
  const speed = launchSpeed(input.distance, club.loft) * speedFactor;

  const heading = input.heading - error * 0.0035;
  const dir = headingVec(heading);
  const right = { x: dir.y, y: -dir.x };
  const loft = (club.loft * Math.PI) / 180;
  const s: SimState = {
    x: start.x,
    y: start.y,
    z: heightAt(hole, start.x, start.y) + 0.05,
    vx: dir.x * speed * Math.cos(loft),
    vy: dir.y * speed * Math.cos(loft),
    vz: speed * Math.sin(loft),
  };
  const side = -error * 0.17 * Math.min(1.1, speed / 75); // lateral accel, yd/s^2 (+ = right)
  const v0h = speed * Math.cos(loft) || 1;
  // Pure strikes carry less backspin and release further.
  const spinRetain = pure ? 0.1 : 0;
  const wedgeCheck = Math.max(0, (club.loft - 26) / 26) * 0.4;

  const frames: Vec3[] = [{ x: s.x, y: s.y, z: s.z }];
  const events: ShotEvent[] = [{ t: 0, kind: "strike" }];
  let t = 0;
  let step = 0;
  let landingIndex = -1;
  let bounces = 0;
  let pinHit = false;
  const hitTrees = new Set<Tree>();

  for (let i = 0; i < 120 * 20; i++) {
    const ground = heightAt(hole, s.x, s.y);
    const w = mods.calm ? { x: 0, y: 0 } : windAt(hole, s.x, s.y, s.z, ground);
    const rvx = s.vx - w.x * MPH;
    const rvy = s.vy - w.y * MPH;
    const rvz = s.vz;
    const rv = Math.hypot(rvx, rvy, rvz);
    const vh = Math.hypot(s.vx, s.vy);
    const sideScale = Math.min(1.2, vh / v0h);
    s.vx += (-DRAG * rv * rvx + right.x * side * sideScale) * DT;
    s.vy += (-DRAG * rv * rvy + right.y * side * sideScale) * DT;
    s.vz += (-G - DRAG * rv * rvz) * DT;
    s.x += s.vx * DT;
    s.y += s.vy * DT;
    s.z += s.vz * DT;
    t += DT;
    step++;
    if (step % 2 === 0) frames.push({ x: s.x, y: s.y, z: s.z });

    // Trees: canopy smothers the ball, trunk knocks it back.
    for (const tr of treesNear(hole, s.x, s.y)) {
      if (hitTrees.has(tr)) continue;
      const tg = heightAt(hole, tr.x, tr.y);
      const dh = Math.hypot(s.x - tr.x, s.y - tr.y);
      const cz = tg + tr.h * (tr.kind === "pine" ? 0.5 : 0.62);
      const canopyHalf = tr.kind === "pine" ? tr.h * 0.42 : tr.r * 0.9;
      const rAtZ = tr.kind === "pine" ? tr.r * Math.max(0, 1 - (s.z - (tg + tr.h * 0.18)) / (tr.h * 0.85)) : tr.r;
      if (Math.abs(s.z - cz) < canopyHalf && dh < rAtZ) {
        hitTrees.add(tr);
        events.push({ t, kind: "tree" });
        s.vx = s.vx * 0.12 + (rand() - 0.5) * 4;
        s.vy = s.vy * 0.12 + (rand() - 0.5) * 4;
        s.vz = -Math.abs(s.vz) * 0.2;
      } else if (dh < 0.45 && s.z - tg < tr.h * 0.3) {
        hitTrees.add(tr);
        events.push({ t, kind: "tree" });
        s.vx *= -0.4;
        s.vy *= -0.4;
      }
    }

    // Flagstick and dunks.
    const dPin = Math.hypot(s.x - hole.pin.x, s.y - hole.pin.y);
    const pinGround = heightAt(hole, hole.pin.x, hole.pin.y);
    if (!pinHit && dPin < 0.09 && s.z - pinGround < 2.4 && s.z - pinGround > 0.15) {
      pinHit = true;
      events.push({ t, kind: "pin" });
      s.vx *= -0.15;
      s.vy *= -0.15;
    }
    if (dPin < CUP_R * (mods.magnet ? 3.2 : 1.2) && s.z - pinGround < 0.15 && s.vz < 0) {
      events.push({ t, kind: "cup" });
      frames.push({ x: hole.pin.x, y: hole.pin.y, z: pinGround - 0.1 });
      return finish(hole, frames, landingIndex < 0 ? frames.length - 1 : landingIndex, events, { kind: "holed", at: { x: hole.pin.x, y: hole.pin.y, z: pinGround } }, start, pure);
    }

    const pond = pondAt(hole, s);
    if (pond && s.z <= pond.level) {
      events.push({ t, kind: "splash" });
      if (landingIndex < 0) landingIndex = frames.length - 1;
      const at = { x: s.x, y: s.y, z: pond.level };
      return finish(hole, frames, landingIndex, events, { kind: "water", at, drop: dropFromWater(hole, s, start) }, start, pure);
    }

    if (s.z <= ground) {
      if (landingIndex < 0) landingIndex = frames.length - 1;
      const surf = surfaceAt(hole, s);
      if (surf === "ob") return finish(hole, frames, landingIndex, events, { kind: "ob", at: { x: s.x, y: s.y, z: ground } }, start, pure);
      const f = feel(surf);
      if (surf === "bunker") events.push({ t, kind: "sand" });
      else events.push({ t, kind: "bounce" });
      // Reflect off the local surface normal.
      const sl = slopeAt(hole, s.x, s.y);
      const nl = Math.hypot(sl.x, sl.y, 1);
      const nx = -sl.x / nl;
      const ny = -sl.y / nl;
      const nz = 1 / nl;
      const vn = s.vx * nx + s.vy * ny + s.vz * nz;
      const retain = Math.max(0.05, f.retain + (bounces === 0 ? spinRetain - wedgeCheck : 0));
      const tx = s.vx - vn * nx;
      const ty = s.vy - vn * ny;
      const tz = s.vz - vn * nz;
      s.vx = tx * retain - vn * nx * f.restitution;
      s.vy = ty * retain - vn * ny * f.restitution;
      s.vz = tz * retain - vn * nz * f.restitution;
      s.z = ground + 0.001;
      bounces++;
      if (Math.abs(vn * f.restitution) < 1.3 || bounces > 6) break;
    }
  }

  const res = rollOut(hole, s, t, frames, events, mods, rand, step);
  let outcome = res.outcome;
  if (outcome.kind === "water") outcome = { ...outcome, drop: dropFromWater(hole, outcome.at, start) };
  return finish(hole, frames, landingIndex, events, outcome, start, pure);
}

export type PuttInput = {
  hole: Hole;
  start: Vec;
  heading: number;
  distance: number; // reference distance for 100%
  power: number; // 0..PUTT_MAX_POWER
  mods?: Mods;
  rand?: () => number;
};

/** Initial speed that rolls `distance` yards on a flat green and stops just past it. */
export function puttSpeed(distance: number): number {
  return Math.sqrt(2 * feel("green").roll * (distance + 0.35));
}

export function simulatePutt(input: PuttInput): Trajectory {
  const { hole, start, heading, mods = {} } = input;
  const rand = input.rand ?? Math.random;
  const speed = puttSpeed(input.distance) * Math.max(0.05, Math.min(PUTT_MAX_POWER, input.power));
  const dir = headingVec(heading);
  const s: SimState = { x: start.x, y: start.y, z: heightAt(hole, start.x, start.y), vx: dir.x * speed, vy: dir.y * speed, vz: 0 };
  const frames: Vec3[] = [{ x: s.x, y: s.y, z: s.z }];
  const events: ShotEvent[] = [{ t: 0, kind: "strike" }];
  const res = rollOut(hole, s, 0, frames, events, mods, rand, 0);
  let outcome = res.outcome;
  if (outcome.kind === "water") outcome = { ...outcome, drop: dropFromWater(hole, outcome.at, start) };
  return finish(hole, frames, 0, events, outcome, start, true);
}

/** A sensible default target for the next shot. */
export function defaultTarget(hole: Hole, ball: Vec, lie: Surface): { heading: number; distance: number } {
  const toPin = dist(ball, hole.pin);
  const head = (p: Vec) => Math.atan2(p.x - ball.x, p.y - ball.y);
  if (isPuttLie(lie)) return { heading: head(hole.pin), distance: toPin };
  const reach = maxDistance(lie) * lieFactor(lie);
  if (toPin <= reach) return { heading: head(hole.pin), distance: Math.max(5, toPin / lieFactor(lie)) };
  const total = pathLength(hole.path);
  const startAlong = pathInfo(ball, hole.path).along;
  let best = pointAlong(hole.path, Math.min(total, startAlong + 40));
  for (let s = startAlong; s <= total; s += 2) {
    const p = pointAlong(hole.path, s);
    if (dist(ball, p) <= reach * 0.95) best = p;
  }
  return { heading: head(best), distance: Math.min(maxDistance(lie), dist(ball, best) / lieFactor(lie)) };
}
