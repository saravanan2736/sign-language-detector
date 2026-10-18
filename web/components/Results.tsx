import type { Guess } from "@/lib/api";

export default function Results({ top5 }: { top5: Guess[] }) {
  if (!top5.length) return null;
  const best = top5[0];
  return (
    <div className="fade-up space-y-5" key={best.word + best.score}>
      <div className="rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] p-5 text-white shadow-lg shadow-indigo-300/40">
        <p className="text-xs uppercase tracking-wide text-white/75">Best guess</p>
        <p className="mt-1 text-4xl font-semibold uppercase tracking-tight">{best.word}</p>
        <p className="mt-1 text-sm text-white/80">{(best.score * 100).toFixed(1)}% confidence</p>
      </div>
      <ul className="space-y-3">
        {top5.map((g, i) => (
          <li key={g.word + i} className="text-sm">
            <div className="mb-1 flex justify-between">
              <span className="font-medium uppercase">{g.word}</span>
              <span className="tabular-nums text-[var(--muted)]">{(g.score * 100).toFixed(1)}%</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.max(2, g.score * 100)}%`,
                  animationDelay: `${i * 70}ms`,
                  background:
                    i === 0
                      ? "linear-gradient(90deg, var(--accent), var(--accent-2))"
                      : "linear-gradient(90deg, #a5b4fc, #c4b5fd)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
