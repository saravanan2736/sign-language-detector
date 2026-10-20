"use client";
import { useEffect, useState } from "react";
import type { Guess } from "@/lib/api";
import { WORDS } from "@/lib/words";
import SkeletonReplay from "./SkeletonReplay";

export function EmptyResult({ message }: { message: string }) {
  return (
    <div className="space-y-5">
      <p className="text-[var(--muted)]">{message}</p>
      <div>
        <p className="label mb-2">Supported words</p>
        <div className="flex flex-wrap gap-2">
          {WORDS.map((w) => (
            <span key={w} className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[13px] capitalize">
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function useCountUp(target: number, ms = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setValue(target);
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

type Props = {
  top5: Guess[];
  skeleton?: number[][][];
  aspect?: number;
  mirror?: boolean;
};

function ResultsInner({ top5, skeleton, aspect, mirror }: Props) {
  const best = top5[0];
  const pct = useCountUp(best.score * 100);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="label">Predicted word</p>
          <p className="text-3xl font-semibold leading-tight" aria-label={best.word}>
            {(best.word.charAt(0).toUpperCase() + best.word.slice(1)).split("").map((c, i) => (
              <span key={i} className="reveal-char" style={{ animationDelay: `${i * 45}ms` }} aria-hidden>
                {c}
              </span>
            ))}
          </p>
        </div>
        <div className="text-right">
          <p className="label">Confidence</p>
          <p className="text-2xl font-semibold tabular-nums leading-tight">{pct.toFixed(1)}%</p>
        </div>
      </div>

      {best.score < 0.4 && (
        <p className="alert alert-warning reveal-block">Low confidence. The correct word may be one of the other predictions.</p>
      )}

      <div>
        <p className="label mb-3">Top 5 predictions</p>
        <ul className="space-y-3">
          {top5.map((g, i) => (
            <li
              key={g.word}
              className="reveal-block grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              <span className={`truncate capitalize ${i === 0 ? "font-medium" : ""}`}>{g.word}</span>
              <div className="bar-track">
                <div
                  className={`bar-fill ${i === 0 ? "top" : ""}`}
                  style={{
                    width: "100%",
                    transform: `scaleX(${grown ? Math.max(0.01, g.score) : 0})`,
                    transitionDelay: `${150 + i * 70}ms`,
                  }}
                />
              </div>
              <span className="text-right tabular-nums text-[var(--muted)]">{(g.score * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {skeleton && skeleton.length > 0 && (
        <div className="reveal-block" style={{ animationDelay: "450ms" }}>
          <p className="label mb-3">What the model saw</p>
          <SkeletonReplay frames={skeleton} aspect={aspect} mirror={mirror} />
        </div>
      )}
    </div>
  );
}

export default function Results(props: Props) {
  if (!props.top5.length) return null;
  // remount when the prediction changes so the animations replay
  const signature = props.top5.map((g) => `${g.word}${g.score.toFixed(3)}`).join("|");
  return <ResultsInner key={signature} {...props} />;
}
