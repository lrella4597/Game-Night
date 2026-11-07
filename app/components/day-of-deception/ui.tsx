"use client";

// Day of Deception design kit. Every screen builds from these so the whole
// game looks like one product: ink background, serif headlines, gold for
// actions and clues, emerald for Loyal, crimson for Deceivers.

import React from "react";

export const display = "font-[family-name:var(--font-display)] font-normal tracking-[-0.01em]";

export type Tone = "neutral" | "loyal" | "deceiver" | "gold";

const GLOW: Record<Tone, string> = {
  neutral: "radial-gradient(60% 45% at 50% 0%, rgba(232,198,122,0.10) 0%, rgba(10,10,13,0) 70%)",
  gold: "radial-gradient(60% 45% at 50% 0%, rgba(232,198,122,0.16) 0%, rgba(10,10,13,0) 70%)",
  loyal: "radial-gradient(65% 50% at 50% 0%, rgba(52,211,153,0.16) 0%, rgba(10,10,13,0) 70%)",
  deceiver: "radial-gradient(65% 50% at 50% 0%, rgba(244,63,94,0.20) 0%, rgba(10,10,13,0) 70%)",
};

/** Full-height page with a soft colored glow at the top. */
export function Screen({
  tone = "neutral",
  center = false,
  wide = false,
  className = "",
  children,
}: {
  tone?: Tone;
  center?: boolean;
  wide?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] w-full bg-[#0A0A0D] text-white overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: GLOW[tone] }} />
      <div
        className={`relative mx-auto w-full px-5 py-8 ${wide ? "max-w-5xl md:px-8 md:py-12" : "max-w-md"} ${
          center ? "min-h-[calc(100dvh-3.5rem)] flex flex-col justify-center" : ""
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-medium uppercase tracking-[0.22em] text-white/45 ${className}`}>{children}</p>
  );
}

