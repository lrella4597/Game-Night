import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { dist, generateCourse, heightAt, puttsFor, surfaceAt, todayEastern, type Hole, type PowerCard, type Surface, type Vec } from "./lib/course";
import {
  MAX_POWER,
  PURE_WINDOW,
  clubFor,
  defaultTarget,
  headingVec,
  lieFactor,
  maxDistance,
  simulateShot,
  type Mods,
  type ShotEvent,
  type Trajectory,
  type Vec3,
} from "./lib/physics";
import { formatToPar, scoreColor, scoreEmoji, scoreName } from "./lib/scoring";
import { WindField, buildHoleArt, drawFrame, fitView, toWorld, type HoleArt } from "./game/render2d";
import { PALETTES } from "./game/theme";
import { isMuted, setMuted, sfx, unlockAudio } from "./game/audio";
import Confetti from "./game/Confetti";

type Challenge = { toPar: number; by: string } | null;
type Phase = "intro" | "aim" | "locked" | "power" | "accuracy" | "flight" | "holeDone" | "roundDone";

type Snapshot = { ball: Vec3; lie: Surface; strokes: number; heading: number; distance: number; scores: (number | null)[] };
type SavedRound = { holeIdx: number; scores: (number | null)[]; ball: Vec3; lie: Surface; strokes: number; mulliganUsed: boolean; cardUsed: boolean };
type SavedCard = { scores: number[]; mulliganUsed: boolean; cardUsed: boolean };

const METER_MIN = -0.15;
const RISE = 0.95;
const FALL = 1.2;
const NAME_KEY = "pinseeker:name";
const MUTE_KEY = "pinseeker:muted";
const roundKey = (d: string) => `pinseeker:v3:round:${d}`;
const cardKey = (d: string) => `pinseeker:v3:card:${d}`;

const CARD_INFO: Record<PowerCard, { name: string; icon: string; blurb: string }> = {
  laser: { name: "Laser Line", icon: "🎯", blurb: "See your exact flight, wind and all, for one shot." },
  calm: { name: "Calm Air", icon: "🍃", blurb: "The wind drops to nothing for one shot." },
  turbo: { name: "Turbo Ball", icon: "🚀", blurb: "15% more distance on one shot." },
  magnet: { name: "Magnet Cup", icon: "🧲", blurb: "The cup gets three times bigger for one shot." },
};

const LIE_LABEL: Record<Surface, string> = {
  tee: "Tee",
  fairway: "Fairway",
  rough: "Rough",
  fringe: "Fringe",
  green: "Green",
  bunker: "Sand",
  water: "Water",
  woods: "Trees",
  ob: "Out of bounds",
};

function load<T>(k: string): T | null {
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : null;
  } catch {
    return null;
  }
}
function save(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
}
function remove(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

const teeBall = (h: Hole): Vec3 => ({ x: h.tee.x, y: h.tee.y, z: heightAt(h, h.tee.x, h.tee.y) });
const maxStrokes = (h: Hole) => h.par * 2;
const hexColor = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** Animate automatic putts as rolls toward the cup. */
function puttFrames(hole: Hole, from: Vec3, putts: number): { frames: Vec3[]; events: ShotEvent[] } {
  const pts: Vec[] = [from];
  const ang = Math.random() * Math.PI * 2;
  if (putts === 3) pts.push({ x: hole.pin.x + Math.cos(ang) * 4, y: hole.pin.y + Math.sin(ang) * 4 });
  if (putts >= 2) pts.push({ x: hole.pin.x + Math.cos(ang + 0.6) * 0.8, y: hole.pin.y + Math.sin(ang + 0.6) * 0.8 });
  pts.push(hole.pin);
  const frames: Vec3[] = [];
  const events: ShotEvent[] = [];
  let t = 0.25;
  for (let i = 0; i < 15; i++) frames.push(from);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const n = Math.round((0.45 + dist(a, b) * 0.05) * 60);
    events.push({ t, kind: "strike" });
    for (let k = 1; k <= n; k++) {
      const e = 1 - Math.pow(1 - k / n, 2.2);
      const x = a.x + (b.x - a.x) * e;
      const y = a.y + (b.y - a.y) * e;
      frames.push({ x, y, z: heightAt(hole, x, y) });
    }
    t += n / 60;
    if (i < pts.length - 2) {
      for (let k = 0; k < 24; k++) frames.push(frames[frames.length - 1]);
      t += 0.4;
    }
  }
  events.push({ t: t - 0.02, kind: "cup" });
  return { frames, events };
}

type Flight = {
  frames: Vec3[];
  events: ShotEvent[];
  landingIndex: number;
  traj: Trajectory | null; // null for the automatic putting animation
  putts: number;
  t: number;
  nextEvent: number;
  start: Vec3;
  endWait: number;
};

