"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseThinkMusicReturn {
  startThinkMusic: (durationSeconds: number) => void;
  startFinalThinkMusic: (durationSeconds: number) => void;
  startIntroMusic: () => void;
  stop: () => void;
  isPlaying: boolean;
}

export function useThinkMusic(): UseThinkMusicReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);
  const startTimeRef = useRef(0);
  const durationRef = useRef(0);

  function getSettings() {
    const enabled = localStorage.getItem("trivia_masters_sound_enabled");
    const vol = localStorage.getItem("trivia_masters_sound_volume");
    return {
      enabled: enabled !== "false",
      volume: vol !== null ? parseFloat(vol) : 0.5,
    };
  }

  function getCtx(): AudioContext | null {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        return null;
      }
    }
    return audioContextRef.current;
  }

  useEffect(() => {
    const initAudio = () => { getCtx(); };
    document.addEventListener("click", initAudio, { once: true });
    return () => document.removeEventListener("click", initAudio);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    activeNodesRef.current.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(0);
        gain.gain.setValueAtTime(0, 0);
        osc.stop();
      } catch {
        // Already stopped
      }
    });
    activeNodesRef.current = [];
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  // Helper: schedule a note on the given ctx
  function scheduleNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    vol: number,
    type: OscillatorType = "sine"
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.03);
    gain.gain.setValueAtTime(vol, startTime + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
    activeNodesRef.current.push({ osc, gain });
  }

  // ── Buzzer countdown ticks ────────────────────────────────────────────────

  const startThinkMusic = useCallback((durationSeconds: number) => {
    const { enabled, volume } = getSettings();
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    stop();
    setIsPlaying(true);
    startTimeRef.current = Date.now();
    durationRef.current = durationSeconds;

    function playTick() {
      const { enabled: nowEnabled, volume: nowVol } = getSettings();
      if (!nowEnabled) return;

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = durationRef.current - elapsed;
      if (remaining <= 0) { stop(); return; }

      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.connect(gain);
      gain.connect(ctx!.destination);

      const now = ctx!.currentTime;
      const freq = remaining <= 3 ? 1000 : remaining <= 5 ? 900 : 800;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(nowVol * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);

      if (remaining <= 3) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(playTick, 200);
      } else if (remaining <= 5) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(playTick, 350);
      }
    }

    intervalRef.current = setInterval(playTick, 500);
    playTick();
    timeoutRef.current = setTimeout(() => { stop(); }, durationSeconds * 1000);
  }, [stop]);

  // ── Iconic Final Jeopardy "Think!" music ──────────────────────────────────
  // Inspired by the classic game show think music feel.
  // Uses the recognizable rhythmic pattern and melodic contour.

  const startFinalThinkMusic = useCallback((durationSeconds: number) => {
    const { enabled, volume } = getSettings();
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    stop();
    setIsPlaying(true);

    const v = volume * 0.22;
    const bv = volume * 0.1; // bass volume

    // Tempo: ~107 BPM, each beat = 0.56s
    const beat = 0.56;

    // The iconic melody pattern — 30 seconds, builds and resolves
    // Two 15-second halves (A section and B section)
    const melodyA = [
      // Phrase 1: the classic alternating pattern
      { note: 523, start: 0,          dur: beat * 0.9 },   // C5
      { note: 349, start: beat,       dur: beat * 0.9 },   // F4
      { note: 523, start: beat * 2,   dur: beat * 0.9 },   // C5
      { note: 349, start: beat * 3,   dur: beat * 0.9 },   // F4
      // Phrase 2: stepwise rise
      { note: 523, start: beat * 4,   dur: beat * 0.9 },   // C5
      { note: 349, start: beat * 5,   dur: beat * 0.45 },  // F4
      { note: 330, start: beat * 5.5, dur: beat * 0.45 },  // E4
      { note: 349, start: beat * 6,   dur: beat * 0.9 },   // F4
      { note: 392, start: beat * 7,   dur: beat * 0.9 },   // G4
      // Phrase 3: tension
      { note: 440, start: beat * 8,   dur: beat * 0.9 },   // A4
      { note: 392, start: beat * 9,   dur: beat * 0.9 },   // G4
      { note: 349, start: beat * 10,  dur: beat * 0.9 },   // F4
      { note: 330, start: beat * 11,  dur: beat * 0.9 },   // E4
      // Phrase 4: resolve to repeat
      { note: 294, start: beat * 12,  dur: beat * 0.9 },   // D4
      { note: 330, start: beat * 13,  dur: beat * 0.9 },   // E4
      { note: 349, start: beat * 14,  dur: beat * 1.8 },   // F4 (held)
    ];

    const melodyB = [
      // Phrase 5: restatement higher
      { note: 587, start: 0,          dur: beat * 0.9 },   // D5
      { note: 440, start: beat,       dur: beat * 0.9 },   // A4
      { note: 587, start: beat * 2,   dur: beat * 0.9 },   // D5
      { note: 440, start: beat * 3,   dur: beat * 0.9 },   // A4
      // Phrase 6: descent
      { note: 587, start: beat * 4,   dur: beat * 0.9 },   // D5
      { note: 523, start: beat * 5,   dur: beat * 0.9 },   // C5
      { note: 494, start: beat * 6,   dur: beat * 0.9 },   // B4
      { note: 440, start: beat * 7,   dur: beat * 0.9 },   // A4
      // Phrase 7: climbing back
      { note: 392, start: beat * 8,   dur: beat * 0.9 },   // G4
      { note: 440, start: beat * 9,   dur: beat * 0.9 },   // A4
      { note: 494, start: beat * 10,  dur: beat * 0.9 },   // B4
      { note: 523, start: beat * 11,  dur: beat * 0.9 },   // C5
      // Phrase 8: final resolution
      { note: 587, start: beat * 12,  dur: beat * 0.9 },   // D5
      { note: 523, start: beat * 13,  dur: beat * 0.9 },   // C5
      { note: 523, start: beat * 14,  dur: beat * 1.8 },   // C5 (held)
    ];

    const halfDuration = beat * 16; // ~9 seconds per half
    const loopDuration = halfDuration * 2; // ~18 seconds full loop

    // Bass pattern (whole notes)
    const bassA = [
      { note: 175, start: 0,          dur: beat * 3.8 },  // F3
      { note: 175, start: beat * 4,   dur: beat * 3.8 },  // F3
      { note: 147, start: beat * 8,   dur: beat * 3.8 },  // D3
      { note: 131, start: beat * 12,  dur: beat * 3.8 },  // C3
    ];

    const bassB = [
      { note: 147, start: 0,          dur: beat * 3.8 },  // D3
      { note: 147, start: beat * 4,   dur: beat * 3.8 },  // D3
      { note: 165, start: beat * 8,   dur: beat * 3.8 },  // E3
      { note: 131, start: beat * 12,  dur: beat * 3.8 },  // C3
    ];

    const now = ctx.currentTime;
    const numLoops = Math.ceil(durationSeconds / loopDuration) + 1;

    for (let loop = 0; loop < numLoops; loop++) {
      const loopStart = now + loop * loopDuration;
      const endTime = now + durationSeconds;

      // A section melody
      melodyA.forEach((n) => {
        const t = loopStart + n.start;
        if (t >= endTime) return;
        scheduleNote(ctx, n.note, t, n.dur, v);
      });

      // A section bass
      bassA.forEach((n) => {
        const t = loopStart + n.start;
        if (t >= endTime) return;
        scheduleNote(ctx, n.note, t, n.dur, bv);
      });

      // B section melody
      melodyB.forEach((n) => {
        const t = loopStart + halfDuration + n.start;
        if (t >= endTime) return;
        scheduleNote(ctx, n.note, t, n.dur, v);
      });

      // B section bass
      bassB.forEach((n) => {
        const t = loopStart + halfDuration + n.start;
        if (t >= endTime) return;
        scheduleNote(ctx, n.note, t, n.dur, bv);
      });
    }

    timeoutRef.current = setTimeout(() => { stop(); }, durationSeconds * 1000);
  }, [stop]);

  // ── Iconic Jeopardy intro music ──────────────────────────────────────────
  // Energetic game show opening theme — bright, exciting fanfare

  const startIntroMusic = useCallback(() => {
    const { enabled, volume } = getSettings();
    if (!enabled) return;
    const ctx = getCtx();
    if (!ctx) return;

    stop();
    setIsPlaying(true);

    const v = volume * 0.28;
    const bv = volume * 0.15;
    const beat = 0.22; // Fast, energetic tempo

    const now = ctx.currentTime;

    // Bright ascending fanfare melody
    const introMelody = [
      // Opening ascending run
      { note: 349, start: 0,            dur: beat * 0.9 },  // F4
      { note: 440, start: beat,         dur: beat * 0.9 },  // A4
      { note: 523, start: beat * 2,     dur: beat * 0.9 },  // C5
      { note: 698, start: beat * 3,     dur: beat * 1.8 },  // F5 (held)
      // Rhythmic motif
      { note: 659, start: beat * 5,     dur: beat * 0.9 },  // E5
      { note: 698, start: beat * 6,     dur: beat * 0.9 },  // F5
      { note: 784, start: beat * 7,     dur: beat * 0.9 },  // G5
      { note: 880, start: beat * 8,     dur: beat * 1.8 },  // A5 (held)
      // Resolution phrase
      { note: 784, start: beat * 10,    dur: beat * 0.9 },  // G5
      { note: 698, start: beat * 11,    dur: beat * 0.9 },  // F5
      { note: 659, start: beat * 12,    dur: beat * 0.9 },  // E5
      { note: 698, start: beat * 13,    dur: beat * 0.9 },  // F5
      // Big finish
      { note: 880, start: beat * 14,    dur: beat * 0.9 },  // A5
      { note: 1047, start: beat * 15,   dur: beat * 0.9 },  // C6
      { note: 1397, start: beat * 16,   dur: beat * 3 },    // F6 (big held note)
    ];

    // Harmony layer (thirds below melody for richness)
    const introHarmony = [
      { note: 262, start: 0,            dur: beat * 0.9 },  // C4
      { note: 349, start: beat,         dur: beat * 0.9 },  // F4
      { note: 440, start: beat * 2,     dur: beat * 0.9 },  // A4
      { note: 523, start: beat * 3,     dur: beat * 1.8 },  // C5
      { note: 523, start: beat * 5,     dur: beat * 0.9 },  // C5
      { note: 523, start: beat * 6,     dur: beat * 0.9 },  // C5
      { note: 659, start: beat * 7,     dur: beat * 0.9 },  // E5
      { note: 698, start: beat * 8,     dur: beat * 1.8 },  // F5
      { note: 659, start: beat * 10,    dur: beat * 0.9 },  // E5
      { note: 523, start: beat * 11,    dur: beat * 0.9 },  // C5
      { note: 523, start: beat * 12,    dur: beat * 0.9 },  // C5
      { note: 523, start: beat * 13,    dur: beat * 0.9 },  // C5
      { note: 698, start: beat * 14,    dur: beat * 0.9 },  // F5
      { note: 880, start: beat * 15,    dur: beat * 0.9 },  // A5
      { note: 1047, start: beat * 16,   dur: beat * 3 },    // C6
    ];

    // Bass foundation
    const introBass = [
      { note: 175, start: 0,          dur: beat * 4 },   // F3
      { note: 175, start: beat * 5,   dur: beat * 4 },   // F3
      { note: 131, start: beat * 10,  dur: beat * 4 },   // C3
      { note: 175, start: beat * 14,  dur: beat * 5 },   // F3
    ];

    // Schedule all voices
    introMelody.forEach((n) => {
      scheduleNote(ctx, n.note, now + n.start, n.dur, v, "triangle");
    });

    introHarmony.forEach((n) => {
      scheduleNote(ctx, n.note, now + n.start, n.dur, v * 0.5, "sine");
    });

    introBass.forEach((n) => {
      scheduleNote(ctx, n.note, now + n.start, n.dur, bv, "sine");
    });

    const totalDuration = beat * 19;
    timeoutRef.current = setTimeout(() => { stop(); }, totalDuration * 1000);
  }, [stop]);

  return { startThinkMusic, startFinalThinkMusic, startIntroMusic, stop, isPlaying };
}
