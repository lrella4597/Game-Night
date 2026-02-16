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
  | "daily-double";

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

    // Create oscillator and gain nodes
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
