"use client";

import React from "react";

interface ChalkTextProps {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const sizeClasses: Record<NonNullable<ChalkTextProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
  "2xl": "text-5xl",
};

export default function ChalkText({
  children,
  as: Tag = "span",
  size = "md",
  className = "",
}: ChalkTextProps) {
  return (
    <Tag
      className={`font-[family-name:var(--font-chalk)] ${sizeClasses[size]} ${className}`}
      style={{
        color: "rgba(255, 255, 255, 0.85)",
        textShadow:
          "1px 1px 2px rgba(255, 255, 255, 0.1), 0 0 10px rgba(255, 255, 255, 0.05)",
      }}
    >
      {children}
    </Tag>
  );
}
