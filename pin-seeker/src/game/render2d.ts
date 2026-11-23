// Top-down renderer: a pre-painted hole image (surfaces, hill shading, water, trees)
// plus live overlays (wind, rings, aim, ball) drawn every frame.
import { OB_MARGIN, ONE_PUTT_R, heightAt, pathInfo, surfaceAt, twoPuttRadius, windAt, type Hole, type ThemeName, type Vec } from "../lib/course";
import type { Vec3 } from "../lib/physics";
import { PALETTES, type Palette } from "./theme";

export type HoleArt = { canvas: HTMLCanvasElement; x0: number; x1: number; y0: number; y1: number; pal: Palette };
export type View = { s: number; ox: number; oy: number };

function hashNoise(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function artBounds(hole: Hole) {
  const xs = hole.path.map((p) => p.x);
  const pad = hole.corridorHalfWidth + OB_MARGIN * 0.6;
  return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: -30, y1: hole.length + 45 };
}

/** Paint the whole hole once: surfaces, hill shading, water, then trees on top. */
export function buildHoleArt(hole: Hole, theme: ThemeName): HoleArt {
  const pal = PALETTES[theme];
  const { x0, x1, y0, y1 } = artBounds(hole);
  const ppy = Math.min(3, 1600 / (x1 - x0), 3600 / (y1 - y0));
  const W = Math.ceil((x1 - x0) * ppy);
  const H = Math.ceil((y1 - y0) * ppy);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Hill shading from a coarse height grid, light from the upper left.
  const step = 2;
  const gx = Math.ceil((x1 - x0) / step) + 1;
  const gy = Math.ceil((y1 - y0) / step) + 1;
  const hts = new Float32Array(gx * gy);
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) hts[j * gx + i] = heightAt(hole, x0 + i * step, y0 + j * step);
  const shade = new Float32Array(gx * gy);
  const L = { x: -0.55, y: 0.55, z: 0.63 };
  const exag = 1.7;
  for (let j = 0; j < gy; j++)
    for (let i = 0; i < gx; i++) {
      const hx = (hts[j * gx + Math.min(gx - 1, i + 1)] - hts[j * gx + Math.max(0, i - 1)]) / (2 * step);
      const hy = (hts[Math.min(gy - 1, j + 1) * gx + i] - hts[Math.max(0, j - 1) * gx + i]) / (2 * step);
      const nx = -hx * exag;
      const ny = -hy * exag;
      const nl = Math.hypot(nx, ny, 1);
      shade[j * gx + i] = (nx * L.x + ny * L.y + L.z) / nl / L.z;
    }
  const shadeAt = (x: number, y: number) => {
    const fx = (x - x0) / step;
    const fy = (y - y0) / step;
    const i = Math.max(0, Math.min(gx - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(gy - 2, Math.floor(fy)));
    const tx = fx - i;
    const ty = fy - j;
    const a = shade[j * gx + i];
    const b = shade[j * gx + i + 1];
    const c = shade[(j + 1) * gx + i];
    const d = shade[(j + 1) * gx + i + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };

  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    const y = y1 - (py + 0.5) / ppy;
    for (let px = 0; px < W; px++) {
      const x = x0 + (px + 0.5) / ppy;
      const p = { x, y };
      const s = surfaceAt(hole, p);
      let c: [number, number, number];
      let k = 0.96 + hashNoise(px, py) * 0.08;
      switch (s) {
        case "fairway":
        case "tee": {
          c = s === "tee" ? pal.tee : pal.fairway;
          const info = pathInfo(p, hole.path);
          k *= Math.floor(info.along / 10) % 2 === 0 ? 1.06 : 0.95;
          if (s === "fairway" && info.d > hole.fairwayHalfWidth - 1.2) k *= 0.92;
          break;
        }
        case "green":
          c = pal.green;
          k *= Math.floor((x - hole.pin.x + 300) / 2.2) % 2 === 0 ? 1.05 : 0.97;
          break;
        case "fringe":
          c = pal.fringe;
          break;
        case "bunker": {
          c = pal.sand;
          let edge = 0;
          for (const b of hole.bunkers) for (const ci of b) edge = Math.max(edge, ci.r - Math.hypot(x - ci.x, y - ci.y));
          k = (0.97 + hashNoise(px * 3, py * 7) * 0.06) * (edge < 0.5 ? 0.84 : 1);
          break;
        }
        case "water":
          c = [55, 120, 170];
          break;
        case "woods":
        case "ob":
          c = pal.woods;
          k *= 0.85 + hashNoise(px >> 1, py >> 1) * 0.2;
          break;
        default: {
          c = pal.rough;
          const info = pathInfo(p, hole.path);
          k *= 1 - Math.max(0, Math.min(0.15, (info.d - hole.fairwayHalfWidth - 4) / 160));
        }
      }
      if (s !== "water") k *= Math.max(0.78, Math.min(1.22, shadeAt(x, y))) * 1.04;
      const i = (py * W + px) * 4;
      d[i] = Math.min(255, c[0] * k);
      d[i + 1] = Math.min(255, c[1] * k);
      d[i + 2] = Math.min(255, c[2] * k);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const P = (x: number, y: number) => ({ x: (x - x0) * ppy, y: (y1 - y) * ppy });

  // Water: a pale bank, deeper middle, a few glints.
  for (const w of hole.ponds) {
    ctx.fillStyle = "rgba(225,235,210,0.55)";
    ctx.beginPath();
    for (const c of w.circles) {
      const q = P(c.x, c.y);
      ctx.moveTo(q.x + (c.r + 0.7) * ppy, q.y);
      ctx.arc(q.x, q.y, (c.r + 0.7) * ppy, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    for (const c of w.circles) {
      const q = P(c.x, c.y);
      ctx.moveTo(q.x + c.r * ppy, q.y);
      ctx.arc(q.x, q.y, c.r * ppy, 0, Math.PI * 2);
    }
    ctx.clip();
    const c0 = w.circles[0];
    const q0 = P(c0.x, c0.y);
    const g = ctx.createRadialGradient(q0.x, q0.y, 0, q0.x, q0.y, c0.r * ppy * 1.6);
    const wc = `#${pal.water.toString(16).padStart(6, "0")}`;
    g.addColorStop(0, shadeHex(wc, 0.75));
    g.addColorStop(1, shadeHex(wc, 1.15));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = ppy * 0.4;
    for (let i = 0; i < 6; i++) {
      const c = w.circles[i % w.circles.length];
      const q = P(c.x + (hashNoise(i, 3) - 0.5) * c.r, c.y + (hashNoise(i, 9) - 0.5) * c.r);
      ctx.beginPath();
      ctx.moveTo(q.x - ppy * 2, q.y);
      ctx.quadraticCurveTo(q.x, q.y - ppy * 0.8, q.x + ppy * 2, q.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Trees: shadows first, then canopies, back to front.
  const trees = [...hole.trees].sort((a, b) => b.y - a.y);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (const t of trees) {
    const q = P(t.x, t.y);
    ctx.beginPath();
    ctx.ellipse(q.x + t.r * ppy * 0.55, q.y + t.r * ppy * 0.55, t.r * ppy * 1.05, t.r * ppy * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const t of trees) {
    const q = P(t.x, t.y);
    const r = t.r * ppy;
    const list = t.kind === "pine" ? pal.pine : pal.oak;
    const base = `#${list[Math.floor(hashNoise(Math.round(t.x * 10), Math.round(t.y * 10)) * list.length)].toString(16).padStart(6, "0")}`;
    const g = ctx.createRadialGradient(q.x - r * 0.35, q.y - r * 0.35, r * 0.1, q.x, q.y, r);
    g.addColorStop(0, shadeHex(base, 1.35));
    g.addColorStop(1, shadeHex(base, 0.8));
    ctx.fillStyle = g;
    if (t.kind === "pine") {
      ctx.beginPath();
      const n = 9;
      for (let i = 0; i <= n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2;
        const rr = i % 2 === 0 ? r : r * 0.72;
        const px = q.x + Math.cos(a) * rr;
        const py = q.y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + t.x;
        ctx.moveTo(q.x + Math.cos(a) * r * 0.45 + r * 0.55, q.y + Math.sin(a) * r * 0.45);
        ctx.arc(q.x + Math.cos(a) * r * 0.45, q.y + Math.sin(a) * r * 0.45, r * 0.55, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  // Tee box markers.
  const tq = P(hole.tee.x, hole.tee.y);
  ctx.fillStyle = "#2563eb";
  for (const sx of [-3.5, 3.5]) {
    ctx.beginPath();
    ctx.arc(tq.x + sx * ppy, tq.y - ppy, ppy * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return { canvas, x0, x1, y0, y1, pal };
}

function shadeHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `rgb(${r},${g},${b})`;
}

export function fitView(hole: Hole, w: number, h: number): View {
  const xs = hole.path.map((p) => p.x);
  const minX = Math.min(...xs) - hole.corridorHalfWidth - 8;
  const maxX = Math.max(...xs) + hole.corridorHalfWidth + 8;
  const minY = -12;
  const maxY = hole.length + 22;
  const s = Math.min(w / (maxX - minX), h / (maxY - minY));
  return { s, ox: w / 2 - ((minX + maxX) / 2) * s, oy: h / 2 + ((minY + maxY) / 2) * s };
}
export const toScreen = (v: View, x: number, y: number) => ({ x: v.ox + x * v.s, y: v.oy - y * v.s });
export const toWorld = (v: View, sx: number, sy: number): Vec => ({ x: (sx - v.ox) / v.s, y: (v.oy - sy) / v.s });

// ---------- wind streaks ----------

type Streak = { x: number; y: number; life: number; max: number; gust: number };
export class WindField {
  private streaks: Streak[] = [];
  constructor(private n = 90) {}
  reset() {
    this.streaks = [];
  }
  update(dt: number, hole: Hole) {
    const xs = hole.path.map((p) => p.x);
    const minX = Math.min(...xs) - hole.corridorHalfWidth;
    const maxX = Math.max(...xs) + hole.corridorHalfWidth;
    const base = Math.hypot(hole.wind.x, hole.wind.y);
    const want = base < 1 && hole.gusts.length === 0 ? 0 : this.n;
    while (this.streaks.length < want) this.streaks.push({ x: 0, y: 0, life: 0, max: 0, gust: -1 });
    if (this.streaks.length > want) this.streaks.length = want;
    this.streaks.forEach((s, i) => {
      if (s.life <= 0) {
        const g = hole.gusts.length && i % 3 === 0 ? i % hole.gusts.length : -1;
        s.gust = g;
        s.x = minX + Math.random() * (maxX - minX);
        s.y = g >= 0 ? hole.gusts[g].y0 + Math.random() * (hole.gusts[g].y1 - hole.gusts[g].y0) : -10 + Math.random() * (hole.length + 30);
        s.max = s.life = 1 + Math.random() * 1.5;
      }
      const w = windAt(hole, s.x, s.y, 20, 0);
      s.x += w.x * 1.1 * dt;
      s.y += w.y * 1.1 * dt;
      s.life -= dt;
    });
  }
  draw(ctx: CanvasRenderingContext2D, v: View, hole: Hole) {
    ctx.lineCap = "round";
    for (const s of this.streaks) {
      if (s.life <= 0) continue;
      const w = windAt(hole, s.x, s.y, 20, 0);
      const sp = Math.hypot(w.x, w.y);
      if (sp < 0.5) continue;
      const len = 2 + sp * 0.55;
      const a = toScreen(v, s.x, s.y);
      const b = toScreen(v, s.x - (w.x / sp) * len, s.y - (w.y / sp) * len);
      const fade = Math.sin((s.life / s.max) * Math.PI);
      ctx.strokeStyle = s.gust >= 0 ? `rgba(200,235,255,${0.75 * fade})` : `rgba(255,255,255,${0.45 * fade})`;
      ctx.lineWidth = s.gust >= 0 ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

// ---------- per-frame drawing ----------

export type FrameState = {
  hole: Hole;
  art: HoleArt;
  ball: Vec3;
  aim: { landing: Vec3; rollout: Vec3[]; laser: Vec3[] | null } | null;
  trail: Vec3[];
  wind: WindField;
  time: number;
  showRings: boolean;
};

export function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, v: View, f: FrameState) {
  const { hole, art } = f;
  const wc = art.pal.woods;
  ctx.fillStyle = `rgb(${wc[0] * 0.8},${wc[1] * 0.8},${wc[2] * 0.8})`;
  ctx.fillRect(0, 0, w, h);
  const a = toScreen(v, art.x0, art.y1);
  const b = toScreen(v, art.x1, art.y0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(art.canvas, a.x, a.y, b.x - a.x, b.y - a.y);

  // Gust bands.
  for (const g of hole.gusts) {
    const t = toScreen(v, 0, g.y1).y;
    const bt = toScreen(v, 0, g.y0).y;
    ctx.fillStyle = "rgba(190,230,255,0.10)";
    ctx.fillRect(0, t, w, bt - t);
    ctx.strokeStyle = "rgba(190,230,255,0.35)";
    ctx.setLineDash([5, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, t);
    ctx.lineTo(w, t);
    ctx.moveTo(0, bt);
    ctx.lineTo(w, bt);
    ctx.stroke();
    ctx.setLineDash([]);
    const sp = Math.round(Math.hypot(g.wind.x, g.wind.y));
    const ang = Math.atan2(-g.wind.y, g.wind.x);
    ctx.save();
    ctx.translate(10, (t + bt) / 2);
    ctx.fillStyle = "rgba(15,40,60,0.6)";
    roundRect(ctx, 0, -10, 66, 20, 10);
    ctx.fill();
    ctx.fillStyle = "#dff3ff";
    ctx.font = "bold 11px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(`GUST ${sp}`, 8, 0);
    ctx.translate(56, 0);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.fill();
    ctx.restore();
  }

  f.wind.draw(ctx, v, hole);

  // Putt rings.
  const g = toScreen(v, hole.pin.x, hole.pin.y);
  if (f.showRings) {
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(g.x, g.y, twoPuttRadius(hole) * v.s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(g.x, g.y, ONE_PUTT_R * v.s, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Trail.
  if (f.trail.length > 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    f.trail.forEach((p, i) => {
      const q = toScreen(v, p.x, p.y);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.stroke();
  }

  // Aim: line to the landing spot, expected rollout, optional laser path.
  if (f.aim) {
    const bq = toScreen(v, f.ball.x, f.ball.y);
    const lq = toScreen(v, f.aim.landing.x, f.aim.landing.y);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -f.time * 20;
    ctx.beginPath();
    ctx.moveTo(bq.x, bq.y);
    ctx.lineTo(lq.x, lq.y);
    ctx.stroke();
    ctx.lineDashOffset = 0;
    if (f.aim.rollout.length > 1) {
      ctx.setLineDash([1.5, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      f.aim.rollout.forEach((p, i) => {
        const q = toScreen(v, p.x, p.y);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    }
    ctx.setLineDash([]);
    if (f.aim.laser && f.aim.laser.length > 1) {
      ctx.strokeStyle = "rgba(255,200,61,0.95)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      f.aim.laser.forEach((p, i) => {
        const q = toScreen(v, p.x, p.y);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    }
    const rr = 9 + Math.sin(f.time * 4) * 1;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lq.x, lq.y, rr, 0, Math.PI * 2);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(lq.x + dx * (rr - 4), lq.y + dy * (rr - 4));
      ctx.lineTo(lq.x + dx * (rr + 5), lq.y + dy * (rr + 5));
    }
    ctx.stroke();
  }

  // Flag: pennant streams downwind.
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(g.x + 6, g.y + 3, 6, 2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0b1008";
  ctx.beginPath();
  ctx.arc(g.x, g.y, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x, g.y - 24);
  ctx.stroke();
  const ws = Math.hypot(hole.wind.x, hole.wind.y);
  const dirX = ws > 0.5 ? (hole.wind.x >= 0 ? 1 : -1) : 1;
  const flap = Math.sin(f.time * (5 + ws * 0.4)) * (1 + ws * 0.12);
  const len = 10 + Math.min(8, ws * 0.5);
  ctx.fillStyle = "#e11d48";
  ctx.beginPath();
  ctx.moveTo(g.x, g.y - 24);
  ctx.quadraticCurveTo(g.x + dirX * len * 0.5, g.y - 22 + flap, g.x + dirX * len, g.y - 19 + flap * 0.5);
  ctx.lineTo(g.x, g.y - 14);
  ctx.fill();

  // Ball: shadow slides away as it climbs.
  const air = Math.max(0, f.ball.z - heightAt(hole, f.ball.x, f.ball.y));
  const bp = toScreen(v, f.ball.x, f.ball.y);
  ctx.fillStyle = `rgba(0,0,0,${Math.max(0.15, 0.4 - air * 0.006)})`;
  ctx.beginPath();
  ctx.ellipse(bp.x + air * 0.35 + 1, bp.y + air * 0.2 + 1, 4, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  const r = 4.2 + Math.min(7, air * 0.17);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(15,23,42,0.85)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(bp.x, bp.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
