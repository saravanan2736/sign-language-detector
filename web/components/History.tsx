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
    <div className="space-y-3">
      <button onClick={load} className="rounded border px-3 py-1.5 text-sm">
        Refresh
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows && rows.length === 0 && <p className="text-sm text-neutral-500">No predictions yet.</p>}
      {rows && rows.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-1">#</th>
              <th>Word</th>
              <th>Confidence</th>
              <th>Model</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1.5 tabular-nums">{r.id}</td>
                <td className="uppercase">{r.predicted_word}</td>
                <td className="tabular-nums">{(r.score * 100).toFixed(1)}%</td>
                <td>{r.model_version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
