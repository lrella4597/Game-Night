// Pin Seeker: a daily nine-hole timing golf game.
// Pure logic only (no DOM) so it can be unit tested and shared by the page.
// All distances are in yards. +y runs from the tee toward the green.

export type Vec = { x: number; y: number };

export type Surface = "green" | "fairway" | "rough" | "bunker" | "water" | "trees" | "tee";

export type Circle = { x: number; y: number; r: number };

/** A band of water crossing the hole: points within halfWidth of the segment a→b. */
export type Burn = { a: Vec; b: Vec; halfWidth: number };

export type Hole = {
  number: number;
  par: 3 | 4 | 5;
  length: number;
  tee: Vec;
  pin: Vec;
  /** Centerline from tee to green. */
  path: Vec[];
  fairwayStart: number; // distance along the path where the fairway begins
  fairwayEnd: number;
  fairwayHalfWidth: number;
  corridorHalfWidth: number; // beyond this from the centerline: trees (out)
  greenRadius: number;
  bunkers: Circle[];
  ponds: Circle[];
  burns: Burn[];
  trees: Circle[]; // decorative, drawn outside the corridor
  wind: Vec; // mph, direction the wind blows toward
};

export type Course = {
  date: string;
  number: number;
  name: string;
  holes: Hole[];
  par: number;
};

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

/** Distance from the centerline, and how far along the path the closest point is. */
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
      return {
        x: path[i].x + (path[i + 1].x - path[i].x) * t,
        y: path[i].y + (path[i + 1].y - path[i].y) * t,
      };
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

// ---------- surfaces ----------

export function surfaceAt(hole: Hole, p: Vec): Surface {
  if (dist(p, hole.pin) <= hole.greenRadius) return "green";
  for (const w of hole.ponds) if (dist(p, w) <= w.r) return "water";
  for (const b of hole.burns) if (distToSegment(p, b.a, b.b).d <= b.halfWidth) return "water";
  for (const b of hole.bunkers) if (dist(p, b) <= b.r) return "bunker";
  if (dist(p, hole.tee) <= 5) return "tee";
  const info = pathInfo(p, hole.path);
  // Behind the tee or long past the green is out.
  if (p.y < hole.tee.y - 12 || p.y > hole.pin.y + 40) return "trees";
  if (info.d > hole.corridorHalfWidth) return "trees";
  if (
    info.d <= hole.fairwayHalfWidth &&
    info.along >= hole.fairwayStart &&
    info.along <= hole.fairwayEnd
  )
    return "fairway";
  return "rough";
}

// ---------- course generation ----------

const NAME_A = [
  "Ashbury", "Bramble", "Coldwater", "Driftwood", "Elmstead", "Foxhollow", "Glenmoor",
  "Heronsgate", "Ironbridge", "Juniper", "Kestrel", "Lantern", "Millbrook", "Northcliff",
  "Oakvale", "Pebbleford", "Quarry", "Ravensdale", "Saltmarsh", "Thornbury", "Upland",
  "Willowmere", "Yarrow", "Copperleaf", "Stonecrest", "Briar", "Maple", "Tidewater",
];
const NAME_B = [
  "Links", "Park", "Heath", "Commons", "Dunes", "Ridge", "Valley", "Meadows", "Glen",
  "Point", "Hollow", "Reach", "Bluffs", "Green",
];

// Two par 3s, five par 4s, two par 5s = par 36. Order is shuffled per day.
const PARS: (3 | 4 | 5)[] = [3, 3, 4, 4, 4, 4, 4, 5, 5];

const EPOCH = Date.UTC(2026, 0, 1);

export function roundNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1;
}

