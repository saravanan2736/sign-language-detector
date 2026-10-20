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
      setError("Could not reach the backend. Check that it is running on port 8000.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">Recent predictions</h2>
        <button onClick={load} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {error && (
        <div className="card-body">
          <p className="alert alert-danger">{error}</p>
        </div>
      )}
      {!error && rows === null && <p className="card-body text-[var(--muted)]">Loading...</p>}
      {rows && rows.length === 0 && <p className="card-body text-[var(--muted)]">No predictions yet.</p>}
      {rows && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th className="w-20">ID</th>
              <th>Word</th>
              <th className="num">Confidence</th>
              <th>Model</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="tabular-nums text-[var(--muted)]">{r.id}</td>
                <td className="capitalize">{r.predicted_word}</td>
                <td className="num">{(r.score * 100).toFixed(1)}%</td>
                <td className="text-[var(--muted)]">{r.model_version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