export function Title({
  children,
  className = "",
  size = "lg",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl";
}) {
  const sizes = { md: "text-3xl", lg: "text-[2.6rem] leading-[1.05]", xl: "text-5xl md:text-7xl leading-[1]" };
  const color = /(^|\s)text-(white|rose|emerald|\[)/.test(className) ? "" : "text-white";
  return <h1 className={`${display} ${sizes[size]} ${color} ${className}`}>{children}</h1>;
}

const CARD: Record<Tone, string> = {
  neutral: "border-white/[0.08] bg-white/[0.035]",
  gold: "border-[#E8C67A]/25 bg-[#E8C67A]/[0.06]",
  loyal: "border-emerald-400/20 bg-emerald-400/[0.06]",
  deceiver: "border-rose-400/25 bg-rose-500/[0.07]",
};

export function Card({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`rounded-2xl border p-5 ${CARD[tone]} ${className}`}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "loyal";

const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-[#E8C67A] text-[#18130A] hover:bg-[#F1D597] shadow-[0_8px_30px_-12px_rgba(232,198,122,0.6)]",
  secondary: "bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1]",
  ghost: "text-white/55 hover:text-white",
  danger: "bg-rose-600 text-white hover:bg-rose-500 shadow-[0_8px_30px_-12px_rgba(225,29,72,0.7)]",
  loyal: "bg-emerald-500 text-[#04140D] hover:bg-emerald-400",
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  full?: boolean;
}) {
  const sizes = { sm: "h-9 px-3.5 text-sm rounded-lg", md: "h-12 px-5 text-[15px] rounded-xl", lg: "h-14 px-7 text-base rounded-2xl" };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none ${
        sizes[size]
      } ${BUTTON[variant]} ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Avatar({
  name,
  color,
  size = "md",
  dim = false,
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
  dim?: boolean;
}) {
  const sizes = { sm: "w-7 h-7 text-[11px]", md: "w-9 h-9 text-xs", lg: "w-12 h-12 text-sm" };
  return (
    <span
      className={`${sizes[size]} shrink-0 inline-flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/15 ${
        dim ? "opacity-40" : ""
      }`}
      style={{ background: `linear-gradient(145deg, ${color}, ${color}B3)` }}
    >
      {initials(name)}
    </span>
  );
}

const PILL: Record<Tone, string> = {
  neutral: "bg-white/[0.07] text-white/70",
  gold: "bg-[#E8C67A]/15 text-[#F1D597]",
  loyal: "bg-emerald-400/15 text-emerald-300",
  deceiver: "bg-rose-500/15 text-rose-300",
};

export function Pill({ tone = "neutral", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${PILL[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Big countdown. Turns crimson for the last 30 seconds. */
export function Timer({
  seconds,
  running = true,
  size = "lg",
  label,
}: {
  seconds: number;
  running?: boolean;
  size?: "md" | "lg" | "xl";
  label?: string;
}) {
  const low = seconds <= 30 && seconds > 0;
  const sizes = { md: "text-4xl", lg: "text-6xl", xl: "text-8xl md:text-9xl" };
  return (
    <div className="flex flex-col items-center">
      <span
        className={`${sizes[size]} font-extralight tabular-nums tracking-tight transition-colors ${
          low ? "text-rose-400" : "text-white"
        } ${running ? "" : "opacity-40"}`}
      >
        {formatTime(seconds)}
      </span>
      {(label || !running) && (
        <span className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/40">
          {running ? label : "Paused"}
        </span>
      )}
    </div>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent ${className}`} />;
}

/** Round badge with an icon, used at the top of big moments. */
export function Emblem({ tone = "gold", icon, size = "md" }: { tone?: Tone; icon: IconName; size?: "md" | "lg" }) {
  const ring: Record<Tone, string> = {
    neutral: "border-white/15 bg-white/[0.04] text-white/80",
    gold: "border-[#E8C67A]/30 bg-[#E8C67A]/10 text-[#E8C67A]",
    loyal: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    deceiver: "border-rose-400/35 bg-rose-500/10 text-rose-300",
  };
  const s = size === "lg" ? "w-24 h-24" : "w-16 h-16";
  const i = size === "lg" ? "w-11 h-11" : "w-7 h-7";
  return (
    <div className={`${s} mx-auto rounded-full border flex items-center justify-center ${ring[tone]}`}>
      <Icon name={icon} className={i} />
    </div>
  );
}

export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <Screen center>
      <div className="flex flex-col items-center gap-4">
        <span className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#E8C67A] animate-spin" />
        <p className="text-sm text-white/45">{label}</p>
      </div>
    </Screen>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

export type IconName =
  | "shield" | "dagger" | "eye" | "clock" | "users" | "search" | "lock" | "check"
  | "trophy" | "send" | "spark" | "chat" | "vote" | "x" | "copy" | "arrow" | "bell"
  | "mask" | "flag" | "plus" | "alert";

const PATHS: Record<IconName, React.ReactNode> = {
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  dagger: <><path d="M12 2l1.5 3v9h-3V5z" /><path d="M7.5 14h9" /><path d="M12 14v5" /><circle cx="12" cy="20.5" r="1.3" /></>,
  eye: <><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  clock: <><circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3 2" /></>,
  users: <><path d="M16 20v-1.5a4 4 0 00-4-4H6a4 4 0 00-4 4V20" /><circle cx="9" cy="7.5" r="3.5" /><path d="M22 20v-1.5a4 4 0 00-3-3.85" /><path d="M16 4.15a3.5 3.5 0 010 6.7" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20.5 20.5L16 16" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V7.5a4 4 0 018 0V11" /></>,
  check: <path d="M4.5 12.5l5 5 10-11" />,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 6H4v1.5A3.5 3.5 0 007.5 11M17 6h3v1.5a3.5 3.5 0 01-3.5 3.5" /></>,
  send: <><path d="M21.5 2.5L10.5 13.5" /><path d="M21.5 2.5l-7 19-4-8-8-4z" /></>,
  spark: <path d="M12 2.5l2.2 6.3 6.3 2.2-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-2.2z" />,
  chat: <><path d="M21 12a8 8 0 01-11.8 7L3 21l2-6.2A8 8 0 1121 12z" /></>,
  vote: <><rect x="3.5" y="10" width="17" height="10.5" rx="2" /><path d="M8 10l3.5-6.5 5 2.7-2 3.8" /><path d="M8 15h8" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5V6a2.5 2.5 0 00-2.5-2.5H6A2.5 2.5 0 003.5 6v7A2.5 2.5 0 006 15.5h2.5" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  bell: <><path d="M18 9a6 6 0 10-12 0c0 7-3 8.5-3 8.5h18S18 16 18 9" /><path d="M10.3 21a2 2 0 003.4 0" /></>,
  mask: <><path d="M3 6.5c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0v4c0 4.5-3.5 8-6.5 8-1.4 0-2-1.2-2.5-2.5-.5 1.3-1.1 2.5-2.5 2.5-3 0-6.5-3.5-6.5-8z" /><path d="M7 11.5c.8-.8 2.2-.8 3 0M14 11.5c.8-.8 2.2-.8 3 0" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  alert: <><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
};

export function Icon({ name, className = "w-5 h-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
