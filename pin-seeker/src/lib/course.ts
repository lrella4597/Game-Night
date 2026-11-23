// Pin Seeker course generation and terrain.
// Pure logic (no DOM). All distances in yards. +y runs from the tee toward the green,
// +x is to the right when standing on the tee, z is height.

export type Vec = { x: number; y: number };

export type Surface =
  | "tee"
  | "fairway"
  | "rough"
  | "fringe"
  | "green"
  | "bunker"
  | "water"
  | "woods"
  | "ob";

export type Circle = { x: number; y: number; r: number };
/** An organic shape built from overlapping circles. */
export type Blob = Circle[];
export type Pond = { circles: Blob; level: number };
export type Tree = { x: number; y: number; h: number; r: number; kind: "pine" | "oak" };
/** A band across the hole (between y0 and y1) where extra wind blows. */
export type Gust = { y0: number; y1: number; wind: Vec };

export type ThemeName = "parkland" | "links" | "autumn" | "desert";

export type Hole = {
  number: number;
  par: 3 | 4 | 5;
  length: number;
  seed: number;
  tee: Vec;
  pin: Vec;
  path: Vec[];
  fairwayStart: number;
  fairwayEnd: number;
  fairwayHalfWidth: number;
  corridorHalfWidth: number;
  greenRadius: number;
  teeHeight: number;
  greenHeight: number;
  noiseAmp: number;
  moundHeight: number;
  greenTilt: Vec; // height change per yard across the green
  greenBump: number;
  bunkers: Blob[];
  ponds: Pond[];
  trees: Tree[];
  wind: Vec; // mph, the direction the wind blows toward
  gusts: Gust[];
};

export type PowerCard = "laser" | "calm" | "turbo" | "magnet";

export type Course = {
  date: string;
  number: number;
  name: string;
  theme: ThemeName;
  card: PowerCard;
  holes: Hole[];
  par: number;
};

/** Land inside this many yards of the cup: one putt. */
export const ONE_PUTT_R = 2.5;
/** Share of the green radius covered by the 2-putt ring (0.75 = 56% of the area, so 3 putts on under half). */
export const TWO_PUTT_FRAC = 0.75;
export const twoPuttRadius = (hole: { greenRadius: number }) => hole.greenRadius * TWO_PUTT_FRAC;
/** Automatic putts for a ball at rest on the green. */
export function puttsFor(hole: { greenRadius: number; pin: Vec }, at: Vec): 1 | 2 | 3 {
  const d = Math.hypot(at.x - hole.pin.x, at.y - hole.pin.y);
  if (d <= ONE_PUTT_R) return 1;
  if (d <= hole.greenRadius * TWO_PUTT_FRAC) return 2;
  return 3;
}

/** Beyond the tree line by this much is out of bounds. */
export const OB_MARGIN = 45;

// ---------- seeded randomness ----------

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise in [-1, 1]. */
export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * 2 - 1;
}

// ---------- geometry ----------

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export function distToSegment(p: Vec, a: Vec, b: Vec): { d: number; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { d: Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)), t };
}

export function pathInfo(p: Vec, path: Vec[]): { d: number; along: number } {
  let best = { d: Infinity, along: 0 };
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = distToSegment(p, path[i], path[i + 1]);
    const segLen = dist(path[i], path[i + 1]);
    if (seg.d < best.d) best = { d: seg.d, along: acc + seg.t * segLen };
    acc += segLen;
  }
  return best;
}

export function pointAlong(path: Vec[], s: number): Vec {
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const segLen = dist(path[i], path[i + 1]);
    if (acc + segLen >= s) {
      const t = segLen === 0 ? 0 : (s - acc) / segLen;
      return { x: path[i].x + (path[i + 1].x - path[i].x) * t, y: path[i].y + (path[i + 1].y - path[i].y) * t };
    }
    acc += segLen;
  }
  return { ...path[path.length - 1] };
}

export function pathLength(path: Vec[]): number {
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) acc += dist(path[i], path[i + 1]);
  return acc;
}

export function inBlob(p: Vec, blob: Blob): boolean {
  for (const c of blob) if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 <= c.r * c.r) return true;
  return false;
}

