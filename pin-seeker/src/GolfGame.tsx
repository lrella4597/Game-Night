import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { dist, generateCourse, pathInfo, pointAlong, todayEastern, type Hole, type Vec } from "./lib/course";
import {
  MAX_POWER,
  ONE_PUTT_R,
  PURE_WINDOW,
  TWO_PUTT_R,
  clampAim,
  clubFor,
  defaultAim,
  formatToPar,
  puttsFor,
  scoreName,
  simulateShot,
  type Lie,
  type ShotResult,
} from "./lib/shot";

type Challenge = { toPar: number; by: string } | null;
type Phase = "aim" | "power" | "accuracy" | "flying" | "holeDone" | "roundDone";

type SavedRound = {
  holeIdx: number;
  scores: (number | null)[];
  ball: Vec;
  lie: Lie;
  strokes: number;
};

const METER_MIN = -0.15;
const RISE_SPEED = 1.05; // meter units per second
const FALL_SPEED = 1.15;
const NAME_KEY = "pinseeker:name";
const roundKey = (date: string) => `pinseeker:round:${date}`;
const cardKey = (date: string) => `pinseeker:card:${date}`;

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the round still plays, it just won't resume */
  }
}
function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function scoreColor(strokes: number, par: number) {
  const d = strokes - par;
  if (strokes === 1 || d <= -2) return "#a855f7";
  if (d === -1) return "#3b82f6";
  if (d === 0) return "#22c55e";
  if (d === 1) return "#eab308";
  return "#ef4444";
}
function scoreEmoji(strokes: number, par: number) {
  const d = strokes - par;
  if (strokes === 1 || d <= -2) return "🟪";
  if (d === -1) return "🟦";
  if (d === 0) return "🟩";
  if (d === 1) return "🟨";
  return "🟥";
}

// ---------------- drawing ----------------

type Camera = { s: number; ox: number; oy: number };

function makeCamera(hole: Hole, w: number, h: number): Camera {
  const xs = [hole.tee.x, hole.pin.x, ...hole.path.map((p) => p.x)];
  const minX = Math.min(...xs) - hole.corridorHalfWidth - 10;
  const maxX = Math.max(...xs) + hole.corridorHalfWidth + 10;
  const minY = hole.tee.y - 14;
  const maxY = hole.pin.y + 26;
  const s = Math.min(w / (maxX - minX), h / (maxY - minY));
  const ox = w / 2 - ((minX + maxX) / 2) * s;
  const oy = h / 2 + ((minY + maxY) / 2) * s;
  return { s, ox, oy };
}
const toScreen = (c: Camera, p: Vec) => ({ x: c.ox + p.x * c.s, y: c.oy - p.y * c.s });
const toWorld = (c: Camera, x: number, y: number): Vec => ({ x: (x - c.ox) / c.s, y: (c.oy - y) / c.s });

function strokePath(ctx: CanvasRenderingContext2D, c: Camera, pts: Vec[]) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = toScreen(c, p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  ctx.stroke();
}

function subPath(path: Vec[], from: number, to: number): Vec[] {
  const pts: Vec[] = [];
  for (let s = from; s < to; s += 4) pts.push(pointAlong(path, s));
  pts.push(pointAlong(path, to));
  return pts;
}

type DrawState = {
  hole: Hole;
  ball: Vec;
  ballHeight: number;
  aim: Vec | null;
  trail: Vec[];
  showAim: boolean;
};

