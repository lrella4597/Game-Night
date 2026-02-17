"use client";

import { useEffect, useRef, useState } from "react";

export type SoundEffect =
  | "tile-click"
  | "correct"
  | "incorrect"
  | "reveal"
  | "timer-tick"
  | "timer-end"
  | "power-up"
  | "daily-double"
  | "buzz-in"
  | "buzzer-open"
  | "times-up"
  | "round-intro"
  | "clue-select"
  | "final-category"
  | "final-reveal"
  | "game-over";

interface UseSoundEffectsReturn {
  play: (sound: SoundEffect) => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export function useSoundEffects(): UseSoundEffectsReturn {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Add click listener to initialize audio context (required by browsers)
    document.addEventListener("click", initAudio, { once: true });
    return () => document.removeEventListener("click", initAudio);
  }, []);

  // Load enabled/volume from localStorage
  useEffect(() => {
    const savedEnabled = localStorage.getItem("trivia_masters_sound_enabled");
    const savedVolume = localStorage.getItem("trivia_masters_sound_volume");

    if (savedEnabled !== null) {
      setEnabled(savedEnabled === "true");
    }
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Save enabled state to localStorage
  useEffect(() => {
    localStorage.setItem("trivia_masters_sound_enabled", enabled.toString());
  }, [enabled]);

  // Save volume to localStorage
  useEffect(() => {
    localStorage.setItem("trivia_masters_sound_volume", volume.toString());
  }, [volume]);

  const play = (sound: SoundEffect) => {
    if (!enabled || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // Helper to create an oscillator+gain pair connected to output
    function makeOsc(type: OscillatorType = "sine") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.connect(gain);
      gain.connect(ctx.destination);
      return { osc, gain };
    }

    // Create default oscillator and gain nodes (used by most sounds)
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Sound configurations
    const sounds: Record<SoundEffect, () => void> = {
      "tile-click": () => {
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
      },

      correct: () => {
        oscillator.frequency.setValueAtTime(523, now); // C5
        oscillator.frequency.setValueAtTime(659, now + 0.1); // E5
        oscillator.frequency.setValueAtTime(784, now + 0.2); // G5
        gainNode.gain.setValueAtTime(volume * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
      },

      incorrect: () => {
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.linearRampToValueAtTime(100, now + 0.3);
        gainNode.gain.setValueAtTime(volume * 0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.type = "sawtooth";
        oscillator.start(now);
        oscillator.stop(now + 0.3);
      },

      reveal: () => {
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        gainNode.gain.setValueAtTime(volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      },

      "timer-tick": () => {
        oscillator.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(volume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
      },

      "timer-end": () => {
        oscillator.frequency.setValueAtTime(300, now);
        gainNode.gain.setValueAtTime(volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        oscillator.type = "square";
        oscillator.start(now);
        oscillator.stop(now + 0.5);
      },

      "power-up": () => {
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        gainNode.gain.setValueAtTime(volume * 0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
      },

      "daily-double": () => {
        // Dramatic fanfare
        oscillator.frequency.setValueAtTime(523, now); // C5
        oscillator.frequency.setValueAtTime(659, now + 0.15); // E5
        oscillator.frequency.setValueAtTime(784, now + 0.3); // G5
        oscillator.frequency.setValueAtTime(1047, now + 0.45); // C6
        gainNode.gain.setValueAtTime(volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        oscillator.start(now);
        oscillator.stop(now + 0.7);
      },

      // ── New live game sounds ───────────────────────────────────────────

      "buzz-in": () => {
        // Jeopardy-style buzzer — short electronic buzz
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.linearRampToValueAtTime(180, now + 0.05);
        oscillator.frequency.linearRampToValueAtTime(140, now + 0.15);
        gainNode.gain.setValueAtTime(volume * 0.45, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
      },

      "buzzer-open": () => {
        // Two-note ascending chime — buzzers are active
        oscillator.frequency.setValueAtTime(784, now); // G5
        oscillator.frequency.setValueAtTime(1047, now + 0.1); // C6
        gainNode.gain.setValueAtTime(volume * 0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.25);
      },

      "times-up": () => {
        // Descending horn — time expired
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.linearRampToValueAtTime(150, now + 0.6);
        gainNode.gain.setValueAtTime(volume * 0.45, now);
        gainNode.gain.linearRampToValueAtTime(volume * 0.3, now + 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        oscillator.start(now);
        oscillator.stop(now + 0.6);
      },

      "round-intro": () => {
        // Dramatic ascending fanfare — round starts
        oscillator.type = "triangle";
        const notes = [262, 330, 392, 523, 659, 784, 1047]; // C4 E4 G4 C5 E5 G5 C6
        const step = 0.15;
        notes.forEach((freq, i) => {
          oscillator.frequency.setValueAtTime(freq, now + i * step);
        });
        gainNode.gain.setValueAtTime(volume * 0.45, now);
        gainNode.gain.setValueAtTime(volume * 0.5, now + step * 3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + notes.length * step + 0.3);
        oscillator.start(now);
        oscillator.stop(now + notes.length * step + 0.3);
      },

      "clue-select": () => {
        // Quick tone — host selects a clue
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.12);
        gainNode.gain.setValueAtTime(volume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        oscillator.start(now);
        oscillator.stop(now + 0.12);
      },

      "final-category": () => {
        // Deep dramatic chord — Final Jeopardy category reveal (3 oscillators)
        // Don't use the default oscillator — use makeOsc for all 3
        oscillator.disconnect();
        const freqs = [131, 165, 196]; // C3 E3 G3
        freqs.forEach((freq) => {
          const { osc, gain } = makeOsc("sine");
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.3);
          gain.gain.setValueAtTime(volume * 0.25, now + 1.0);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
          osc.start(now);
          osc.stop(now + 1.5);
        });
      },

      "final-reveal": () => {
        // Suspenseful sting — descending then ascending
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.linearRampToValueAtTime(300, now + 0.3);
        oscillator.frequency.linearRampToValueAtTime(800, now + 0.6);
        gainNode.gain.setValueAtTime(volume * 0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        oscillator.start(now);
        oscillator.stop(now + 0.7);
      },

      "game-over": () => {
        // Victory fanfare — two oscillators in harmony
        const notes1 = [523, 659, 784, 1047]; // C5 E5 G5 C6
        const notes2 = [659, 784, 1047, 1319]; // E5 G5 C6 E6
        const step = 0.18;

        // Melody voice
        const melody = makeOsc("triangle");
        notes1.forEach((freq, i) => {
          melody.osc.frequency.setValueAtTime(freq, now + i * step);
        });
        melody.gain.gain.setValueAtTime(volume * 0.35, now);
        melody.gain.gain.exponentialRampToValueAtTime(0.01, now + notes1.length * step + 0.3);
        melody.osc.start(now);
        melody.osc.stop(now + notes1.length * step + 0.3);

        // Harmony voice
        const harmony = makeOsc("sine");
        notes2.forEach((freq, i) => {
          harmony.osc.frequency.setValueAtTime(freq, now + i * step);
        });
        harmony.gain.gain.setValueAtTime(volume * 0.2, now);
        harmony.gain.gain.exponentialRampToValueAtTime(0.01, now + notes2.length * step + 0.3);
        harmony.osc.start(now);
        harmony.osc.stop(now + notes2.length * step + 0.3);

        // Don't use the default oscillator
        oscillator.disconnect();
      },
    };

    sounds[sound]();
  };

  return {
    play,
    enabled,
    setEnabled,
    volume,
    setVolume,
  };
}
