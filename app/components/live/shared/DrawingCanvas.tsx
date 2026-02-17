"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  onExport?: (dataUrl: string) => void;
  disabled?: boolean;
}

const COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Yellow", value: "#FFD700" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
];

const LINE_WIDTH = 4;

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
}

export default function DrawingCanvas({ width = 400, height = 300, onExport, disabled = false }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentColor, setCurrentColor] = useState(COLORS[0].value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const scaleRef = useRef(1);

  // Draw a single stroke (handles both single-point dots and multi-point lines)
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (!stroke || !stroke.points || stroke.points.length === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.points.length === 1) {
      // Single point — draw as a filled circle (dot)
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, LINE_WIDTH / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // Redraw canvas from strokes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);

    for (const stroke of strokes) {
      drawStroke(ctx, stroke);
    }

    // Draw current in-progress stroke
    const current = currentStrokeRef.current;
    if (current && current.points && current.points.length > 0) {
      drawStroke(ctx, current);
    }
  }, [strokes, width, height, drawStroke]);

  // Fit canvas to container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const containerWidth = container.clientWidth;
    const scale = Math.min(containerWidth / width, 1);
    scaleRef.current = scale;
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
  }, [width, height]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    currentStrokeRef.current = { points: [point], color: currentColor };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(point);
      redraw();
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    // Keep strokes with even a single point (drawn as dots)
    if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 1) {
      setStrokes((prev) => [...prev, currentStrokeRef.current!]);
    }
    currentStrokeRef.current = null;
  }

  // Handle pointercancel (fires on mobile when OS intercepts the touch)
  function handlePointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    if (currentStrokeRef.current && currentStrokeRef.current.points.length >= 1) {
      setStrokes((prev) => [...prev, currentStrokeRef.current!]);
    }
    currentStrokeRef.current = null;
  }

  function handleClear() {
    setStrokes([]);
    currentStrokeRef.current = null;
    redraw();
  }

  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function exportCanvas(): string {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  }

  // Expose export to parent
  useEffect(() => {
    if (onExport) {
      // Re-export whenever strokes change
      const canvas = canvasRef.current;
      if (canvas) {
        onExport(canvas.toDataURL("image/png"));
      }
    }
  }, [strokes, onExport]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex justify-center rounded-xl overflow-hidden border-2 border-white/20 bg-[#1a1a2e]"
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerUp}
          className="touch-none cursor-crosshair"
          style={{ display: "block" }}
        />
      </div>

      {/* Controls */}
      {!disabled && (
        <div className="flex items-center justify-between gap-2">
          {/* Color picker */}
          <div className="flex gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCurrentColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  currentColor === c.value ? "border-[#FFD700] scale-110" : "border-white/30"
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all"
            >
              Undo
            </button>
            <button
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 hover:bg-red-500/30 text-red-300 disabled:opacity-30 transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to get the current data URL imperatively
DrawingCanvas.exportCanvas = function (canvasRef: React.RefObject<HTMLCanvasElement | null>): string {
  const canvas = canvasRef.current;
  if (!canvas) return "";
  return canvas.toDataURL("image/png");
};
