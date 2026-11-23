import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { dist, generateCourse, heightAt, surfaceAt, todayEastern, type Hole, type PowerCard, type Surface } from "./lib/course";
import {
  MAX_POWER,
  PURE_WINDOW,
  PUTT_MAX_POWER,
  clubFor,
  defaultTarget,
  headingVec,
  isPuttLie,
  lieFactor,
  maxDistance,
  simulatePutt,
  simulateShot,
  PUTTER,
  type Mods,
  type Trajectory,
  type Vec3,
} from "./lib/physics";
import { formatToPar, scoreColor, scoreEmoji, scoreName } from "./lib/scoring";
import { GolfScene, type TerrainMap } from "./game/scene";
import { PALETTES } from "./game/theme";
import { isMuted, setMuted, sfx, unlockAudio } from "./game/audio";
import Confetti from "./game/Confetti";

type Challenge = { toPar: number; by: string } | null;
type Phase = "intro" | "flyover" | "aim" | "locked" | "power" | "accuracy" | "flight" | "holeDone" | "roundDone";

type Snapshot = { ball: Vec3; lie: Surface; strokes: number; heading: number; distance: number; scores: (number | null)[] };
type SavedRound = {
  holeIdx: number;
  scores: (number | null)[];
  ball: Vec3;
  lie: Surface;
  strokes: number;
  mulliganUsed: boolean;
  cardUsed: boolean;
};
type SavedCard = { scores: number[]; mulliganUsed: boolean; cardUsed: boolean };

const METER_MIN = -0.15;
const RISE = 0.95; // meter units / s
const FALL = 1.2;
const NAME_KEY = "pinseeker:name";
const MUTE_KEY = "pinseeker:muted";
const roundKey = (d: string) => `pinseeker:v2:round:${d}`;
const cardKey = (d: string) => `pinseeker:v2:card:${d}`;