function generateHole(rand: () => number, number: number, par: 3 | 4 | 5): Hole {
  const r = (lo: number, hi: number) => lo + rand() * (hi - lo);

  const length =
    par === 3 ? Math.round(r(135, 205)) : par === 4 ? Math.round(r(310, 420)) : Math.round(r(470, 545));

  const tee = { x: 0, y: 0 };
  let path: Vec[];
  if (par === 3) {
    const pin = { x: r(-1, 1) * length * 0.12, y: length };
    path = [tee, pin];
  } else {
    const bendAt = r(0.45, 0.62);
    const bend = r(-1, 1) * length * 0.16;
    const mid = { x: bend, y: length * bendAt };
    const pinX = bend + r(-1, 1) * length * 0.1;
    // Keep the overall length close to the target by measuring along y.
    path = [tee, mid, { x: pinX, y: length }];
  }
  const pin = { ...path[path.length - 1] };
  const total = pathLength(path);

  const greenRadius = r(12, 16);
  const fairwayHalfWidth = r(14, 20);
  const corridorHalfWidth = r(44, 58);
  const fairwayStart = par === 3 ? total : r(90, 130);
  const fairwayEnd = total - greenRadius - 2;

  const hole: Hole = {
    number,
    par,
    length: Math.round(total),
    tee,
    pin,
    path,
    fairwayStart,
    fairwayEnd,
    fairwayHalfWidth,
    corridorHalfWidth,
    greenRadius,
    bunkers: [],
    ponds: [],
    burns: [],
    trees: [],
    wind: { x: 0, y: 0 },
  };

  // Greenside bunkers.
  const nGreen = 1 + Math.floor(rand() * 3);
  const usedAngles: number[] = [];
  for (let i = 0; i < nGreen; i++) {
    let ang = 0;
    for (let tries = 0; tries < 10; tries++) {
      // Mostly in front of and beside the green (angles measured from +x).
      ang = r(-0.6, Math.PI + 0.6) + Math.PI; // bottom half = toward the tee
      if (usedAngles.every((u) => Math.abs(u - ang) > 0.9)) break;
    }
    usedAngles.push(ang);
    const br = r(5, 8);
    const d = greenRadius + br * 0.55;
    hole.bunkers.push({ x: pin.x + Math.cos(ang) * d, y: pin.y + Math.sin(ang) * d, r: br });
  }

  // Fairway bunkers in the driving zone.
  if (par !== 3) {
    const nFw = Math.floor(rand() * 3);
    for (let i = 0; i < nFw; i++) {
      const s = r(200, 255);
      const c = pointAlong(path, Math.min(s, total - 80));
      const side = rand() < 0.5 ? -1 : 1;
      hole.bunkers.push({ x: c.x + side * fairwayHalfWidth * r(0.5, 1.0), y: c.y, r: r(6, 9) });
    }
  }

  // Water.
  const waterRoll = rand();
  if (par === 3 && waterRoll < 0.45) {
    // Pond guarding the front of the green.
    const c = pointAlong(path, total - greenRadius - r(14, 24));
    hole.ponds.push({ x: c.x + r(-8, 8), y: c.y, r: r(11, 17) });
  } else if (par !== 3 && waterRoll < 0.3) {
    // A burn crossing the hole at an angle.
    const s = r(0.42, 0.7) * total;
    const c = pointAlong(path, s);
    const ang = r(-0.35, 0.35);
    const half = corridorHalfWidth + 20;
    hole.burns.push({
      a: { x: c.x - Math.cos(ang) * half, y: c.y - Math.sin(ang) * half },
      b: { x: c.x + Math.cos(ang) * half, y: c.y + Math.sin(ang) * half },
      halfWidth: r(5, 8),
    });
  } else if (par !== 3 && waterRoll < 0.62) {
    // Pond eating into one side of the landing zone.
    const c = pointAlong(path, r(170, Math.min(270, total - 90)));
    const side = rand() < 0.5 ? -1 : 1;
    const pr = r(14, 22);
    hole.ponds.push({ x: c.x + side * (fairwayHalfWidth + pr * 0.45), y: c.y + r(-10, 10), r: pr });
  }

  // Keep hazards off the tee and the green itself.
  hole.ponds = hole.ponds.filter((w) => dist(w, tee) > w.r + 15 && dist(w, pin) > w.r + greenRadius);
  hole.bunkers = hole.bunkers.filter((b) => dist(b, tee) > b.r + 15);

  // Decorative trees along both edges.
  for (let s = -10; s < total + 30; s += 11) {
    for (const side of [-1, 1]) {
      const c = pointAlong(path, Math.max(0, Math.min(total, s)));
      const off = corridorHalfWidth + r(4, 26);
      hole.trees.push({ x: c.x + side * off + r(-4, 4), y: c.y + (s < 0 ? s : 0) + r(-4, 4), r: r(5, 9) });
    }
  }

  const windSpeed = Math.round(r(0, 16));
  const windAng = r(0, Math.PI * 2);
  hole.wind = { x: Math.cos(windAng) * windSpeed, y: Math.sin(windAng) * windSpeed };
  return hole;
}

export function generateCourse(date: string): Course {
  const rand = mulberry32(hashString("pin-seeker:" + date));
  const pars = [...PARS];
  for (let i = pars.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pars[i], pars[j]] = [pars[j], pars[i]];
  }
  const name = `${NAME_A[Math.floor(rand() * NAME_A.length)]} ${NAME_B[Math.floor(rand() * NAME_B.length)]}`;
  const holes = pars.map((p, i) => generateHole(rand, i + 1, p));
  return { date, number: roundNumber(date), name, holes, par: pars.reduce((a, b) => a + b, 0) };
}

/** Today's date (YYYY-MM-DD) in US Eastern, so everyone rolls over together. */
export function todayEastern(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidDate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}
