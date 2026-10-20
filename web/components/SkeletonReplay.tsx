"use client";
import { useEffect, useRef, useState } from "react";

// Landmarks the model receives: 0-32 pose, 33-53 left hand, 54-74 right hand
const HAND: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
const BODY: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
];
const FPS = 15;

type Props = {
  frames: number[][][]; // (T, 75, 3)
  aspect?: number; // width / height of the source video
  mirror?: boolean;
};

export default function SkeletonReplay({ frames, aspect = 4 / 3, mirror = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  // restart whenever a new clip arrives
  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    setPlaying(true);
  }, [frames]);

  // advance frames
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % frames.length;
      setIndex(indexRef.current);
    }, 1000 / FPS);
    return () => clearInterval(t);
  }, [playing, frames]);

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frames[index];
    if (!canvas || !frame) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--primary-text").trim() || "#58a6ff";
    const muted = css.getPropertyValue("--muted").trim() || "#8b949e";
    const text = css.getPropertyValue("--text").trim() || "#e6edf3";

    const pt = (i: number) => {
      const [x, y, z] = frame[i];
      if (x === 0 && y === 0 && z === 0) return null;
      return [(mirror ? 1 - x : x) * w, y * h] as const;
    };
    const line = (pairs: [number, number][], offset: number, color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (const [a, b] of pairs) {
        const p = pt(a + offset);
        const q = pt(b + offset);
        if (p && q) {
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
        }
      }
      ctx.stroke();
    };
    const dots = (from: number, to: number, color: string, r: number) => {
      ctx.fillStyle = color;
      for (let i = from; i <= to; i++) {
        const p = pt(i);
        if (p) {
          ctx.beginPath();
          ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    line(BODY, 0, muted, 2);
    const nose = pt(0);
    if (nose) {
      ctx.strokeStyle = muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nose[0], nose[1], 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    dots(11, 16, muted, 3);
    line(HAND, 33, accent, 2);
    line(HAND, 54, accent, 2);
    dots(33, 74, text, 2.2);
  }, [frames, index, mirror]);

  if (frames.length === 0) return null;
  return (
    <div>
      <div className="relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)]" style={{ aspectRatio: aspect }}>
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => setPlaying((p) => !p)} className="btn btn-secondary !h-8 w-20" aria-label={playing ? "Pause replay" : "Play replay"}>
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(e) => {
            setPlaying(false);
            indexRef.current = Number(e.target.value);
            setIndex(indexRef.current);
          }}
          aria-label="Replay position"
          className="h-1 flex-1 cursor-pointer accent-[var(--primary)]"
        />
        <span className="w-14 text-right text-xs tabular-nums text-[var(--muted)]">
          {index + 1}/{frames.length}
        </span>
      </div>
    </div>
  );
}