const CARD_INFO: Record<PowerCard, { name: string; icon: string; blurb: string }> = {
  laser: { name: "Laser Line", icon: "🎯", blurb: "See your exact flight, wind and all, for one shot." },
  calm: { name: "Calm Air", icon: "🍃", blurb: "The wind drops to nothing for one shot." },
  turbo: { name: "Turbo Ball", icon: "🚀", blurb: "15% more distance on one shot." },
  magnet: { name: "Magnet Cup", icon: "🧲", blurb: "The hole gets three times bigger for one shot." },
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

type Flight = { traj: Trajectory; t: number; nextEvent: number; start: Vec3; putt: boolean; endWait: number };

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
  const [lastResult, setLastResult] = useState<{ holed: boolean } | null>(null);

  const hole = course.holes[holeIdx];
  const putt = isPuttLie(lie);
  const club = putt ? PUTTER : clubFor(distance, lie);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const powerMarkRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GolfScene | null>(null);
  const terrainRef = useRef<TerrainMap | null>(null);
  const meter = useRef({ value: 0, power: 0, phase: "idle" as "idle" | "rise" | "fall" });
  const flight = useRef<Flight | null>(null);
  const latest = useRef({ phase, ball, heading, distance, putt, hole, lie });
  const strikeRef = useRef<(power: number, error: number) => void>(() => {});
  const resolveRef = useRef<(f: Flight) => void>(() => {});
  const holeLoaded = useRef<number>(-1);

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
    if (practice || phase === "roundDone" || phase === "flight" || phase === "intro") return;
    save(roundKey(date), { holeIdx, scores, ball, lie, strokes, mulliganUsed, cardUsed } satisfies SavedRound);
  }, [date, practice, phase, holeIdx, scores, ball, lie, strokes, mulliganUsed, cardUsed]);

  // ---------- scene setup ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let scene: GolfScene;
    try {
      scene = new GolfScene(canvas);
    } catch {
      return;
    }
    sceneRef.current = scene;
    const ro = new ResizeObserver(() => scene.resize(wrap.clientWidth, wrap.clientHeight));
    ro.observe(wrap);
    scene.resize(wrap.clientWidth, wrap.clientHeight);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = latest.current;

      // Swing meter.
      const m = meter.current;
      const top = L.putt ? PUTT_MAX_POWER : MAX_POWER;
      if (m.phase === "rise") {
        m.value += RISE * (L.putt ? 1.15 : 1) * dt;
        if (m.value >= top) {
          m.value = top;
          m.power = top;
          if (L.putt) {
            m.phase = "idle";
            strikeRef.current(top, 0);
          } else {
            m.phase = "fall";
            setPhase("accuracy");
          }
        }
      } else if (m.phase === "fall") {
        m.value -= FALL * dt;
        if (m.value <= METER_MIN) {
          m.value = METER_MIN;
          strikeRef.current(m.power, METER_MIN * 100);
        }
      }
      const lo = L.putt ? 0 : METER_MIN;
      const pct = (v: number) => ((v - lo) / (top - lo)) * 100;
      if (needleRef.current) needleRef.current.style.left = `${pct(m.value)}%`;
      if (powerMarkRef.current) {
        powerMarkRef.current.style.opacity = m.phase === "fall" || L.phase === "flight" ? "1" : "0";
        powerMarkRef.current.style.left = `${pct(m.power)}%`;
      }

      // Ball flight playback.
      const f = flight.current;
      if (f) {
        const tr = f.traj;
        const idx0 = Math.min(tr.frames.length - 1, Math.floor(f.t * 60));
        const p0 = tr.frames[idx0];
        // Slow motion when the ball is rolling near the cup.
        const near = Math.hypot(p0.x - L.hole.pin.x, p0.y - L.hole.pin.y) < 2.5 && idx0 > tr.landingIndex;
        // Fast-forward long, slow rolls.
        const longRoll = idx0 > tr.landingIndex + 180 && !near;
        f.t += dt * (near ? 0.55 : longRoll ? 2.5 : 1);
        const idx = Math.min(tr.frames.length - 1, Math.floor(f.t * 60));
        const p = tr.frames[idx];
        scene.setBall(p);
        if (idx % 2 === 0 || idx === tr.frames.length - 1) scene.setTrail(tr.frames.slice(0, idx + 1));
        while (f.nextEvent < tr.events.length && tr.events[f.nextEvent].t <= f.t) {
          const ev = tr.events[f.nextEvent++];
          if (ev.kind === "bounce") sfx.bounce(f.putt ? 0.3 : 1);
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
        if (idx >= tr.frames.length - 1) {
          f.endWait += dt;
          if (f.endWait > 0.45) {
            flight.current = null;
            resolveRef.current(f);
          }
        }
      }

      scene.update(dt);

      // Wind compass relative to the camera.
      if (compassRef.current) {
        const w = L.hole.wind;
        const wh = Math.atan2(w.x, w.y);
        compassRef.current.style.transform = `rotate(${((wh - scene.cameraHeading()) * 180) / Math.PI}deg)`;
      }
      drawMinimap();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
    // drawMinimap reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- load hole ----------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || phase === "roundDone" || phase === "intro") return;
    if (holeLoaded.current === holeIdx) return;
    holeLoaded.current = holeIdx;
    terrainRef.current = scene.loadHole(hole, course.theme);
    scene.setBall(ball);
    scene.setTrail([]);
    scene.showSlopeDots(isPuttLie(lie));
    if (strokes === 0 && !resumed) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setPhase("flyover");
      scene.flyover(() => setPhase("aim"));
    } else {
      scene.setMode(isPuttLie(lie) ? "putt" : "aim");
      scene.snapCamera();
      setResumed(false);
    }
    // Only reload when the hole changes or play starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeIdx, phase === "intro", phase === "roundDone"]);

  // ---------- aim preview ----------
  const mods: Mods = useMemo(
    () => (cardArmed ? { calm: course.card === "calm", turbo: course.card === "turbo", magnet: course.card === "magnet" } : {}),
    [cardArmed, course.card],
  );
  const preview = useMemo(() => {
    if (phase === "intro" || phase === "roundDone") return null;
    if (putt) {
      const d = dir(heading);
      const len = Math.min(distance, 30);
      const pts: Vec3[] = [];
      for (let s = 0; s <= len; s += 0.5) pts.push({ x: ball.x + d.x * s, y: ball.y + d.y * s, z: heightAt(hole, ball.x + d.x * s, ball.y + d.y * s) });
      const laser =
        cardArmed && course.card === "laser"
          ? simulatePutt({ hole, start: ball, heading, distance, power: 1, rand: () => 0.5 }).frames
          : null;
      return { pts, target: hole.pin, landing: { ...hole.pin, z: heightAt(hole, hole.pin.x, hole.pin.y) }, laser, carry: 0 };
    }
    const calmHole = { ...hole, wind: { x: 0, y: 0 }, gusts: [] };
    const sim = simulateShot({ hole: calmHole, start: ball, lie, heading, distance, club, power: 1, error: 0, mods: { turbo: mods.turbo }, rand: () => 0.5 });
    const landing = sim.frames[sim.landingIndex];
    const laser =
      cardArmed && course.card === "laser"
        ? simulateShot({ hole, start: ball, lie, heading, distance, club, power: 1, error: 0, rand: () => 0.5 }).frames
        : null;
    return { pts: sim.frames.slice(0, sim.landingIndex + 1), target: landing, landing, laser, carry: sim.carry };
  }, [phase, putt, heading, distance, ball, hole, lie, club, cardArmed, course.card, mods.turbo]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const showAim = phase === "aim" || phase === "locked" || phase === "power" || phase === "accuracy" || phase === "flyover";
    if (!preview || !showAim) {
      scene.setAim(null);
      return;
    }
    scene.setAim({
      ball,
      heading,
      target: { x: preview.landing.x, y: preview.landing.y, z: preview.landing.z },
      preview: phase === "flyover" ? [] : preview.pts,
      laser: preview.laser,
      putt,
    });
  }, [preview, phase, ball, heading, putt]);

  useLayoutEffect(() => {
    latest.current = { phase, ball, heading, distance, putt, hole, lie };
  });

  // ---------- strike ----------
  function strike(power: number, error: number) {
    const m = meter.current;
    m.phase = "idle";
    const scene = sceneRef.current;
    const L = latest.current;
    const usedMods = mods;
    let traj: Trajectory;
    if (L.putt) {
      traj = simulatePutt({ hole, start: ball, heading, distance, power, mods: usedMods });
    } else {
      traj = simulateShot({ hole, start: ball, lie, heading, distance, club, power, error, mods: usedMods });
    }
    if (cardArmed) {
      setCardUsed(true);
      setCardArmed(false);
    }
    setSnapshot({ ball, lie, strokes, heading, distance, scores: [...scores] });
    flight.current = { traj, t: 0, nextEvent: 1, start: ball, putt: L.putt, endWait: 0 };
    sfx.swing(traj.pure, L.putt);
    if (!L.putt) {
      if (traj.pure) flash("PURE! ✨");
      else setMessage(error > 0 ? `Early by ${Math.round(error)}: pulled left` : `Late by ${Math.round(-error)}: pushed right`);
    }
    scene?.showSlopeDots(false);
    scene?.setMode(L.putt || distance < 45 ? "watch" : "follow");
    setPhase("flight");
  }

  // ---------- resolve ----------
  function resolve(f: Flight) {
    const o = f.traj.outcome;
    const used = strokes + 1;
    const cap = maxStrokes(hole);
    const scene = sceneRef.current;
    const finishHole = (total: number, holed: boolean) => {
      const capped = Math.min(total, cap);
      setStrokes(capped);
      setScores((prev) => {
        const n = [...prev];
        n[holeIdx] = capped;
        return n;
      });
      setLastResult({ holed });
      const diff = capped - hole.par;
      if (holed) {
        scene?.setMode("celebrate");
        if (capped === 1 || diff <= -2) {
          sfx.fanfare(capped === 1 ? "ace" : "eagle");
          setConfetti((c) => ({ n: c.n + 1, big: true }));
        } else if (diff === -1) {
          sfx.fanfare("birdie");
          setConfetti((c) => ({ n: c.n + 1, big: false }));
        } else if (diff === 0) sfx.fanfare("par");
        else sfx.sad();
      } else sfx.sad();
      setMessage(holed ? scoreName(capped, hole.par) : "Picked up");
      setPhase("holeDone");
    };

    if (o.kind === "holed") {
      setBall({ x: hole.pin.x, y: hole.pin.y, z: o.at.z });
      finishHole(used, true);
      return;
    }
    if (o.kind === "water" || o.kind === "ob") {
      const total = used + 1;
      if (total >= cap) return finishHole(cap, false);
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
      scene?.setTrail([]);
      scene?.setBall(nb);
      scene?.setMode(isPuttLie(nl) ? "putt" : "aim");
      scene?.showSlopeDots(isPuttLie(nl));
      setPhase("aim");
      return;
    }
    if (used >= cap) return finishHole(cap, false);
    setStrokes(used);
    setBall(o.at);
    setLie(o.surface);
    const t = defaultTarget(hole, o.at, o.surface);
    setHeading(t.heading);
    setDistance(t.distance);
    const yds = Math.round(f.traj.total);
    const left = Math.round(dist(o.at, hole.pin));
    if (o.surface === "green") setMessage(f.putt ? `${left > 1 ? `${left} yds` : `${Math.round(left * 3)} ft`} left` : `On the green · ${yds} yds`);
    else if (o.surface === "bunker") setMessage("In the sand. Plays 20% short.");
    else if (o.surface === "woods") setMessage("In the trees. Punch out, it plays short.");
    else if (o.surface === "rough") setMessage(`Rough · ${yds} yds · ${left} to go`);
    else setMessage(`${LIE_LABEL[o.surface]} · ${yds} yds · ${left} to go`);
    scene?.setMode(isPuttLie(o.surface) ? "putt" : "aim");
    scene?.showSlopeDots(isPuttLie(o.surface));
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
    const m = meter.current;
    m.value = 0;
    m.power = 0;
    m.phase = "rise";
    setPhase("power");
  };
  const releaseSwing = () => {
    if (phase !== "power") return;
    const m = meter.current;
    m.power = m.value;
    if (putt) {
      strike(m.power, 0);
      return;
    }
    m.phase = "fall";
    setPhase("accuracy");
  };
  const snap = () => {
    if (phase !== "accuracy") return;
    strike(meter.current.power, meter.current.value * 100);
  };

  const nudge = (deg: number) => {
    setHeading((h) => h + (deg * Math.PI) / 180);
  };

  const nextHole = useCallback(() => {
    const scene = sceneRef.current;
    scene?.setTrail([]);
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
    setMessage(null);
    setHoleIdx(holeIdx + 1);
    setPhase("flyover");
  }, [course, date, holeIdx, practice, scores, mulliganUsed, cardUsed]);

  const useMulligan = () => {
    if (!snapshot || mulliganUsed) return;
    const s = snapshot;
    setBall(s.ball);
    setLie(s.lie);
    setStrokes(s.strokes);
    setHeading(s.heading);
    setDistance(s.distance);
    setScores(s.scores);
    setMulliganUsed(true);
    setSnapshot(null);
    sfx.power();
    flash("Mulligan! 🔁");
    setMessage("Take it again. That one never happened.");
    const scene = sceneRef.current;
    scene?.setTrail([]);
    scene?.setBall(s.ball);
    scene?.setMode(isPuttLie(s.lie) ? "putt" : "aim");
    scene?.showSlopeDots(isPuttLie(s.lie));
    setPhase("aim");
  };

  const toggleCard = () => {
    if (cardUsed) return;
    sfx.power();
    setCardArmed((a) => !a);
  };

  // Drag on the course: sideways rotates the line, up/down changes distance. A tap aims at that spot.
  const drag = useRef<{ x: number; y: number; moved: boolean; h: number; d: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    unlockAudio();
    if (phase === "flyover") {
      sceneRef.current?.skipFlyover();
      return;
    }
    if (phase !== "aim") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, moved: false, h: heading, d: distance };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || phase !== "aim") return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (!d.moved) return;
    const fine = putt ? 0.0012 : 0.0022;
    setHeading(d.h + dx * fine);
    if (!putt) setDistance(Math.max(8, Math.min(maxDistance(lie), d.d - dy * 0.6)));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || phase !== "aim") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = sceneRef.current?.pick(e.clientX - rect.left, e.clientY - rect.top);
    if (p) aimAt(p);
  };
  const aimAt = (p: { x: number; y: number }) => {
    const h = Math.atan2(p.x - ball.x, p.y - ball.y);
    setHeading(h);
    if (!putt) setDistance(Math.max(8, Math.min(maxDistance(lie), dist(ball, p) / lieFactor(lie))));
  };

  // Keyboard.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "ArrowLeft" && phase === "aim") nudge(e.shiftKey ? -2 : -0.5);
      else if (e.code === "ArrowRight" && phase === "aim") nudge(e.shiftKey ? 2 : 0.5);
      else if (e.code === "ArrowUp" && phase === "aim" && !putt) setDistance((d) => Math.min(maxDistance(lie), d + 2));
      else if (e.code === "ArrowDown" && phase === "aim" && !putt) setDistance((d) => Math.max(8, d - 2));
      else if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (e.repeat) return;
        if (phase === "intro") setPhase("flyover");
        else if (phase === "flyover") sceneRef.current?.skipFlyover();
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

  // ---------- minimap ----------
  function drawMinimap() {
    const c = miniRef.current;
    const map = terrainRef.current;
    if (!c || !map) return;
    const L = latest.current;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    // Crop to the playable area.
    const pad = L.hole.corridorHalfWidth + 20;
    const xs = L.hole.path.map((p) => p.x);
    const cx0 = Math.min(...xs) - pad;
    const cx1 = Math.max(...xs) + pad;
    const cy0 = -20;
    const cy1 = L.hole.length + 30;
    const s = Math.min(W / (cx1 - cx0), H / (cy1 - cy0));
    const ox = (W - (cx1 - cx0) * s) / 2;
    const oy = (H - (cy1 - cy0) * s) / 2;
    const toM = (x: number, y: number) => ({ x: ox + (x - cx0) * s, y: oy + (cy1 - y) * s });
    ctx.clearRect(0, 0, W, H);
    const ppx = map.canvas.width / (map.x1 - map.x0);
    const ppy = map.canvas.height / (map.y1 - map.y0);
    ctx.drawImage(map.canvas, (cx0 - map.x0) * ppx, (map.y1 - cy1) * ppy, (cx1 - cx0) * ppx, (cy1 - cy0) * ppy, ox, oy, (cx1 - cx0) * s, (cy1 - cy0) * s);
    for (const w of L.hole.ponds)
      for (const ci of w.circles) {
        const q = toM(ci.x, ci.y);
        ctx.fillStyle = "#3b8fd0";
        ctx.beginPath();
        ctx.arc(q.x, q.y, ci.r * s, 0, Math.PI * 2);
        ctx.fill();
      }
    for (const g of L.hole.gusts) {
      const a = toM(cx0, g.y1);
      const b = toM(cx1, g.y0);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    for (const t of L.hole.trees) {
      const q = toM(t.x, t.y);
      ctx.fillStyle = "rgba(10,40,15,0.55)";
      ctx.beginPath();
      ctx.arc(q.x, q.y, Math.max(1, t.r * s), 0, Math.PI * 2);
      ctx.fill();
    }
    const pin = toM(L.hole.pin.x, L.hole.pin.y);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(pin.x, pin.y - 7, 5, 3.5);
    ctx.fillStyle = "#fff";
    ctx.fillRect(pin.x - 0.5, pin.y - 7, 1.2, 7);
    const b = toM(L.ball.x, L.ball.y);
    const f = flight.current;
    const live = f ? f.traj.frames[Math.min(f.traj.frames.length - 1, Math.floor(f.t * 60))] : null;
    if (!f && (L.phase === "aim" || L.phase === "locked" || L.phase === "power" || L.phase === "accuracy")) {
      const dd = L.putt ? Math.min(L.distance, 30) : L.distance * lieFactor(L.lie);
      const hv = dir(L.heading);
      const tq = toM(L.ball.x + hv.x * dd, L.ball.y + hv.y * dd);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(tq.x, tq.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(tq.x, tq.y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    const bp = live ? toM(live.x, live.y) : b;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const onMiniTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "aim") return;
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * c.width;
    const my = ((e.clientY - rect.top) / rect.height) * c.height;
    const pad = hole.corridorHalfWidth + 20;
    const xs = hole.path.map((p) => p.x);
    const cx0 = Math.min(...xs) - pad;
    const cx1 = Math.max(...xs) + pad;
    const cy0 = -20;
    const cy1 = hole.length + 30;
    const s = Math.min(c.width / (cx1 - cx0), c.height / (cy1 - cy0));
    const ox = (c.width - (cx1 - cx0) * s) / 2;
    const oy = (c.height - (cy1 - cy0) * s) / 2;
    aimAt({ x: cx0 + (mx - ox) / s, y: cy1 - (my - oy) / s });
  };

  // ---------- derived ----------
  const played = scores.reduce<{ strokes: number; par: number }>(
    (a, s, i) => (s == null ? a : { strokes: a.strokes + s, par: a.par + course.holes[i].par }),
    { strokes: 0, par: 0 },
  );
  const toPar = played.strokes - played.par;
  const toPin = dist(ball, hole.pin);
  const windSpeed = Math.round(Math.hypot(hole.wind.x, hole.wind.y));
  const aimDir = dir(heading);
  const targetPt = { x: ball.x + aimDir.x * distance * lieFactor(lie), y: ball.y + aimDir.y * distance * lieFactor(lie) };
  const gustOnLine = !putt
    ? hole.gusts.find((g) => (ball.y < g.y1 && targetPt.y > g.y0) || (ball.y > g.y0 && targetPt.y < g.y1))
    : undefined;
  const elev = preview ? preview.landing.z - ball.z : 0;
  const puttElev = putt ? heightAt(hole, hole.pin.x, hole.pin.y) - ball.z : 0;
  const meterTop = putt ? PUTT_MAX_POWER : MAX_POWER;
  const meterLo = putt ? 0 : METER_MIN;
  const mPct = (v: number) => ((v - meterLo) / (meterTop - meterLo)) * 100;
  const canMulligan = !mulliganUsed && !!snapshot && (phase === "aim" || (phase === "holeDone" && !lastResult?.holed) || (phase === "holeDone" && strokes > hole.par));
  const swingPhase = phase === "aim" || phase === "locked" || phase === "power" || phase === "accuracy";

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
    holeLoaded.current = -1;
    setHoleIdx(0);
    setPhase("flyover");
  };
  const toggleMute = () => {
    const m = !isMuted();
    setMuted(m);
    setMutedState(m);
    save(MUTE_KEY, m);
  };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-black text-white" style={{ touchAction: "none" }}>
      <div ref={wrapRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>

      {/* Top HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 pt-[max(8px,env(safe-area-inset-top))]">
        <div className="rounded-2xl bg-black/45 px-3 py-2 backdrop-blur-md">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            {course.name} · #{course.number}
            {practice ? " · practice" : ""}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black leading-none">{hole.number}</span>
            <span className="text-sm font-semibold text-white/85">
              Par {hole.par} · {hole.length} yds
            </span>
          </div>
          <div className="mt-0.5 text-xs text-white/70">
            Stroke {Math.min(strokes + 1, maxStrokes(hole))} · {LIE_LABEL[lie]}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-stretch gap-2">
            <div className="rounded-2xl bg-black/45 px-3 py-2 text-center backdrop-blur-md">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Wind</div>
              <div className="flex items-center justify-center gap-1.5">
                <div ref={compassRef} className="text-lg leading-none" style={{ opacity: windSpeed ? 1 : 0.3 }}>
                  ⬆
                </div>
                <span className="text-lg font-black tabular-nums">{windSpeed}</span>
                <span className="text-[10px] text-white/70">mph</span>
              </div>
            </div>
            <div className="rounded-2xl bg-black/45 px-3 py-2 text-center backdrop-blur-md">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Score</div>
              <div className="text-lg font-black tabular-nums leading-tight">{played.par ? formatToPar(toPar) : "E"}</div>
              {challenge && <div className="text-[10px] font-bold text-amber-300">beat {formatToPar(challenge.toPar)}</div>}
            </div>
          </div>
          <canvas
            ref={miniRef}
            width={180}
            height={300}
            onPointerDown={onMiniTap}
            className="pointer-events-auto h-[150px] w-[90px] rounded-xl border border-white/25 bg-black/30 shadow-lg"
          />
          <button onClick={toggleMute} className="pointer-events-auto rounded-full bg-black/45 px-2.5 py-1 text-sm backdrop-blur-md" aria-label="Toggle sound">
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      {/* Callouts */}
      {callout && (
        <div key={callout.key} className="ps-pop pointer-events-none absolute inset-x-0 top-[30%] text-center text-4xl font-black tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
          {callout.text}
        </div>
      )}
      {gustOnLine && swingPhase && (
        <div className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 rounded-full bg-sky-500/80 px-3 py-1 text-xs font-bold">
          💨 Gust zone on your line · {Math.round(Math.hypot(gustOnLine.wind.x, gustOnLine.wind.y))} mph
        </div>
      )}
      <Confetti fire={confetti.n} big={confetti.big} />

      {/* Bottom controls */}
      {phase !== "roundDone" && phase !== "intro" && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent px-3 pt-10 pb-[max(12px,env(safe-area-inset-bottom))]">
          {message && phase !== "holeDone" && <div className="mb-2 text-center text-sm font-medium text-white/90 drop-shadow">{message}</div>}

          {(phase === "aim" || phase === "locked" || phase === "power" || phase === "accuracy" || phase === "flight") && (
            <>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <div className="text-xl font-black leading-tight">{club.name}</div>
                  <div className="text-sm text-white/80">
                    {putt ? (
                      <>
                        {toPin < 1.5 ? `${Math.round(toPin * 3)} ft` : `${toPin.toFixed(1)} yds`} ·{" "}
                        {Math.abs(puttElev) < 0.08 ? "flat" : puttElev > 0 ? `uphill ${Math.round(puttElev * 36)}"` : `downhill ${Math.round(-puttElev * 36)}"`}
                      </>
                    ) : (
                      <>
                        {Math.round(preview?.carry ?? distance)} yds carry
                        {Math.abs(elev) >= 1.5 ? ` · ${elev > 0 ? "▲" : "▼"} ${Math.round(Math.abs(elev))}` : ""}
                        {lieFactor(lie) < 1 ? ` · ${LIE_LABEL[lie]} −${Math.round((1 - lieFactor(lie)) * 100)}%` : ""}
                      </>
                    )}
                  </div>
                </div>
                {!putt && (
                  <div className="text-right text-sm text-white/80">
                    <div className="font-semibold">{Math.round(toPin)} yds to pin</div>
                  </div>
                )}
              </div>

              {/* Power-ups */}
              <div className="mb-2 flex gap-2">
                <button
                  onClick={useMulligan}
                  disabled={!canMulligan}
                  className={`flex-1 rounded-xl border px-2 py-1.5 text-left text-xs transition ${
                    canMulligan ? "border-amber-300/70 bg-amber-400/20 text-white" : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  <div className="font-bold">🔁 Mulligan {mulliganUsed ? "· used" : ""}</div>
                  <div className="text-[10px] opacity-80">{mulliganUsed ? "One per round" : snapshot ? "Redo your last shot" : "Once per round"}</div>
                </button>
                <button
                  onClick={toggleCard}
                  disabled={cardUsed || !(phase === "aim" || phase === "locked")}
                  className={`flex-1 rounded-xl border px-2 py-1.5 text-left text-xs transition ${
                    cardUsed
                      ? "border-white/10 bg-white/5 text-white/40"
                      : cardArmed
                        ? "border-emerald-300 bg-emerald-500/40 text-white shadow-[0_0_16px_rgba(52,211,153,0.6)]"
                        : "border-emerald-300/50 bg-emerald-500/15 text-white"
                  }`}
                >
                  <div className="font-bold">
                    {card.icon} {card.name} {cardUsed ? "· used" : cardArmed ? "· ON" : ""}
                  </div>
                  <div className="text-[10px] opacity-80">{cardArmed ? "Applies to this shot" : "Today's caddie card"}</div>
                </button>
              </div>

              {/* Meter */}
              <div className="relative h-8 overflow-hidden rounded-lg bg-black/50 ring-1 ring-white/15" aria-hidden>
                <div
                  className="absolute inset-y-0 bg-gradient-to-r from-emerald-700 via-lime-500 to-amber-400 opacity-70"
                  style={{ left: `${mPct(0)}%`, width: `${mPct(1) - mPct(0)}%` }}
                />
                <div className="absolute inset-y-0 right-0 bg-red-500/60" style={{ left: `${mPct(1)}%` }} />
                {!putt && (
                  <div
                    className="absolute inset-y-0 bg-white/90"
                    style={{ left: `${mPct(-PURE_WINDOW / 100)}%`, width: `${mPct(PURE_WINDOW / 100) - mPct(-PURE_WINDOW / 100)}%` }}
                  />
                )}
                <div className="absolute inset-y-0 w-[3px] -ml-[1.5px] bg-white" style={{ left: `${mPct(1)}%` }} />
                <div ref={powerMarkRef} className="absolute inset-y-0 w-1 -ml-0.5 bg-sky-300" style={{ opacity: 0 }} />
                <div
                  ref={needleRef}
                  className="absolute -inset-y-0.5 w-1.5 -ml-[3px] rounded bg-white shadow-[0_0_8px_rgba(255,255,255,1)]"
                  style={{ left: `${mPct(0)}%` }}
                />
              </div>
              <div className="mt-0.5 mb-2 flex justify-between px-0.5 text-[10px] text-white/60">
                <span>{putt ? "softer" : "◀ snap on white = pure"}</span>
                <span>{putt ? "100% = hole distance on flat" : "100% = your target"}</span>
              </div>

              {/* Main action */}
              {phase === "aim" ? (
                <div className="flex gap-2">
                  <button onPointerDown={() => nudge(putt ? -0.3 : -0.6)} className="w-14 rounded-2xl bg-white/15 text-2xl font-bold active:bg-white/30" aria-label="Aim left">
                    ‹
                  </button>
                  <button onClick={lockLine} className="flex-1 rounded-2xl bg-white py-4 text-lg font-black tracking-wide text-slate-900 active:scale-[0.98]">
                    🔒 LOCK LINE
                  </button>
                  <button onPointerDown={() => nudge(putt ? 0.3 : 0.6)} className="w-14 rounded-2xl bg-white/15 text-2xl font-bold active:bg-white/30" aria-label="Aim right">
                    ›
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {phase === "locked" && (
                    <button onClick={() => setPhase("aim")} className="w-20 rounded-2xl bg-white/15 text-xs font-bold active:bg-white/30">
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
                    className={`flex-1 rounded-2xl py-4 text-lg font-black tracking-wide transition-colors ${
                      phase === "locked"
                        ? "bg-amber-400 text-slate-900"
                        : phase === "power"
                          ? "bg-sky-400 text-slate-900"
                          : phase === "accuracy"
                            ? "bg-white text-slate-900"
                            : "bg-white/10 text-white/40"
                    }`}
                  >
                    {phase === "locked"
                      ? putt
                        ? "HOLD TO PUTT"
                        : "HOLD TO SWING"
                      : phase === "power"
                        ? "RELEASE TO SET POWER"
                        : phase === "accuracy"
                          ? "TAP ON THE WHITE"
                          : "…"}
                  </button>
                </div>
              )}
              {phase === "aim" && (
                <div className="mt-1.5 text-center text-[11px] text-white/55">
                  {putt ? "Drag to aim · read the slope dots" : "Drag sideways to aim, up/down for distance · tap the map to target"}
                </div>
              )}
            </>
          )}

          {phase === "flyover" && (
            <div className="pb-4 text-center">
              <div className="text-3xl font-black">Hole {hole.number}</div>
              <div className="text-white/80">
                Par {hole.par} · {hole.length} yds · wind {windSpeed} mph
              </div>
              <div className="mt-2 text-xs text-white/60">Tap to skip</div>
            </div>
          )}
        </div>
      )}

      {/* Hole complete */}
      {phase === "holeDone" && (
        <div className="absolute inset-x-0 bottom-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="ps-rise mx-auto max-w-sm rounded-3xl bg-white/95 p-5 text-center text-slate-900 shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Hole {hole.number} · Par {hole.par}
            </div>
            <div className="mt-1 text-6xl font-black tabular-nums" style={{ color: scoreColor(strokes, hole.par) }}>
              {strokes}
            </div>
            <div className="text-xl font-black">{message}</div>
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

      {/* Intro */}
      {phase === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4" style={{ background: `linear-gradient(180deg, #${pal.skyTop.toString(16).padStart(6, "0")} 0%, #${pal.fog.toString(16).padStart(6, "0")} 100%)` }}>
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
                <b>Aim.</b> Drag the course to swing your line left or right, up and down for distance. Tap the minimap to jump to a target.
              </li>
              <li>
                <b>Lock it in,</b> then hold to swing. Release to set power: the white line hits your target.
              </li>
              <li>
                <b>Strike.</b> Tap as the needle crosses the white band. Early pulls left, late pushes right, pure flies true and runs out.
              </li>
              <li>
                <b>Putt for real.</b> Read the slope dots, they flow downhill.
              </li>
            </ol>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
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
                setPhase(resumed ? "aim" : "flyover");
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
        <div className="absolute inset-0 overflow-y-auto p-4" style={{ background: `linear-gradient(180deg, #${pal.skyTop.toString(16).padStart(6, "0")} 0%, #${pal.fog.toString(16).padStart(6, "0")} 100%)` }}>
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
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
              />
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

function dir(h: number) {
  return headingVec(h);
}
