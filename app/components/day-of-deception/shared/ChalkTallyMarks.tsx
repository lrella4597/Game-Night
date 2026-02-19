"use client";

import React, { useMemo } from "react";

interface ChalkTallyMarksProps {
  count: number;
  maxVisible?: number;
  animate?: boolean;
  className?: string;
}

// Dimensions for a single tally mark stroke
const MARK_HEIGHT = 32;
const MARK_WIDTH = 8;
const GROUP_SPACING = 18;
const MARK_SPACING = 6;
const STROKE_WIDTH = 2.5;
const DIAGONAL_EXTRA_WIDTH = 4;

// A single vertical tally line
function VerticalMark({
  x,
  index,
  animate,
}: {
  x: number;
  index: number;
  animate: boolean;
}) {
  const length = MARK_HEIGHT;
  const opacity = 0.75 + Math.random() * 0.2; // slight variation baked per-render

  return (
    <line
      x1={x}
      y1={2}
      x2={x}
      y2={2 + MARK_HEIGHT}
      stroke={`rgba(255, 255, 255, ${opacity})`}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      {...(animate
        ? {
            strokeDasharray: length,
            strokeDashoffset: length,
            style: {
              animation: `chalkDraw 0.35s ease-out ${index * 0.2}s forwards`,
            },
          }
        : {})}
    />
  );
}

// The diagonal strike-through for a group of 5
function DiagonalMark({
  x,
  index,
  animate,
}: {
  x: number;
  index: number;
  animate: boolean;
}) {
  const x1 = x - DIAGONAL_EXTRA_WIDTH;
  const y1 = 2 + MARK_HEIGHT - 2;
  const x2 = x + (MARK_SPACING + MARK_WIDTH) * 3 + MARK_WIDTH + DIAGONAL_EXTRA_WIDTH;
  const y2 = 4;
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const opacity = 0.7 + Math.random() * 0.2;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={`rgba(255, 255, 255, ${opacity})`}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      {...(animate
        ? {
            strokeDasharray: length,
            strokeDashoffset: length,
            style: {
              animation: `chalkDraw 0.4s ease-out ${index * 0.2}s forwards`,
            },
          }
        : {})}
    />
  );
}

export default function ChalkTallyMarks({
  count,
  maxVisible,
  animate = false,
  className = "",
}: ChalkTallyMarksProps) {
  const visibleCount = maxVisible !== undefined ? Math.min(count, maxVisible) : count;

  // Build the tally mark layout
  const { marks, totalWidth } = useMemo(() => {
    const elements: Array<{
      type: "vertical" | "diagonal";
      x: number;
      globalIndex: number;
    }> = [];

    const fullGroups = Math.floor(visibleCount / 5);
    const remainder = visibleCount % 5;
    let cursorX = 4; // left padding
    let globalIndex = 0;

    for (let g = 0; g < fullGroups; g++) {
      const groupStartX = cursorX;

      // Four vertical marks
      for (let m = 0; m < 4; m++) {
        elements.push({
          type: "vertical",
          x: cursorX + m * (MARK_WIDTH + MARK_SPACING),
          globalIndex: globalIndex++,
        });
      }

      // Diagonal strike-through
      elements.push({
        type: "diagonal",
        x: groupStartX,
        globalIndex: globalIndex++,
      });

      cursorX += 4 * (MARK_WIDTH + MARK_SPACING) + GROUP_SPACING;
    }

    // Remaining vertical marks (partial group)
    for (let m = 0; m < remainder; m++) {
      elements.push({
        type: "vertical",
        x: cursorX + m * (MARK_WIDTH + MARK_SPACING),
        globalIndex: globalIndex++,
      });
    }

    if (remainder > 0) {
      cursorX += remainder * (MARK_WIDTH + MARK_SPACING);
    }

    return { marks: elements, totalWidth: cursorX + 4 }; // right padding
  }, [visibleCount]);

  if (visibleCount <= 0) {
    return null;
  }

  return (
    <>
      {/* Inline keyframes for the chalk draw animation */}
      {animate && (
        <style>{`
          @keyframes chalkDraw {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      )}

      <svg
        width={totalWidth}
        height={MARK_HEIGHT + 6}
        viewBox={`0 0 ${totalWidth} ${MARK_HEIGHT + 6}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label={`${visibleCount} vote${visibleCount !== 1 ? "s" : ""}`}
        role="img"
      >
        {marks.map((mark, i) =>
          mark.type === "vertical" ? (
            <VerticalMark
              key={`v-${i}`}
              x={mark.x}
              index={mark.globalIndex}
              animate={animate}
            />
          ) : (
            <DiagonalMark
              key={`d-${i}`}
              x={mark.x}
              index={mark.globalIndex}
              animate={animate}
            />
          )
        )}
      </svg>
    </>
  );
}
