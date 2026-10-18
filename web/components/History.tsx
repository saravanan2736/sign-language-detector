"use client";
import { useCallback, useEffect, useState } from "react";
import { getHistory, type HistoryRow } from "@/lib/api";

export default function History() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await getHistory(30));
      setError(null);
    } catch {
      setError("Could not reach the backend. Is it running on port 8000?");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <button onClick={load} className="btn btn-ghost">
        Refresh
      </button>
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      {rows && rows.length === 0 && <p className="text-sm text-[var(--muted)]">No predictions yet.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white/50">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4">Word</th>
                <th className="px-4">Confidence</th>
                <th className="px-4">Model</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  className="fade-up border-t border-white/70 transition-colors hover:bg-white/70"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <td className="px-4 py-2.5 tabular-nums text-[var(--muted)]">{r.id}</td>
                  <td className="px-4 font-medium uppercase">{r.predicted_word}</td>
                  <td className="px-4 tabular-nums">{(r.score * 100).toFixed(1)}%</td>
                  <td className="px-4 text-[var(--muted)]">{r.model_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