export default function GolfGame({ date, challenge }: { date: string; challenge: Challenge }) {
  const course = useMemo(() => generateCourse(date), [date]);
  const isToday = date === todayEastern();
  const pal = PALETTES[course.theme];
  const card = CARD_INFO[course.card];

  const [holeIdx, setHoleIdx] = useState(0);
  const [scores, setScores] = useState<(number | null)[]>(Array(9).fill(null));
  const [ball, setBall] = useState<Vec3>(() => teeBall(course.holes[0]));
  const [lie, setLie] = useState<Surface>("tee");
  const [strokes, setStrokes] = useState(0);
  const [heading, setHeading] = useState(() => defaultTarget(course.holes[0], course.holes[0].tee, "tee").heading);
  const [distance, setDistance] = useState(() => defaultTarget(course.holes[0], course.holes[0].tee, "tee").distance);
  const [phase, setPhase] = useState<Phase>("intro");
  const [message, setMessage] = useState<string | null>(null);
  const [callout, setCallout] = useState<{ text: string; key: number } | null>(null);
  const [mulliganUsed, setMulliganUsed] = useState(false);
  const [cardUsed, setCardUsed] = useState(false);
  const [cardArmed, setCardArmed] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [practice, setPractice] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [confetti, setConfetti] = useState({ n: 0, big: false });
  const [resumed, setResumed] = useState(false);
  const [holeNote, setHoleNote] = useState("");

  const hole = course.holes[holeIdx];
  const club = clubFor(distance, lie);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const powerMarkRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<{ idx: number; art: HoleArt } | null>(null);
  const windRef = useRef(new WindField());
  const meter = useRef({ value: 0, power: 0, phase: "idle" as "idle" | "rise" | "fall" });
  const flight = useRef<Flight | null>(null);
  const trail = useRef<Vec3[]>([]);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  type AimDraw = { landing: Vec3; rollout: Vec3[]; laser: Vec3[] | null } | null;
  const latest = useRef<{ phase: Phase; ball: Vec3; hole: Hole; holeIdx: number; aim: AimDraw }>({ phase, ball, hole, holeIdx, aim: null });
  const strikeRef = useRef<(power: number, error: number) => void>(() => {});
  const resolveRef = useRef<(f: Flight) => void>(() => {});

  const flash = useCallback((text: string) => setCallout({ text, key: Math.random() }), []);

  // ---------- restore ----------
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setName(load<string>(NAME_KEY) ?? "");
    const m = load<boolean>(MUTE_KEY) ?? false;
    setMuted(m);
    setMutedState(m);
    const done = load<SavedCard>(cardKey(date));
    if (done && done.scores?.length === 9) {
      setScores(done.scores);
      setMulliganUsed(done.mulliganUsed);
      setCardUsed(done.cardUsed);
      setPhase("roundDone");
      return;
    }
    const s = load<SavedRound>(roundKey(date));
    if (s && s.scores?.length === 9) {
      setHoleIdx(s.holeIdx);
      setScores(s.scores);
      setBall(s.ball);
      setLie(s.lie);
      setStrokes(s.strokes);
      setMulliganUsed(s.mulliganUsed);
      setCardUsed(s.cardUsed);
      const t = defaultTarget(course.holes[s.holeIdx], s.ball, s.lie);
      setHeading(t.heading);
      setDistance(t.distance);
      setResumed(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [date, course]);

  // ---------- persist ----------
  useEffect(() => {
    if (practice || phase === "roundDone" || phase === "flight" || phase === "intro" || phase === "holeDone") return;
    save(roundKey(date), { holeIdx, scores, ball, lie, strokes, mulliganUsed, cardUsed } satisfies SavedRound);
  }, [date, practice, phase, holeIdx, scores, ball, lie, strokes, mulliganUsed, cardUsed]);

  // ---------- aim preview (calm-air pure shot) ----------
  const mods: Mods = useMemo(
    () => (cardArmed ? { calm: course.card === "calm", turbo: course.card === "turbo", magnet: course.card === "magnet" } : {}),
    [cardArmed, course.card],
  );
  const preview = useMemo(() => {
    const calmHole = { ...hole, wind: { x: 0, y: 0 }, gusts: [] };
    const sim = simulateShot({ hole: calmHole, start: ball, lie, heading, distance, club, power: 1, error: 0, mods: { turbo: mods.turbo }, rand: () => 0.5 });
    const landing = sim.frames[sim.landingIndex];
    const laser =
      cardArmed && course.card === "laser"
        ? simulateShot({ hole, start: ball, lie, heading, distance, club, power: 1, error: 0, rand: () => 0.5 }).frames
        : null;
    return { landing, rollout: sim.frames.slice(sim.landingIndex), laser, carry: sim.carry, rest: sim.frames[sim.frames.length - 1] };
  }, [heading, distance, ball, hole, lie, club, cardArmed, course.card, mods.turbo]);

  useLayoutEffect(() => {
    const showAim = phase === "aim" || phase === "locked" || phase === "power" || phase === "accuracy";
    latest.current = { phase, ball, hole, holeIdx, aim: showAim ? preview : null };
  });

  // ---------- render loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
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

    let raf = 0;
    let last = performance.now();
    let time = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;
      const L = latest.current;

      // Meter.
      const m = meter.current;
      if (m.phase === "rise") {
        m.value += RISE * dt;
        if (m.value >= MAX_POWER) {
          m.value = m.power = MAX_POWER;
          m.phase = "fall";
          setPhase("accuracy");
        }
      } else if (m.phase === "fall") {
        m.value -= FALL * dt;
        if (m.value <= METER_MIN) {
          m.value = METER_MIN;
          strikeRef.current(m.power, METER_MIN * 100);
        }
      }
      const pct = (v: number) => ((v - METER_MIN) / (MAX_POWER - METER_MIN)) * 100;
      if (needleRef.current) needleRef.current.style.left = `${pct(m.value)}%`;
      if (powerMarkRef.current) {
        powerMarkRef.current.style.opacity = m.phase === "fall" || L.phase === "flight" ? "1" : "0";
        powerMarkRef.current.style.left = `${pct(m.power)}%`;
      }

      // Flight playback.
      let ballNow = L.ball;
      const f = flight.current;
      if (f) {
        const i0 = Math.min(f.frames.length - 1, Math.floor(f.t * 60));
        const p0 = f.frames[i0];
        const near = !!f.traj && Math.hypot(p0.x - L.hole.pin.x, p0.y - L.hole.pin.y) < 2.5 && i0 > f.landingIndex;
        const longRoll = !!f.traj && i0 > f.landingIndex + 180 && !near;
        f.t += dt * (near ? 0.55 : longRoll ? 2.5 : 1);
        const idx = Math.min(f.frames.length - 1, Math.floor(f.t * 60));
        ballNow = f.frames[idx];
        if (f.traj) trail.current = f.frames.slice(0, idx + 1);
        while (f.nextEvent < f.events.length && f.events[f.nextEvent].t <= f.t) {
          const ev = f.events[f.nextEvent++];
          if (ev.kind === "strike") sfx.swing(true, true);
          if (ev.kind === "bounce") sfx.bounce();
          if (ev.kind === "sand") sfx.sand();
          if (ev.kind === "tree") {
            sfx.tree();
            flash("Timber! 🌲");
          }
          if (ev.kind === "pin") {
            sfx.pin();
            flash("Off the pin!");
          }
          if (ev.kind === "lip") {
            sfx.lip();
            flash("Lipped out! 😱");
          }
          if (ev.kind === "splash") sfx.splash();
          if (ev.kind === "cup") sfx.cup();
        }
        if (idx >= f.frames.length - 1) {
          f.endWait += dt;
          if (f.endWait > 0.45) {
            flight.current = null;
            resolveRef.current(f);
          }
        }
      }

      // Draw.
      if (!artRef.current || artRef.current.idx !== L.holeIdx) {
        artRef.current = { idx: L.holeIdx, art: buildHoleArt(L.hole, course.theme) };
        windRef.current.reset();
      }
      windRef.current.update(dt, L.hole);
      const { w, h, dpr } = sizeRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx && w > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawFrame(ctx, w, h, fitView(L.hole, w, h), {
          hole: L.hole,
          art: artRef.current.art,
          ball: ballNow,
          aim: L.aim,
          trail: trail.current,
          wind: windRef.current,
          time,
          showRings: true,
        });
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [course.theme, flash]);

  // ---------- strike ----------
  function strike(power: number, error: number) {
    meter.current.phase = "idle";
    const traj = simulateShot({ hole, start: ball, lie, heading, distance, club, power, error, mods });
    if (cardArmed) {
      setCardUsed(true);
      setCardArmed(false);
    }
    setSnapshot({ ball, lie, strokes, heading, distance, scores: [...scores] });
    trail.current = [];
    flight.current = { frames: traj.frames, events: traj.events, landingIndex: traj.landingIndex, traj, putts: 0, t: 0, nextEvent: 1, start: ball, endWait: 0 };
    sfx.swing(traj.pure);
    if (traj.pure) flash("PURE! ✨");
    else setMessage(error > 0 ? `Early by ${Math.round(error)}: pulled left` : `Late by ${Math.round(-error)}: pushed right`);
    setPhase("flight");
  }

  // ---------- resolve ----------
  function finishHole(total: number, note: string, holed: boolean) {
    const capped = Math.min(total, maxStrokes(hole));
    setStrokes(capped);
    setScores((prev) => {
      const n = [...prev];
      n[holeIdx] = capped;
      return n;
    });
    const diff = capped - hole.par;
    if (holed && (capped === 1 || diff <= -2)) {
      sfx.fanfare(capped === 1 ? "ace" : "eagle");
      setConfetti((c) => ({ n: c.n + 1, big: true }));
    } else if (holed && diff === -1) {
      sfx.fanfare("birdie");
      setConfetti((c) => ({ n: c.n + 1, big: false }));
    } else if (holed && diff === 0) sfx.fanfare("par");
    else sfx.sad();
    setHoleNote(note);
    setMessage(holed ? scoreName(capped, hole.par) : "Picked up");
    setPhase("holeDone");
  }

  function resolve(f: Flight) {
    // End of the automatic putting animation.
    if (!f.traj) {
      finishHole(strokes + f.putts, `${f.putts} putt${f.putts > 1 ? "s" : ""}`, true);
      return;
    }
    const o = f.traj.outcome;
    const used = strokes + 1;
    const cap = maxStrokes(hole);
    if (o.kind === "holed") {
      setBall({ x: hole.pin.x, y: hole.pin.y, z: o.at.z });
      finishHole(used, used === 1 ? "Ace!" : "Holed out!", true);
      return;
    }
    if (o.kind === "water" || o.kind === "ob") {
      const total = used + 1;
      if (total >= cap) return finishHole(cap, "", false);
      const nb = o.kind === "water" ? o.drop : f.start;
      const nl = o.kind === "water" ? surfaceAt(hole, nb) : lie;
      setStrokes(total);
      setBall(nb);
      setLie(nl);
      const t = defaultTarget(hole, nb, nl);
      setHeading(t.heading);
      setDistance(t.distance);
      flash(o.kind === "water" ? "Splash! 💦" : "Out of bounds!");
      setMessage(o.kind === "water" ? "Penalty stroke. Dropped where it crossed the hazard." : "Penalty stroke. Replay from the same spot.");
      trail.current = [];
      setPhase("aim");
      return;
    }
    if (o.surface === "green") {
      // Automatic putting by ring.
      const putts = puttsFor(hole, o.at);
      if (used + putts > cap) return finishHole(cap, "", false);
      setStrokes(used);
      setBall(o.at);
      setLie("green");
      setMessage(putts === 1 ? "Inside the inner ring: one putt" : putts === 2 ? "Inside the dashed ring: two putts" : "Outside the rings: three putts");
      const pf = puttFrames(hole, o.at, putts);
      flight.current = { frames: pf.frames, events: pf.events, landingIndex: 0, traj: null, putts, t: 0, nextEvent: 0, start: o.at, endWait: 0 };
      return;
    }
    if (used >= cap) return finishHole(cap, "", false);
    setStrokes(used);
    setBall(o.at);
    setLie(o.surface);
    const t = defaultTarget(hole, o.at, o.surface);
    setHeading(t.heading);
    setDistance(t.distance);
    const yds = Math.round(f.traj.total);
    const left = Math.round(dist(o.at, hole.pin));
    if (o.surface === "bunker") setMessage(`In the sand · plays 20% short · ${left} to go`);
    else if (o.surface === "woods") setMessage(`In the trees · punch out · ${left} to go`);
    else setMessage(`${LIE_LABEL[o.surface]} · ${yds} yds · ${left} to go`);
    setPhase("aim");
  }

  useLayoutEffect(() => {
    strikeRef.current = strike;
    resolveRef.current = resolve;
  });

  // ---------- controls ----------
  const lockLine = () => {
    unlockAudio();
    sfx.tick();
    setMessage(null);
    setPhase("locked");
  };
  const startSwing = () => {
    if (phase !== "locked") return;
    meter.current = { value: 0, power: 0, phase: "rise" };
    setPhase("power");
  };
  const releaseSwing = () => {
    if (phase !== "power") return;
    meter.current.power = meter.current.value;
    meter.current.phase = "fall";
    setPhase("accuracy");
  };
  const snap = () => {
    if (phase !== "accuracy") return;
    strike(meter.current.power, meter.current.value * 100);
  };
  const nudge = (deg: number) => setHeading((h) => h + (deg * Math.PI) / 180);
  const changeDistance = (d: number) => setDistance((x) => Math.max(8, Math.min(maxDistance(lie), x + d)));

  const nextHole = useCallback(() => {
    trail.current = [];
    if (holeIdx >= 8) {
      setPhase("roundDone");
      if (!practice) {
        save(cardKey(date), { scores: scores as number[], mulliganUsed, cardUsed } satisfies SavedCard);
        remove(roundKey(date));
      }
      return;
    }
    const nh = course.holes[holeIdx + 1];
    const t = defaultTarget(nh, nh.tee, "tee");
    setBall(teeBall(nh));
    setLie("tee");
    setStrokes(0);
    setHeading(t.heading);
    setDistance(t.distance);
    setSnapshot(null);
    setMessage(`Hole ${holeIdx + 2} · Par ${nh.par} · ${nh.length} yds`);
    setHoleIdx(holeIdx + 1);
    setPhase("aim");
  }, [course, date, holeIdx, practice, scores, mulliganUsed, cardUsed]);

  const canMulligan = !mulliganUsed && !!snapshot && (phase === "aim" || (phase === "holeDone" && strokes > hole.par));
  const useMulligan = () => {
    if (!canMulligan || !snapshot) return;
    const s = snapshot;
    setBall(s.ball);
    setLie(s.lie);
    setStrokes(s.strokes);
    setHeading(s.heading);
    setDistance(s.distance);
    setScores(s.scores);
    setMulliganUsed(true);
    setSnapshot(null);
    trail.current = [];
    sfx.power();
    flash("Mulligan! 🔁");
    setMessage("Take it again. That one never happened.");
    setPhase("aim");
  };
  const toggleCard = () => {
    if (cardUsed) return;
    sfx.power();
    setCardArmed((a) => !a);
  };

  // Tap or drag on the course to move the target.
  const dragging = useRef(false);
  const aimFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = toWorld(fitView(hole, rect.width, rect.height), e.clientX - rect.left, e.clientY - rect.top);
    setHeading(Math.atan2(p.x - ball.x, p.y - ball.y));
    setDistance(Math.max(8, Math.min(maxDistance(lie), dist(ball, p) / lieFactor(lie))));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    unlockAudio();
    if (phase !== "aim") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    aimFromPointer(e);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragging.current && phase === "aim") aimFromPointer(e);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (phase === "aim" && e.code === "ArrowLeft") nudge(e.shiftKey ? -2 : -0.5);
      else if (phase === "aim" && e.code === "ArrowRight") nudge(e.shiftKey ? 2 : 0.5);
      else if (phase === "aim" && e.code === "ArrowUp") changeDistance(e.shiftKey ? 10 : 2);
      else if (phase === "aim" && e.code === "ArrowDown") changeDistance(e.shiftKey ? -10 : -2);
      else if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (e.repeat) return;
        if (phase === "intro") setPhase("aim");
        else if (phase === "aim") lockLine();
        else if (phase === "locked") startSwing();
        else if (phase === "accuracy") snap();
        else if (phase === "holeDone") nextHole();
      } else if (e.code === "Escape" && phase === "locked") setPhase("aim");
    };
    const up = (e: KeyboardEvent) => {
      if ((e.code === "Space" || e.code === "Enter") && phase === "power") releaseSwing();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  // ---------- derived ----------
  const played = scores.reduce<{ strokes: number; par: number }>(
    (a, s, i) => (s == null ? a : { strokes: a.strokes + s, par: a.par + course.holes[i].par }),
    { strokes: 0, par: 0 },
  );
  const toPar = played.strokes - played.par;
  const toPin = dist(ball, hole.pin);
  const windSpeed = Math.round(Math.hypot(hole.wind.x, hole.wind.y));
  const windDeg = (Math.atan2(hole.wind.x, hole.wind.y) * 180) / Math.PI;
  const aimDir = headingVec(heading);
  const targetY = ball.y + aimDir.y * distance * lieFactor(lie);
  const gustOnLine = hole.gusts.find((g) => Math.min(ball.y, targetY) < g.y1 && Math.max(ball.y, targetY) > g.y0);
  const elev = preview.landing.z - ball.z;
  const restSurface = surfaceAt(hole, preview.rest);
  const mPct = (v: number) => ((v - METER_MIN) / (MAX_POWER - METER_MIN)) * 100;

  const shareUrl = () => {
    const p = new URLSearchParams({ d: date, beat: String(toPar) });
    if (name.trim()) p.set("by", name.trim());
    return `${window.location.origin}/?${p.toString()}`;
  };
  const shareText = () => {
    const row = scores.map((s, i) => (s == null ? "⬜" : scoreEmoji(s, course.holes[i].par))).join("");
    return `⛳ Pin Seeker #${course.number} · ${course.name}\n${formatToPar(toPar)} (${played.strokes})${mulliganUsed ? " 🔁" : ""}\n${row}\nBeat me: ${shareUrl()}`;
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
      /* cancelled; fall back */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this and send it to your friends:", text);
    }
  };
  const replayPractice = () => {
    const h0 = course.holes[0];
    const t = defaultTarget(h0, h0.tee, "tee");
    setPractice(true);
    setScores(Array(9).fill(null));
    setBall(teeBall(h0));
    setLie("tee");
    setStrokes(0);
    setHeading(t.heading);
    setDistance(t.distance);
    setMulliganUsed(false);
    setCardUsed(false);
    setSnapshot(null);
    setHoleIdx(0);
    setMessage("Practice round: doesn't change your card");
    setPhase("aim");
  };
  const toggleMute = () => {
    const m = !isMuted();
    setMuted(m);
    setMutedState(m);
    save(MUTE_KEY, m);
  };
  const bg = `linear-gradient(180deg, ${hexColor(pal.skyTop)} 0%, ${hexColor(pal.fog)} 100%)`;
  const swinging = phase === "aim" || phase === "locked" || phase === "power" || phase === "accuracy" || phase === "flight";

  return (
    <div className="fixed inset-0 flex select-none flex-col bg-[#0e2416] text-white" style={{ touchAction: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#0b1d12] px-3 py-2 pt-[max(8px,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            ⛳ {course.name} · #{course.number}
            {practice ? " · practice" : ""}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black leading-none">Hole {hole.number}</span>
            <span className="text-sm text-white/80">
              Par {hole.par} · {hole.length} yds
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-white/10 px-2.5 py-1 text-center" title="Wind">
            <div className="flex items-center gap-1">
              <span className="inline-block text-base leading-none" style={{ transform: `rotate(${windDeg}deg)`, opacity: windSpeed ? 1 : 0.3 }}>
                ⬆
              </span>
              <span className="font-black tabular-nums">{windSpeed}</span>
              <span className="text-[10px] text-white/60">mph</span>
            </div>
          </div>
          <div className="rounded-xl bg-white/10 px-2.5 py-1 text-center">
            <div className="font-black tabular-nums leading-tight">{played.par ? formatToPar(toPar) : "E"}</div>
            {challenge && <div className="text-[9px] font-bold text-amber-300">beat {formatToPar(challenge.toPar)}</div>}
          </div>
          <button onClick={toggleMute} className="rounded-xl bg-white/10 px-2 py-1" aria-label="Toggle sound">
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      {/* Course */}
      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} className="absolute inset-0 block" />
        {callout && (
          <div key={callout.key} className="ps-pop pointer-events-none absolute inset-x-0 top-[32%] text-center text-4xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]">
            {callout.text}
          </div>
        )}
        {message && phase !== "holeDone" && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 max-w-[92%] -translate-x-1/2 truncate rounded-full bg-black/60 px-3 py-1 text-xs font-medium">
            {message}
          </div>
        )}
        {gustOnLine && (phase === "aim" || phase === "locked") && (
          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-sky-500/85 px-2.5 py-1 text-[11px] font-bold">
            💨 Gust on your line · {Math.round(Math.hypot(gustOnLine.wind.x, gustOnLine.wind.y))} mph
          </div>
        )}
        <Confetti fire={confetti.n} big={confetti.big} />

        {phase === "holeDone" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 p-4">
            <div className="ps-rise w-full max-w-xs rounded-3xl bg-white p-5 text-center text-slate-900 shadow-2xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Hole {hole.number} · Par {hole.par}
              </div>
              <div className="mt-1 text-6xl font-black tabular-nums" style={{ color: scoreColor(strokes, hole.par) }}>
                {strokes}
              </div>
              <div className="text-xl font-black">{message}</div>
              {holeNote && <div className="text-sm text-slate-500">{holeNote}</div>}
              <div className="mt-1 text-sm text-slate-500">Round: {formatToPar(toPar)}</div>
              <div className="mt-4 flex gap-2">
                {canMulligan && (
                  <button onClick={useMulligan} className="rounded-xl border border-amber-400 bg-amber-50 px-3 py-3 text-sm font-bold text-amber-800">
                    🔁 Mulligan
                  </button>
                )}
                <button onClick={nextHole} className="flex-1 rounded-xl bg-emerald-600 py-3 font-black text-white hover:bg-emerald-700" autoFocus>
                  {holeIdx >= 8 ? "See your card" : `Hole ${holeIdx + 2} →`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {swinging && (
        <div className="border-t border-white/10 bg-[#0b1d12] px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="text-lg font-black leading-tight">{club.name}</div>
              <div className="truncate text-xs text-white/75">
                {Math.round(preview.carry)} carry
                {Math.abs(elev) >= 1.5 ? ` · ${elev > 0 ? "▲" : "▼"}${Math.round(Math.abs(elev))} ${elev > 0 ? "uphill" : "downhill"}` : ""}
                {lieFactor(lie) < 1 ? ` · ${LIE_LABEL[lie]} −${Math.round((1 - lieFactor(lie)) * 100)}%` : ""}
                {restSurface === "green" ? ` · rolls to ${puttsFor(hole, preview.rest)}-putt` : ""}
              </div>
            </div>
            <div className="shrink-0 text-right text-xs text-white/75">
              <div className="font-semibold text-white">{Math.round(toPin)} to pin</div>
              <div>
                {LIE_LABEL[lie]} · stroke {Math.min(strokes + 1, maxStrokes(hole))}
              </div>
            </div>
          </div>

          <div className="mb-2 flex gap-2">
            <button
              onClick={useMulligan}
              disabled={!canMulligan}
              className={`flex-1 rounded-xl border px-2 py-1 text-left text-xs ${canMulligan ? "border-amber-300/70 bg-amber-400/20" : "border-white/10 bg-white/5 text-white/40"}`}
            >
              <div className="font-bold">🔁 Mulligan{mulliganUsed ? " · used" : ""}</div>
              <div className="text-[10px] opacity-80">{mulliganUsed ? "One per round" : snapshot ? "Redo your last shot" : "Once per round"}</div>
            </button>
            <button
              onClick={toggleCard}
              disabled={cardUsed || !(phase === "aim" || phase === "locked")}
              className={`flex-1 rounded-xl border px-2 py-1 text-left text-xs ${
                cardUsed ? "border-white/10 bg-white/5 text-white/40" : cardArmed ? "border-emerald-300 bg-emerald-500/40 shadow-[0_0_14px_rgba(52,211,153,0.6)]" : "border-emerald-300/50 bg-emerald-500/15"
              }`}
            >
              <div className="font-bold">
                {card.icon} {card.name}
                {cardUsed ? " · used" : cardArmed ? " · ON" : ""}
              </div>
              <div className="text-[10px] opacity-80">{cardArmed ? "Applies to this shot" : "Today's caddie card"}</div>
            </button>
          </div>

          <div className="relative h-7 overflow-hidden rounded-lg bg-black/50 ring-1 ring-white/15" aria-hidden>
            <div className="absolute inset-y-0 bg-gradient-to-r from-emerald-700 via-lime-500 to-amber-400 opacity-70" style={{ left: `${mPct(0)}%`, width: `${mPct(1) - mPct(0)}%` }} />
            <div className="absolute inset-y-0 right-0 bg-red-500/60" style={{ left: `${mPct(1)}%` }} />
            <div className="absolute inset-y-0 bg-white/90" style={{ left: `${mPct(-PURE_WINDOW / 100)}%`, width: `${mPct(PURE_WINDOW / 100) - mPct(-PURE_WINDOW / 100)}%` }} />
            <div className="absolute inset-y-0 w-[3px] -ml-[1.5px] bg-white" style={{ left: `${mPct(1)}%` }} />
            <div ref={powerMarkRef} className="absolute inset-y-0 w-1 -ml-0.5 bg-sky-300" style={{ opacity: 0 }} />
            <div ref={needleRef} className="ps-needle absolute -inset-y-0.5 w-1.5 -ml-[3px] rounded bg-white shadow-[0_0_8px_rgba(255,255,255,1)]" style={{ left: `${mPct(0)}%` }} />
          </div>
          <div className="mt-0.5 mb-2 flex justify-between px-0.5 text-[10px] text-white/55">
            <span>◀ snap on white = pure</span>
            <span>100% = your target</span>
          </div>

          {phase === "aim" ? (
            <div className="flex gap-1.5">
              <button onPointerDown={() => nudge(-0.6)} className="w-11 rounded-xl bg-white/15 text-xl font-bold active:bg-white/30" aria-label="Aim left">
                ‹
              </button>
              <div className="flex flex-col gap-1">
                <button onPointerDown={() => changeDistance(5)} className="h-6 w-11 rounded-lg bg-white/15 text-xs font-bold active:bg-white/30" aria-label="Longer">
                  +
                </button>
                <button onPointerDown={() => changeDistance(-5)} className="h-6 w-11 rounded-lg bg-white/15 text-xs font-bold active:bg-white/30" aria-label="Shorter">
                  −
                </button>
              </div>
              <button onClick={lockLine} className="flex-1 rounded-xl bg-white py-3.5 text-base font-black tracking-wide text-slate-900 active:scale-[0.98]">
                🔒 LOCK LINE
              </button>
              <button onPointerDown={() => nudge(0.6)} className="w-11 rounded-xl bg-white/15 text-xl font-bold active:bg-white/30" aria-label="Aim right">
                ›
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {phase === "locked" && (
                <button onClick={() => setPhase("aim")} className="w-20 rounded-xl bg-white/15 text-xs font-bold active:bg-white/30">
                  Unlock
                </button>
              )}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (phase === "locked") startSwing();
                  else if (phase === "accuracy") snap();
                }}
                onPointerUp={releaseSwing}
                onPointerLeave={releaseSwing}
                disabled={phase === "flight"}
                className={`flex-1 rounded-xl py-3.5 text-base font-black tracking-wide transition-colors ${
                  phase === "locked" ? "bg-amber-400 text-slate-900" : phase === "power" ? "bg-sky-400 text-slate-900" : phase === "accuracy" ? "bg-white text-slate-900" : "bg-white/10 text-white/40"
                }`}
              >
                {phase === "locked" ? "HOLD TO SWING" : phase === "power" ? "RELEASE TO SET POWER" : phase === "accuracy" ? "TAP ON THE WHITE" : "…"}
              </button>
            </div>
          )}
          {phase === "aim" && <div className="mt-1 text-center text-[10px] text-white/50">Tap or drag on the hole to set your target</div>}
        </div>
      )}

      {/* Intro */}
      {phase === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: bg }}>
          <div className="w-full max-w-sm rounded-3xl bg-white/95 p-6 text-slate-900 shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              ⛳ Pin Seeker #{course.number} · {isToday ? "Today" : date}
            </div>
            <h1 className="mt-1 text-3xl font-black leading-tight">{course.name}</h1>
            <div className="text-sm text-slate-500">
              {pal.label} · Par {course.par} · {course.holes.reduce((a, h) => a + h.length, 0).toLocaleString()} yds
            </div>
            {challenge && (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <b>{challenge.by}</b> shot <b>{formatToPar(challenge.toPar)}</b> here. Can you beat it?
              </div>
            )}
            <ol className="mt-4 space-y-2 text-sm text-slate-700">
              <li>
                <b>Aim.</b> Tap or drag on the hole to place your target. The dotted tail shows where it should roll.
              </li>
              <li>
                <b>Lock the line,</b> then hold to swing and release to set power. The white line hits your target.
              </li>
              <li>
                <b>Strike.</b> Tap as the needle crosses the white band. Early pulls left, late pushes right, pure flies straight and runs out.
              </li>
              <li>
                <b>Greens putt themselves.</b> Inner ring 1 putt, dashed ring 2, anywhere else 3.
              </li>
            </ol>
            <p className="mt-2 text-xs text-slate-500">Wind streaks show the breeze, blue bands are gusts. Slopes kick the ball, sand and trees cost distance, water costs a stroke.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-amber-50 p-2 text-amber-900">
                <div className="font-bold">🔁 Mulligan</div>
                Redo one shot per round.
              </div>
              <div className="rounded-xl bg-emerald-50 p-2 text-emerald-900">
                <div className="font-bold">
                  {card.icon} {card.name}
                </div>
                {card.blurb}
              </div>
            </div>
            <button
              onClick={() => {
                unlockAudio();
                setPhase("aim");
              }}
              className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-black text-white hover:bg-emerald-700"
              autoFocus
            >
              {resumed ? `Resume on hole ${holeIdx + 1}` : "Tee off"}
            </button>
          </div>
        </div>
      )}

      {/* Round complete */}
      {phase === "roundDone" && (
        <div className="absolute inset-0 overflow-y-auto p-4" style={{ background: bg }}>
          <div className="mx-auto max-w-md rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Pin Seeker #{course.number} · {course.name}
              </div>
              <div className="mt-2 text-7xl font-black tabular-nums">{formatToPar(toPar)}</div>
              <div className="text-slate-500">
                {played.strokes} strokes · par {course.par}
                {mulliganUsed ? " · 🔁 used" : ""}
              </div>
              {challenge && (
                <div
                  className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${
                    toPar < challenge.toPar ? "bg-green-100 text-green-800" : toPar === challenge.toPar ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {toPar < challenge.toPar
                    ? `You beat ${challenge.by} by ${challenge.toPar - toPar}! 🏆`
                    : toPar === challenge.toPar
                      ? `Dead level with ${challenge.by}.`
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
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: scores[i] == null ? "#cbd5e1" : scoreColor(scores[i]!, h.par) }}>
                        {scores[i] ?? "–"}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Your name (shows on the challenge)
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} placeholder="e.g. Big Hitter" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <button onClick={share} className="mt-3 w-full rounded-2xl bg-emerald-600 py-3 font-black text-white hover:bg-emerald-700">
              {copied ? "Copied! Paste it in the group chat" : "Challenge friends"}
            </button>
            <button onClick={replayPractice} className="mt-2 w-full rounded-2xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50">
              Play this course again (practice)
            </button>
            <div className="mt-4 text-center text-xs text-slate-500">
              {isToday ? "New course at midnight Eastern." : <a className="underline" href="/">Play today&apos;s course</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