function drawHole(ctx: CanvasRenderingContext2D, w: number, h: number, st: DrawState) {
  const { hole } = st;
  const c = makeCamera(hole, w, h);
  const S = (v: number) => v * c.s;

  // Woods.
  ctx.fillStyle = "#173d24";
  ctx.fillRect(0, 0, w, h);
  for (const t of hole.trees) {
    const q = toScreen(c, t);
    ctx.fillStyle = "#0f2e1a";
    ctx.beginPath();
    ctx.arc(q.x + S(1.5), q.y + S(1.5), S(t.r), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#24603a";
    ctx.beginPath();
    ctx.arc(q.x, q.y, S(t.r), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f7747";
    ctx.beginPath();
    ctx.arc(q.x - S(t.r * 0.3), q.y - S(t.r * 0.3), S(t.r * 0.45), 0, Math.PI * 2);
    ctx.fill();
  }

  // Rough corridor (clipped to the playable y range so it matches the rules).
  ctx.save();
  const top = toScreen(c, { x: 0, y: hole.pin.y + 40 }).y;
  const bottom = toScreen(c, { x: 0, y: hole.tee.y - 12 }).y;
  ctx.beginPath();
  ctx.rect(0, top, w, bottom - top);
  ctx.clip();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#4c9a45";
  ctx.lineWidth = S(hole.corridorHalfWidth * 2);
  strokePath(ctx, c, [{ x: hole.tee.x, y: hole.tee.y - 40 }, ...hole.path, { x: hole.pin.x, y: hole.pin.y + 60 }]);
  ctx.restore();

  // Fairway with mowing stripes.
  if (hole.fairwayEnd > hole.fairwayStart) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    ctx.strokeStyle = "#6cc35a";
    ctx.lineWidth = S(hole.fairwayHalfWidth * 2);
    const fw = subPath(hole.path, hole.fairwayStart, hole.fairwayEnd);
    strokePath(ctx, c, fw);
    ctx.globalCompositeOperation = "source-atop";
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    for (let s = hole.fairwayStart; s < hole.fairwayEnd; s += 20) {
      const seg = subPath(hole.path, s, Math.min(hole.fairwayEnd, s + 10));
      strokePath(ctx, c, seg);
    }
    ctx.restore();
  }

  // Water.
  ctx.lineCap = "butt";
  for (const b of hole.burns) {
    ctx.strokeStyle = "#2b6f9e";
    ctx.lineWidth = S(b.halfWidth * 2 + 2);
    strokePath(ctx, c, [b.a, b.b]);
    ctx.strokeStyle = "#3d8fc6";
    ctx.lineWidth = S(b.halfWidth * 2);
    strokePath(ctx, c, [b.a, b.b]);
  }
  for (const p of hole.ponds) {
    const q = toScreen(c, p);
    ctx.fillStyle = "#2b6f9e";
    ctx.beginPath();
    ctx.arc(q.x, q.y, S(p.r + 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d8fc6";
    ctx.beginPath();
    ctx.arc(q.x, q.y, S(p.r), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(q.x - S(p.r * 0.3), q.y - S(p.r * 0.3), S(p.r * 0.35), 0, Math.PI * 2);
    ctx.fill();
  }

  // Green, fringe and putt rings.
  const g = toScreen(c, hole.pin);
  ctx.fillStyle = "#5bb34f";
  ctx.beginPath();
  ctx.arc(g.x, g.y, S(hole.greenRadius + 2.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8fe07a";
  ctx.beginPath();
  ctx.arc(g.x, g.y, S(hole.greenRadius), 0, Math.PI * 2);
  ctx.fill();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.arc(g.x, g.y, S(TWO_PUTT_R), 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(g.x, g.y, S(ONE_PUTT_R), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bunkers.
  for (const b of hole.bunkers) {
    const q = toScreen(c, b);
    ctx.fillStyle = "#c9a96a";
    ctx.beginPath();
    ctx.arc(q.x, q.y, S(b.r + 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ecd9a6";
    ctx.beginPath();
    ctx.arc(q.x, q.y, S(b.r), 0, Math.PI * 2);
    ctx.fill();
  }

  // Tee box.
  const t = toScreen(c, hole.tee);
  ctx.fillStyle = "#7fd06b";
  ctx.fillRect(t.x - S(5), t.y - S(4), S(10), S(8));
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(t.x - S(3.5), t.y - S(2.5), 2, 0, Math.PI * 2);
  ctx.arc(t.x + S(3.5), t.y - S(2.5), 2, 0, Math.PI * 2);
  ctx.fill();

  // Last shot trail.
  if (st.trail.length > 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 4]);
    strokePath(ctx, c, st.trail);
    ctx.setLineDash([]);
  }

  // Aim line and target.
  if (st.showAim && st.aim) {
    const a = toScreen(c, st.aim);
    const b = toScreen(c, st.ball);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(a.x, a.y);
    ctx.stroke();
    ctx.setLineDash([]);
    const rr = Math.max(8, S(Math.max(4, dist(st.ball, st.aim) * 0.04)));
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, rr, 0, Math.PI * 2);
    ctx.moveTo(a.x - rr - 5, a.y);
    ctx.lineTo(a.x - rr + 4, a.y);
    ctx.moveTo(a.x + rr - 4, a.y);
    ctx.lineTo(a.x + rr + 5, a.y);
    ctx.moveTo(a.x, a.y - rr - 5);
    ctx.lineTo(a.x, a.y - rr + 4);
    ctx.moveTo(a.x, a.y + rr - 4);
    ctx.lineTo(a.x, a.y + rr + 5);
    ctx.stroke();
  }

  // Flag.
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x, g.y - 26);
  ctx.stroke();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(g.x, g.y - 26);
  ctx.lineTo(g.x + 15, g.y - 21);
  ctx.lineTo(g.x, g.y - 16);
  ctx.fill();
  ctx.fillStyle = "#0b1a10";
  ctx.beginPath();
  ctx.arc(g.x, g.y, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Ball and shadow.
  const bp = toScreen(c, st.ball);
  const lift = st.ballHeight;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(bp.x + lift * 0.5, bp.y + lift * 0.2, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const r = 4.5 + lift * 0.06;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(bp.x, bp.y - lift, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// ---------------- component ----------------

type Anim = {
  start: Vec;
  result: ShotResult;
  t0: number;
  flightMs: number;
  rollMs: number;
  peak: number;
};

export default function GolfGame({ date, challenge }: { date: string; challenge: Challenge }) {
  const course = useMemo(() => generateCourse(date), [date]);
  const isToday = date === todayEastern();

  const [holeIdx, setHoleIdx] = useState(0);
  const [scores, setScores] = useState<(number | null)[]>(Array(9).fill(null));
  const [ball, setBall] = useState<Vec>(course.holes[0].tee);
  const [lie, setLie] = useState<Lie>("tee");
  const [strokes, setStrokes] = useState(0);
  const [aim, setAim] = useState<Vec>(() => defaultAim(course.holes[0], course.holes[0].tee, "tee"));
  const [phase, setPhase] = useState<Phase>("aim");
  const [message, setMessage] = useState<string | null>(null);
  const [practice, setPractice] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [lastPure, setLastPure] = useState(false);

  const hole = course.holes[holeIdx];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const powerMarkRef = useRef<HTMLDivElement>(null);
  const meter = useRef({ value: 0, power: 0, phase: "idle" as "idle" | "rise" | "fall", last: 0 });
  const anim = useRef<Anim | null>(null);
  const strikeRef = useRef<(power: number, error: number) => void>(() => {});
  const trail = useRef<Vec[]>([]);
  const ballDraw = useRef<{ pos: Vec; h: number } | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const stateRef = useRef({ hole, ball, aim, phase });

  // ----- restore saved round / finished card -----
  useEffect(() => {
    // Hydrate from localStorage after mount (not available during SSR).
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(load<string>(NAME_KEY) ?? "");
    const card = load<number[]>(cardKey(date));
    if (card && card.length === 9) {
      setScores(card);
      setPhase("roundDone");
      setShowIntro(false);
      return;
    }
    const saved = load<SavedRound>(roundKey(date));
    if (saved && saved.scores?.length === 9) {
      setHoleIdx(saved.holeIdx);
      setScores(saved.scores);
      setBall(saved.ball);
      setLie(saved.lie);
      setStrokes(saved.strokes);
      setAim(defaultAim(course.holes[saved.holeIdx], saved.ball, saved.lie));
      setShowIntro(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [date, course]);

  // ----- persist mid-round -----
  useEffect(() => {
    if (practice || phase === "roundDone" || phase === "flying") return;
    if (holeIdx === 0 && strokes === 0 && scores.every((s) => s == null)) return;
    save(roundKey(date), { holeIdx, scores, ball, lie, strokes } satisfies SavedRound);
  }, [date, practice, phase, holeIdx, scores, ball, lie, strokes]);

  // ----- canvas sizing -----
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h, dpr };
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // ----- resolve a finished shot -----
  const finishShot = useCallback(
    (res: ShotResult, start: Vec) => {
      const o = res.outcome;
      const used = strokes + 1;
      const pickUp = hole.par + 4;
      const completeHole = (total: number, note: string) => {
        const capped = Math.min(total, pickUp);
        setStrokes(capped);
        setScores((prev) => {
          const next = [...prev];
          next[holeIdx] = capped;
          return next;
        });
        setMessage(capped === pickUp && total >= pickUp && note !== "" ? `${note} · picked up` : note);
        setPhase("holeDone");
      };

      if (o.kind === "holed") {
        completeHole(used, scoreName(used, hole.par));
        setBall(hole.pin);
        return;
      }
      if (o.kind === "water" || o.kind === "out") {
        const total = used + 1;
        if (total >= pickUp) {
          completeHole(pickUp, o.kind === "water" ? "Splash" : "Lost in the trees");
          return;
        }
        setStrokes(total);
        setBall(start);
        setAim(defaultAim(hole, start, lie));
        setMessage(o.kind === "water" ? "Splash! +1 penalty, replay from there" : "Into the trees! +1 penalty, replay");
        setPhase("aim");
        return;
      }
      if (o.surface === "green") {
        const putts = puttsFor(hole, o.at);
        setBall(o.at);
        completeHole(used + putts, `${putts} putt${putts > 1 ? "s" : ""} · ${scoreName(Math.min(used + putts, pickUp), hole.par)}`);
        return;
      }
      if (used >= pickUp) {
        completeHole(pickUp, "Picked up");
        return;
      }
      setStrokes(used);
      setBall(o.at);
      setLie(o.surface);
      setAim(defaultAim(hole, o.at, o.surface));
      const lieName: Record<string, string> = {
        fairway: "Fairway",
        rough: "In the rough",
        bunker: "In the sand",
        tee: "Tee box",
      };
      setMessage(`${res.pure ? "Pure! " : ""}${lieName[o.surface] ?? o.surface} · ${Math.round(dist(o.at, hole.pin))} yds to the pin`);
      setPhase("aim");
    },
    [hole, holeIdx, lie, strokes],
  );

  const finishRef = useRef(finishShot);

  // ----- main animation loop -----
  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const m = meter.current;
      const dt = m.last ? Math.min(0.05, (now - m.last) / 1000) : 0;
      m.last = now;
      if (m.phase === "rise") {
        m.value += RISE_SPEED * dt;
        if (m.value >= MAX_POWER) {
          m.value = MAX_POWER;
          m.power = MAX_POWER;
          m.phase = "fall";
          setPhase("accuracy");
        }
      } else if (m.phase === "fall") {
        m.value -= FALL_SPEED * dt;
        if (m.value <= METER_MIN) {
          m.value = METER_MIN;
          strikeRef.current(m.power, METER_MIN * 100);
        }
      }
      if (needleRef.current) {
        const pct = ((m.value - METER_MIN) / (MAX_POWER - METER_MIN)) * 100;
        needleRef.current.style.left = `${pct}%`;
      }
      if (powerMarkRef.current) {
        const show = m.phase === "fall" || stateRef.current.phase === "flying";
        powerMarkRef.current.style.opacity = show ? "1" : "0";
        powerMarkRef.current.style.left = `${((m.power - METER_MIN) / (MAX_POWER - METER_MIN)) * 100}%`;
      }

      const st = stateRef.current;
      let pos = st.ball;
      let height = 0;
      const a = anim.current;
      if (a) {
        const t = now - a.t0;
        const { landing, roll } = a.result;
        if (t < a.flightMs) {
          const k = t / a.flightMs;
          pos = { x: a.start.x + (landing.x - a.start.x) * k, y: a.start.y + (landing.y - a.start.y) * k };
          height = 4 * k * (1 - k) * a.peak;
          trail.current.push(pos);
        } else if (t < a.flightMs + a.rollMs && roll.length) {
          const k = (t - a.flightMs) / a.rollMs;
          const eased = 1 - (1 - k) * (1 - k);
          pos = roll[Math.min(roll.length - 1, Math.floor(eased * roll.length))];
          trail.current.push(pos);
        } else {
          pos = roll.length ? roll[roll.length - 1] : landing;
          anim.current = null;
          ballDraw.current = null;
          finishRef.current(a.result, a.start);
        }
        if (anim.current) ballDraw.current = { pos, h: height };
      }

      const canvas = canvasRef.current;
      const { w, h, dpr } = sizeRef.current;
      if (canvas && w > 0) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawHole(ctx, w, h, {
            hole: st.hole,
            ball: ballDraw.current?.pos ?? pos,
            ballHeight: ballDraw.current?.h ?? height,
            aim: st.aim,
            trail: trail.current,
            showAim: st.phase === "aim" || st.phase === "power" || st.phase === "accuracy",
          });
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // strike is stable via refs below
     
  }, []);

  // strike() reads the latest state through stateRef/lieRef.
  const lieRef = useRef(lie);
  function strike(power: number, error: number) {
    const m = meter.current;
    m.phase = "idle";
    const st = stateRef.current;
    const res = simulateShot({ hole: st.hole, ball: st.ball, lie: lieRef.current, aim: st.aim, power, error });
    const flightMs = 650 + Math.min(1500, res.carry * 5);
    const rollMs = res.roll.length ? 300 + res.roll.length * 18 : 0;
    trail.current = [st.ball];
    anim.current = { start: st.ball, result: res, t0: performance.now(), flightMs, rollMs, peak: Math.min(70, 12 + res.carry * 0.22) };
    setLastPure(res.pure);
    setMessage(
      res.pure
        ? "Pure strike!"
        : error > 0
          ? `Early by ${Math.round(error)} · pulled left`
          : `Late by ${Math.round(-error)} · pushed right`,
    );
    setPhase("flying");
  }
  // Keep the animation loop's view of state current after every render.
  useLayoutEffect(() => {
    stateRef.current = { hole, ball, aim, phase };
    finishRef.current = finishShot;
    lieRef.current = lie;
    strikeRef.current = strike;
  });

  const swing = useCallback(() => {
    const m = meter.current;
    if (phase === "aim") {
      m.value = 0;
      m.power = 0;
      m.phase = "rise";
      setMessage(null);
      setPhase("power");
    } else if (phase === "power") {
      m.power = m.value;
      m.phase = "fall";
      setPhase("accuracy");
    } else if (phase === "accuracy") {
      strike(m.power, m.value * 100);
    }
     
  }, [phase]);

  const nextHole = useCallback(() => {
    trail.current = [];
    if (holeIdx >= 8) {
      setPhase("roundDone");
      if (!practice) {
        save(cardKey(date), scores);
        remove(roundKey(date));
      }
      return;
    }
    const nh = course.holes[holeIdx + 1];
    setHoleIdx(holeIdx + 1);
    setBall(nh.tee);
    setLie("tee");
    setStrokes(0);
    setAim(defaultAim(nh, nh.tee, "tee"));
    setMessage(null);
    setPhase("aim");
  }, [course, date, holeIdx, practice, scores]);

  // Keyboard: space/enter to swing or continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code !== "Space" && e.code !== "Enter") return;
      e.preventDefault();
      if (showIntro) setShowIntro(false);
      else if (phase === "holeDone") nextHole();
      else swing();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, swing, nextHole, showIntro]);

  const onCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "aim") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cam = makeCamera(hole, rect.width, rect.height);
    const p = toWorld(cam, e.clientX - rect.left, e.clientY - rect.top);
    setAim(clampAim(ball, p, lie));
  };

  const replayPractice = () => {
    setPractice(true);
    setHoleIdx(0);
    setScores(Array(9).fill(null));
    setBall(course.holes[0].tee);
    setLie("tee");
    setStrokes(0);
    setAim(defaultAim(course.holes[0], course.holes[0].tee, "tee"));
    setMessage("Practice round: doesn't change your card");
    trail.current = [];
    setPhase("aim");
  };

  // ----- derived numbers -----
  const played = scores.reduce<{ strokes: number; par: number }>(
    (acc, s, i) => (s == null ? acc : { strokes: acc.strokes + s, par: acc.par + course.holes[i].par }),
    { strokes: 0, par: 0 },
  );
  const toPar = played.strokes - played.par;
  const aimDist = Math.round(dist(ball, aim));
  const toPin = Math.round(dist(ball, hole.pin));
  const windSpeed = Math.round(Math.hypot(hole.wind.x, hole.wind.y));
  const windDeg = (Math.atan2(-hole.wind.y, hole.wind.x) * 180) / Math.PI;
  const meterPct = (v: number) => ((v - METER_MIN) / (MAX_POWER - METER_MIN)) * 100;
  const alongPct = Math.round((pathInfo(ball, hole.path).along / hole.length) * 100);

  const shareUrl = () => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const p = new URLSearchParams({ d: date, beat: String(toPar) });
    if (name.trim()) p.set("by", name.trim());
    return `${base}/?${p.toString()}`;
  };
  const shareText = () => {
    const row = scores.map((s, i) => (s == null ? "⬜" : scoreEmoji(s, course.holes[i].par))).join("");
    return `Pin Seeker #${course.number} · ${course.name}\n${formatToPar(toPar)} (${played.strokes}) ⛳\n${row}\nBeat me: ${shareUrl()}`;
  };
  const share = async () => {
    if (name.trim()) save(NAME_KEY, name.trim());
    const text = shareText();
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      /* user cancelled or share failed; fall back to clipboard */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this and send it to your friends:", text);
    }
  };

  const meterActive = phase === "power" || phase === "accuracy";

  return (
    <div className="fixed inset-0 flex flex-col bg-[#14321f] text-white select-none" style={{ touchAction: "manipulation" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#0e2416] border-b border-white/10">
        <div className="text-2xl px-1 min-w-[64px]" aria-hidden>⛳</div>
        <div className="text-center leading-tight min-w-0">
          <div className="font-bold tracking-tight truncate">Pin Seeker · {course.name}</div>
          <div className="text-[11px] uppercase tracking-widest text-white/60">
            #{course.number} · {isToday ? "Today" : date} {practice ? "· practice" : ""}
          </div>
        </div>
        <div className="text-right text-sm tabular-nums min-w-[64px]">
          <div className="font-bold">{played.par ? formatToPar(toPar) : "E"}</div>
          <div className="text-[11px] text-white/60">thru {scores.filter((s) => s != null).length}</div>
          {challenge && (
            <div className="text-[11px] font-semibold text-amber-300" title={`${challenge.by} shot ${formatToPar(challenge.toPar)}`}>
              🎯 beat {formatToPar(challenge.toPar)}
            </div>
          )}
        </div>
      </div>

      {/* Hole info */}
      <div className="flex items-center justify-between px-3 py-1.5 text-sm bg-[#102a1a]">
        <div>
          <span className="font-bold">Hole {hole.number}</span>
          <span className="text-white/70"> · Par {hole.par} · {hole.length} yds</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/70">Stroke {strokes + (phase === "holeDone" ? 0 : 1)}</span>
          <span className="flex items-center gap-1" title="Wind">
            <span
              className="inline-block"
              style={{ transform: `rotate(${windDeg}deg)`, opacity: windSpeed ? 1 : 0.3 }}
              aria-hidden
            >
              ➜
            </span>
            <span className="tabular-nums">{windSpeed} mph</span>
          </span>
        </div>
      </div>

      {/* Course */}
      <div ref={wrapRef} className="relative flex-1 min-h-0">
        <canvas ref={canvasRef} onPointerDown={onCanvasPointer} className="absolute inset-0 block" />
        {message && phase !== "holeDone" && phase !== "roundDone" && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-4 py-1.5 text-sm font-medium">
            {message}
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 right-2 h-24 w-1.5 rounded bg-white/15" aria-hidden>
          <div className="absolute bottom-0 left-0 right-0 rounded bg-white/60" style={{ height: `${Math.min(100, alongPct)}%` }} />
        </div>

        {phase === "holeDone" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center text-slate-900 shadow-xl">
              <div className="text-sm text-slate-500">Hole {hole.number} · Par {hole.par}</div>
              <div className="mt-1 text-5xl font-black tabular-nums" style={{ color: scoreColor(strokes, hole.par) }}>
                {strokes}
              </div>
              <div className="mt-1 text-lg font-bold">{message}</div>
              <div className="mt-1 text-sm text-slate-500">Round: {formatToPar(toPar)}</div>
              <button
                onClick={nextHole}
                className="mt-4 w-full rounded-xl bg-[#15803d] py-3 font-bold text-white hover:bg-[#166534]"
                autoFocus
              >
                {holeIdx >= 8 ? "See your card" : `Hole ${holeIdx + 2} →`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {phase !== "roundDone" && (
        <div className="bg-[#0e2416] px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-white/10">
          <div className="flex items-center justify-between text-sm mb-2">
            <div>
              <span className="font-semibold">{clubFor(aimDist, lie)}</span>
              <span className="text-white/70"> · {aimDist} yds</span>
            </div>
            <div className="text-white/70">
              {lie === "tee" ? "Tee" : lie === "fairway" ? "Fairway" : lie === "rough" ? "Rough" : lie === "bunker" ? "Sand" : lie} · {toPin} to pin
            </div>
          </div>

          {/* Swing meter: power fills right, then needle returns to the snap line */}
          <div className="relative h-7 rounded-md bg-black/40 overflow-hidden" aria-hidden>
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-[#1f6f3a] via-[#65a30d] to-[#f59e0b]"
              style={{ left: `${meterPct(0)}%`, width: `${meterPct(1) - meterPct(0)}%`, opacity: 0.55 }}
            />
            <div className="absolute top-0 bottom-0 bg-red-500/50" style={{ left: `${meterPct(1)}%`, right: 0 }} />
            <div
              className="absolute top-0 bottom-0 bg-white/80"
              style={{ left: `${meterPct(-PURE_WINDOW / 100)}%`, width: `${meterPct(PURE_WINDOW / 100) - meterPct(-PURE_WINDOW / 100)}%` }}
            />
            <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${meterPct(1)}%` }} />
            <div ref={powerMarkRef} className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-sky-300 transition-opacity" style={{ opacity: 0 }} />
            <div
              ref={needleRef}
              className="absolute -top-0.5 -bottom-0.5 w-1.5 -ml-[3px] rounded bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"
              style={{ left: `${meterPct(0)}%`, opacity: meterActive || phase === "flying" ? 1 : 0.35 }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/50 mt-0.5 mb-2 px-0.5">
            <span>◀ snap here for a pure strike</span>
            <span>100% = your target</span>
          </div>

          <button
            onPointerDown={(e) => {
              e.preventDefault();
              swing();
            }}
            disabled={phase === "flying" || phase === "holeDone"}
            className={`w-full rounded-xl py-4 text-lg font-black tracking-wide transition-colors ${
              phase === "aim"
                ? "bg-[#facc15] text-slate-900"
                : phase === "power"
                  ? "bg-sky-400 text-slate-900"
                  : phase === "accuracy"
                    ? "bg-white text-slate-900"
                    : "bg-white/10 text-white/40"
            }`}
          >
            {phase === "aim"
              ? "SWING"
              : phase === "power"
                ? "TAP TO SET POWER"
                : phase === "accuracy"
                  ? "TAP ON THE WHITE LINE"
                  : lastPure
                    ? "PURE!"
                    : "…"}
          </button>
          {phase === "aim" && <div className="mt-1.5 text-center text-[11px] text-white/50">Tap the course to aim · Space works too</div>}
        </div>
      )}

      {/* Round complete */}
      {phase === "roundDone" && (
        <div className="absolute inset-0 overflow-y-auto bg-[#14321f]/95 p-4">
          <div className="mx-auto max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-slate-500">
                Pin Seeker #{course.number} · {course.name}
              </div>
              <div className="mt-2 text-6xl font-black tabular-nums">{formatToPar(toPar)}</div>
              <div className="text-slate-500">
                {played.strokes} strokes · par {course.par}
              </div>
              {challenge && (
                <div
                  className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${
                    toPar < challenge.toPar ? "bg-green-100 text-green-800" : toPar === challenge.toPar ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {toPar < challenge.toPar
                    ? `You beat ${challenge.by} by ${challenge.toPar - toPar}! 🏆`
                    : toPar === challenge.toPar
                      ? `Tied with ${challenge.by}.`
                      : `${challenge.by} wins by ${toPar - challenge.toPar}. Rematch tomorrow.`}
                </div>
              )}
            </div>

            <table className="mt-4 w-full text-center text-sm tabular-nums">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left font-medium">Hole</th>
                  {course.holes.map((h) => (
                    <th key={h.number} className="font-medium">
                      {h.number}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-500">
                  <td className="text-left">Par</td>
                  {course.holes.map((h) => (
                    <td key={h.number}>{h.par}</td>
                  ))}
                </tr>
                <tr className="font-bold">
                  <td className="text-left">You</td>
                  {course.holes.map((h, i) => (
                    <td key={h.number}>
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white"
                        style={{ background: scores[i] == null ? "#cbd5e1" : scoreColor(scores[i]!, h.par) }}
                      >
                        {scores[i] ?? "–"}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            <label className="mt-5 block text-sm font-medium text-slate-700">
              Your name (shows on the challenge)
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder="e.g. Big Hitter"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
            <button onClick={share} className="mt-3 w-full rounded-xl bg-[#15803d] py-3 font-bold text-white hover:bg-[#166534]">
              {copied ? "Copied! Paste it in the group chat" : "Challenge friends"}
            </button>
            <button onClick={replayPractice} className="mt-2 w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              Play this course again (practice)
            </button>
            <div className="mt-4 text-center text-xs text-slate-500">
              {isToday ? "New course at midnight Eastern." : <a className="underline" href="/">Play today&apos;s course</a>}
            </div>
          </div>
        </div>
      )}

      {/* Intro */}
      {showIntro && phase !== "roundDone" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-xl">
            <div className="text-xs uppercase tracking-widest text-slate-500">#{course.number} · {isToday ? "Today's nine" : date}</div>
            <h1 className="mt-1 text-2xl font-black">{course.name}</h1>
            <div className="text-sm text-slate-500">Par {course.par} · {course.holes.reduce((a, h) => a + h.length, 0).toLocaleString()} yards</div>
            {challenge && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <b>{challenge.by}</b> shot <b>{formatToPar(challenge.toPar)}</b> on this course. Can you beat it?
              </div>
            )}
            <ol className="mt-4 space-y-2 text-sm text-slate-700">
              <li><b>1. Aim.</b> Tap anywhere on the hole to pick your target.</li>
              <li><b>2. Power.</b> Tap SWING, then tap again to stop the meter. The white line at 100% hits your target exactly.</li>
              <li><b>3. Strike.</b> The needle swings back. Tap as it crosses the white band on the left for a pure strike that rolls out long. Early pulls left, late pushes right.</li>
              <li><b>4. Green.</b> Putts are automatic: inside the small ring is 1 putt, the big ring 2, anywhere else on the green 3.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">Water and trees cost a stroke. Watch the wind. Everyone gets the same course today.</p>
            <button onClick={() => setShowIntro(false)} className="mt-4 w-full rounded-xl bg-[#15803d] py-3 font-bold text-white hover:bg-[#166534]" autoFocus>
              Tee off
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
