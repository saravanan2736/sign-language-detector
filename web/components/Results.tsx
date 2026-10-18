import type { Guess } from "@/lib/api";

export default function Results({ top5 }: { top5: Guess[] }) {
  if (!top5.length) return null;
  const [best, ...rest] = top5;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-neutral-500">Best guess</p>
        <p className="text-4xl font-semibold tracking-tight uppercase">{best.word}</p>
        <p className="text-sm text-neutral-500">{(best.score * 100).toFixed(1)}% confidence</p>
      </div>
      <ul className="space-y-2">
        {[best, ...rest].map((g, i) => (
          <li key={g.word + i} className="text-sm">
            <div className="flex justify-between">
              <span className="uppercase">{g.word}</span>
              <span className="tabular-nums text-neutral-500">{(g.score * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded bg-neutral-200 dark:bg-neutral-800">
              <div
                className={`h-1.5 rounded ${i === 0 ? "bg-emerald-600" : "bg-neutral-400"}`}
                style={{ width: `${Math.max(2, g.score * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