export function pondAt(hole: Hole, p: Vec): Pond | null {
  for (const w of hole.ponds) if (inBlob(p, w.circles)) return w;
  return null;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- surfaces ----------

export function surfaceAt(hole: Hole, p: Vec): Surface {
  const dG = dist(p, hole.pin);
  if (dG <= hole.greenRadius) return "green";
  if (pondAt(hole, p)) return "water";
  for (const b of hole.bunkers) if (inBlob(p, b)) return "bunker";
  if (dG <= hole.greenRadius + 2.2) return "fringe";
  if (dist(p, hole.tee) <= 5) return "tee";
  const info = pathInfo(p, hole.path);
  const total = pathLength(hole.path);
  if (info.d > hole.corridorHalfWidth + OB_MARGIN || p.y < hole.tee.y - 30 || info.along > total + 55) return "ob";
  if (info.d > hole.corridorHalfWidth) return "woods";
  if (info.d <= hole.fairwayHalfWidth && info.along >= hole.fairwayStart && info.along <= hole.fairwayEnd) return "fairway";
  return "rough";
}

// ---------- terrain height ----------

/** Terrain before hazards and greens are shaped in. */
export function naturalHeight(hole: Hole, x: number, y: number): number {
  const p = { x, y };
  const info = pathInfo(p, hole.path);
  const total = pathLength(hole.path);
  const prog = Math.max(0, Math.min(1, info.along / total));
  const base = hole.teeHeight + (hole.greenHeight - hole.teeHeight) * smoothstep(0, 1, prog);
  const n =
    valueNoise(x / 70, y / 70, hole.seed) * hole.noiseAmp +
    valueNoise(x / 26 + 50, y / 26 + 50, hole.seed + 1) * hole.noiseAmp * 0.35;
  const fw = 0.55 + 0.45 * smoothstep(hole.fairwayHalfWidth - 6, hole.fairwayHalfWidth + 14, info.d);
  const mound = smoothstep(hole.corridorHalfWidth - 10, hole.corridorHalfWidth + 28, info.d) * hole.moundHeight;
  return base + n * fw + mound;
}

export function heightAt(hole: Hole, x: number, y: number): number {
  const p = { x, y };
  let h = naturalHeight(hole, x, y);

  // Raised tee box.
  const dT = dist(p, hole.tee);
  if (dT < 11) h += (hole.teeHeight + 0.6 - h) * (1 - smoothstep(5.5, 11, dT));

  // Green: a tilted plane with gentle swales, blended into the surrounds.
  const dG = dist(p, hole.pin);
  const R = hole.greenRadius;
  if (dG < R + 8) {
    const dx = x - hole.pin.x;
    const dy = y - hole.pin.y;
    const plane =
      hole.greenHeight +
      0.5 +
      hole.greenTilt.x * dx +
      hole.greenTilt.y * dy +
      valueNoise(x / 9 + 7, y / 9 + 7, hole.seed + 2) * hole.greenBump;
    h += (plane - h) * (1 - smoothstep(R + 1, R + 8, dG));
  }

  // Bunkers are bowls with a small lip.
  let dep = 0;
  for (const b of hole.bunkers)
    for (const c of b) {
      const t = Math.hypot(x - c.x, y - c.y) / c.r;
      if (t < 1.35) dep = Math.max(dep, 1.0 * (1 - smoothstep(0.55, 1.08, t)) - 0.25 * Math.max(0, 1 - Math.abs(t - 1.2) / 0.15));
    }
  h -= dep;

  // Ponds sit below their banks.
  for (const w of hole.ponds)
    for (const c of w.circles) {
      const t = Math.hypot(x - c.x, y - c.y) / c.r;
      if (t < 1) h = Math.min(h, w.level - 1.4 * (1 - t * t) - 0.1);
      else if (t < 1.45 && h > w.level) h = Math.min(h, w.level + 0.05 + ((t - 1) / 0.45) * (h - w.level));
    }
  return h;
}

export function slopeAt(hole: Hole, x: number, y: number): Vec {
  const e = 0.25;
  return {
    x: (heightAt(hole, x + e, y) - heightAt(hole, x - e, y)) / (2 * e),
    y: (heightAt(hole, x, y + e) - heightAt(hole, x, y - e)) / (2 * e),
  };
}

/** Wind (mph) at a point: base wind, stronger aloft, plus any gust band. */
export function windAt(hole: Hole, x: number, y: number, z: number, ground: number): Vec {
  const lift = 0.55 + 0.45 * Math.min(1, Math.max(0, z - ground) / 18);
  let wx = hole.wind.x * lift;
  let wy = hole.wind.y * lift;
  for (const g of hole.gusts) {
    const k = smoothstep(g.y0 - 6, g.y0 + 4, y) * (1 - smoothstep(g.y1 - 4, g.y1 + 6, y));
    wx += g.wind.x * k * lift;
    wy += g.wind.y * k * lift;
  }
  return { x: wx, y: wy };
}

// ---------- course generation ----------

const NAME_A = [
  "Ashbury", "Bramble", "Coldwater", "Driftwood", "Elmstead", "Foxhollow", "Glenmoor", "Heronsgate",
  "Ironbridge", "Juniper", "Kestrel", "Lantern", "Millbrook", "Northcliff", "Oakvale", "Pebbleford",
  "Quarry", "Ravensdale", "Saltmarsh", "Thornbury", "Upland", "Willowmere", "Yarrow", "Copperleaf",
  "Stonecrest", "Briar", "Maple", "Tidewater",
];
const NAME_B: Record<ThemeName, string[]> = {
  parkland: ["Park", "Commons", "Valley", "Meadows", "Glen", "Green"],
  links: ["Links", "Dunes", "Point", "Bluffs", "Reach", "Heath"],
  autumn: ["Hollow", "Ridge", "Forest", "Woods", "Falls", "Glen"],
  desert: ["Canyon", "Mesa", "Springs", "Wash", "Sands", "Ridge"],
};
const THEMES: ThemeName[] = ["parkland", "links", "autumn", "desert"];
const CARDS: PowerCard[] = ["laser", "calm", "turbo", "magnet"];
const PARS: (3 | 4 | 5)[] = [3, 3, 4, 4, 4, 4, 4, 5, 5];
const EPOCH = Date.UTC(2026, 0, 1);

export function roundNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1;
}

