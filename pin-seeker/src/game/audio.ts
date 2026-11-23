// Small synthesized sound kit (no audio files needed).
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Call from a user gesture so iOS lets us play sound later. */
export function unlockAudio() {
  ac();
}

function noise(c: AudioContext, dur: number) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function burst(dur: number, filterFreq: number, vol: number, type: BiquadFilterType = "bandpass", when = 0, q = 1) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const src = noise(c, dur);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  tick() {
    tone(1200, 0.04, "square", 0.03);
  },
  swing(pure: boolean, putt = false) {
    if (putt) {
      tone(900, 0.06, "triangle", 0.25);
      burst(0.04, 2500, 0.2);
      return;
    }
    burst(0.18, 900, 0.18, "bandpass", 0, 0.7); // whoosh
    burst(0.05, 3500, 0.6, "highpass", 0.12); // contact
    tone(pure ? 1760 : 520, pure ? 0.35 : 0.12, pure ? "sine" : "triangle", pure ? 0.22 : 0.15, 0.12);
    if (pure) tone(2637, 0.3, "sine", 0.08, 0.14);
  },
  bounce(strength = 1) {
    tone(140, 0.08, "sine", 0.18 * strength, 0, 70);
    burst(0.05, 600, 0.12 * strength, "lowpass");
  },
  sand() {
    burst(0.25, 1800, 0.25, "bandpass", 0, 0.5);
  },
  tree() {
    burst(0.35, 3000, 0.25, "bandpass", 0, 0.4);
    tone(220, 0.08, "square", 0.08);
    tone(180, 0.08, "square", 0.08, 0.09);
  },
  splash() {
    burst(0.7, 700, 0.45, "lowpass");
    burst(0.4, 2400, 0.15, "bandpass", 0.05);
  },
  pin() {
    tone(2200, 0.4, "sine", 0.18);
    tone(3300, 0.3, "sine", 0.07);
  },
  lip() {
    tone(400, 0.06, "square", 0.12);
    tone(300, 0.08, "square", 0.1, 0.07);
  },
  cup() {
    [0, 0.07, 0.15, 0.21].forEach((w, i) => tone(600 + i * 120, 0.08, "triangle", 0.2, w));
  },
  fanfare(level: "par" | "birdie" | "eagle" | "ace") {
    const notes = level === "par" ? [523, 659] : level === "birdie" ? [523, 659, 784, 1047] : [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((n, i) => tone(n, 0.4, "triangle", 0.16, i * 0.09));
    if (level === "eagle" || level === "ace") burst(1.2, 4000, 0.06, "highpass", 0.2);
  },
  sad() {
    tone(392, 0.25, "triangle", 0.14);
    tone(330, 0.4, "triangle", 0.14, 0.22);
  },
  power() {
    tone(660, 0.12, "sine", 0.15, 0, 1320);
  },
};
