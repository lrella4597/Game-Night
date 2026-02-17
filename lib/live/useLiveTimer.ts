"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseLiveTimerOptions {
  onExpire?: () => void;
}

export function useLiveTimer({ onExpire }: UseLiveTimerOptions = {}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    setRemaining(null);
    endTimeRef.current = null;
  }, []);

  const startTimer = useCallback((durationSeconds: number) => {
    clearTimer();
    const endTime = Date.now() + durationSeconds * 1000;
    endTimeRef.current = endTime;
    setRemaining(durationSeconds);
    setRunning(true);

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTimeRef.current! - now) / 1000));
      setRemaining(left);

      if (left <= 0) {
        clearTimer();
        onExpireRef.current?.();
      }
    }, 200);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    if (!running || !endTimeRef.current) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
  }, [running]);

  const resumeTimer = useCallback(() => {
    if (remaining === null || remaining <= 0) return;
    const endTime = Date.now() + remaining * 1000;
    endTimeRef.current = endTime;
    setRunning(true);

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTimeRef.current! - now) / 1000));
      setRemaining(left);

      if (left <= 0) {
        clearTimer();
        onExpireRef.current?.();
      }
    }, 200);
  }, [remaining, clearTimer]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { remaining, running, startTimer, pauseTimer, resumeTimer, clearTimer };
}