function generateHole(rand: () => number, number: number, par: 3 | 4 | 5, theme: ThemeName): Hole {
  const r = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const length = par === 3 ? r(140, 210) : par === 4 ? r(320, 430) : r(480, 550);
  const tee = { x: 0, y: 0 };
  let path: Vec[];
  if (par === 3) {
    path = [tee, { x: r(-1, 1) * length * 0.1, y: length }];
  } else {
    const bend = r(-1, 1) * length * 0.17;
    const mid = { x: bend, y: length * r(0.45, 0.62) };
    path = [tee, mid, { x: bend + r(-1, 1) * length * 0.1, y: length }];
  }
  const pin = { ...path[path.length - 1] };
  const total = pathLength(path);
  const greenRadius = r(12, 16);
  const fairwayHalfWidth = r(13, 19);
  const corridorHalfWidth = r(42, 56);
  const tiltAng = r(0, Math.PI * 2);
  const tiltMag = r(0.012, 0.032);

  const hole: Hole = {
    number,
    par,
    length: Math.round(total),
    seed: Math.floor(rand() * 1e9),
    tee,
    pin,
    path,
    fairwayStart: par === 3 ? total : r(95, 135),
    fairwayEnd: total - greenRadius - 3,
    fairwayHalfWidth,
    corridorHalfWidth,
    greenRadius,
    teeHeight: r(0, 7),
    greenHeight: r(-3, 6),
    noiseAmp: theme === "links" ? r(3, 5.5) : r(2, 4.2),
    moundHeight: r(3, 7),
    greenTilt: { x: Math.cos(tiltAng) * tiltMag, y: Math.sin(tiltAng) * tiltMag },
    greenBump: r(0.15, 0.45),
    bunkers: [],
    ponds: [],
    trees: [],
    wind: { x: 0, y: 0 },
    gusts: [],
  };

  const blob = (cx: number, cy: number, size: number, n: number): Blob => {
    const out: Blob = [{ x: cx, y: cy, r: size }];
    for (let i = 1; i < n; i++) {
      const a = r(0, Math.PI * 2);
      out.push({ x: cx + Math.cos(a) * size * 0.7, y: cy + Math.sin(a) * size * 0.55, r: size * r(0.5, 0.85) });
    }
    return out;
  };

  // Greenside bunkers, mostly on the approach side.
  const nGreen = 1 + Math.floor(rand() * 3);
  const used: number[] = [];
  for (let i = 0; i < nGreen; i++) {
    let ang = 0;
    for (let k = 0; k < 12; k++) {
      ang = Math.PI + r(-0.5, Math.PI + 0.5);
      if (used.every((u) => Math.abs(u - ang) > 0.9)) break;
    }
    used.push(ang);
    const size = r(3.5, 5.5);
    const d = greenRadius + size + 1.5;
    hole.bunkers.push(blob(pin.x + Math.cos(ang) * d, pin.y + Math.sin(ang) * d, size, 3));
  }
  // Fairway bunkers in the driving zone, and sometimes a cross bunker on par 5s.
  if (par !== 3) {
    const n = Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const c = pointAlong(path, Math.min(r(205, 260), total - 90));
      const side = rand() < 0.5 ? -1 : 1;
      hole.bunkers.push(blob(c.x + side * fairwayHalfWidth * r(0.6, 1.1), c.y, r(4, 6.5), 3));
    }
    if (par === 5 && rand() < 0.5) {
      const c = pointAlong(path, total - r(90, 120));
      hole.bunkers.push(blob(c.x + r(-6, 6), c.y, r(4, 5.5), 4));
    }
  }

  // Water.
  const roll = rand();
  const pondCenters: Circle[] = [];
  if (par === 3 && roll < 0.5) {
    const c = pointAlong(path, total - greenRadius - r(16, 26));
    pondCenters.push({ x: c.x + r(-6, 6), y: c.y, r: r(9, 14) });
  } else if (par !== 3 && roll < 0.55) {
    const c = pointAlong(path, r(170, Math.min(275, total - 100)));
    const side = rand() < 0.5 ? -1 : 1;
    const size = r(11, 17);
    pondCenters.push({ x: c.x + side * (fairwayHalfWidth + size * 0.4), y: c.y, r: size });
  }
  for (const pc of pondCenters) {
    const circles = blob(pc.x, pc.y, pc.r, 4).filter(
      (c) => dist(c, tee) > c.r + 18 && dist(c, pin) > c.r + greenRadius + 3,
    );
    if (circles.length) hole.ponds.push({ circles, level: 0 });
  }
  hole.bunkers = hole.bunkers.filter((b) => b.every((c) => dist(c, tee) > c.r + 12));

  // Water level: just under the lowest point of the bank.
  for (const w of hole.ponds) {
    let lo = Infinity;
    for (const c of w.circles)
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12)
        lo = Math.min(lo, naturalHeight(hole, c.x + Math.cos(a) * (c.r + 2), c.y + Math.sin(a) * (c.r + 2)));
    w.level = lo - 0.35;
  }

  // Woods on both sides, plus the odd tree standing in the rough.
  const pineShare = theme === "links" ? 0.5 : theme === "desert" ? 0.15 : theme === "autumn" ? 0.35 : 0.45;
  const density = theme === "desert" ? 0.35 : theme === "links" ? 0.5 : 1;
  for (let s = -25; s < total + 50; s += 7) {
    const c = pointAlong(path, Math.max(0, Math.min(total, s)));
    const yOff = s < 0 ? s : s > total ? s - total : 0;
    for (const side of [-1, 1]) {
      for (let row = 0; row < 5; row++) {
        if (rand() > density) continue;
        const off = hole.corridorHalfWidth + 2 + row * 9 + r(-3, 3);
        const kind = rand() < pineShare ? "pine" : "oak";
        hole.trees.push({
          x: c.x + side * off + r(-3, 3),
          y: c.y + yOff + r(-3, 3),
          h: kind === "pine" ? r(9, 15) : r(7, 11),
          r: kind === "pine" ? r(2.2, 3.4) : r(3, 4.8),
          kind,
        });
      }
    }
    // Behind the green.
    if (s > total + 15)
      for (let k = -4; k <= 4; k++)
        if (rand() < density)
          hole.trees.push({ x: c.x + k * 10 + r(-3, 3), y: c.y + yOff + r(-3, 3), h: r(8, 13), r: r(3, 4.5), kind: rand() < pineShare ? "pine" : "oak" });
  }
  if (par !== 3) {
    const n = Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const c = pointAlong(path, r(140, total - 60));
      const side = rand() < 0.5 ? -1 : 1;
      hole.trees.push({ x: c.x + side * r(fairwayHalfWidth + 8, corridorHalfWidth - 6), y: c.y, h: r(9, 13), r: r(3.5, 5), kind: "oak" });
    }
  }
  hole.trees = hole.trees.filter((t) => dist(t, pin) > greenRadius + 10 && dist(t, tee) > 14 && !hole.ponds.some((w) => inBlob(t, w.circles)));

  // Wind and gust bands.
  const speed = r(0, 17);
  const ang = r(0, Math.PI * 2);
  hole.wind = { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed };
  const nGust = par === 3 ? (rand() < 0.35 ? 1 : 0) : Math.floor(rand() * 2.4);
  for (let i = 0; i < nGust; i++) {
    const cy = r(0.3, 0.85) * total;
    const half = r(14, 26);
    const ga = r(0, Math.PI * 2);
    const gs = r(8, 16);
    if (hole.gusts.some((g) => cy - half < g.y1 + 15 && cy + half > g.y0 - 15)) continue;
    hole.gusts.push({ y0: cy - half, y1: cy + half, wind: { x: Math.cos(ga) * gs, y: Math.sin(ga) * gs } });
  }
  return hole;
}

export function generateCourse(date: string): Course {
  const rand = mulberry32(hashString("pin-seeker:" + date));
  const pars = [...PARS];
  for (let i = pars.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pars[i], pars[j]] = [pars[j], pars[i]];
  }
  const theme = THEMES[Math.floor(rand() * THEMES.length)];
  const card = CARDS[Math.floor(rand() * CARDS.length)];
  const nb = NAME_B[theme];
  const name = `${NAME_A[Math.floor(rand() * NAME_A.length)]} ${nb[Math.floor(rand() * nb.length)]}`;
  const holes = pars.map((p, i) => generateHole(rand, i + 1, p, theme));
  return { date, number: roundNumber(date), name, theme, card, holes, par: pars.reduce((a, b) => a + b, 0) };
}

export function todayEastern(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isValidDate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}
