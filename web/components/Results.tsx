import type { Guess } from "@/lib/api";
import { WORDS } from "@/lib/words";

export function EmptyResult({ message }: { message: string }) {
  return (
    <div className="space-y-5">
      <p className="text-[var(--muted)]">{message}</p>
      <div>
        <p className="label mb-2">Supported words</p>
        <p className="text-[var(--text)]">{WORDS.join(", ")}</p>
      </div>
    </div>
  );
}

export default function Results({ top5 }: { top5: Guess[] }) {
  if (!top5.length) return null;
  const best = top5[0];
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label">Predicted word</p>
          <p className="text-3xl font-semibold capitalize leading-tight">{best.word}</p>
        </div>
        <div className="text-right">
          <p className="label">Confidence</p>
          <p className="text-2xl font-semibold tabular-nums leading-tight">{(best.score * 100).toFixed(1)}%</p>
        </div>
      </div>

      {best.score < 0.4 && (
        <p className="alert alert-warning">Low confidence. The correct word may be one of the other predictions.</p>
      )}

      <div>
        <p className="label mb-3">Top 5 predictions</p>
        <ul className="space-y-3">
          {top5.map((g, i) => (
            <li key={g.word + i} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3">
              <span className="truncate capitalize">{g.word}</span>
              <div className="bar-track">
                <div className={`bar-fill ${i === 0 ? "top" : ""}`} style={{ width: `${Math.max(1, g.score * 100)}%` }} />
              </div>
              <span className="text-right tabular-nums text-[var(--muted)]">{(g.score * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
