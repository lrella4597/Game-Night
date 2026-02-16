"use client";

import { useEffect, useCallback } from "react";

export interface KeyboardShortcutHandlers {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onNumber?: (num: number) => void; // 1-9 for team selection
  onToggleSound?: () => void; // S key
  onToggleHelp?: () => void; // H key or ?
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers, enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          handlers.onArrowUp?.();
          break;

        case "ArrowDown":
          e.preventDefault();
          handlers.onArrowDown?.();
          break;

        case "ArrowLeft":
          e.preventDefault();
          handlers.onArrowLeft?.();
          break;

        case "ArrowRight":
          e.preventDefault();
          handlers.onArrowRight?.();
          break;

        case "Enter":
          e.preventDefault();
          handlers.onEnter?.();
          break;

        case "Escape":
          e.preventDefault();
          handlers.onEscape?.();
          break;

        case " ": // Space bar
          e.preventDefault();
          handlers.onSpace?.();
          break;

        case "s":
        case "S":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onToggleSound?.();
          }
          break;

        case "h":
        case "H":
        case "?":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            handlers.onToggleHelp?.();
          }
          break;

        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          handlers.onNumber?.(parseInt(e.key));
          break;
      }
    },
    [handlers, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}
