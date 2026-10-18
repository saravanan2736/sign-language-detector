"use client";
import { useEffect, useState } from "react";
import { predictVideo, type Prediction } from "@/lib/api";
import Results from "./Results";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);

  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await predictVideo(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <label className="block rounded-2xl border-2 border-dashed border-indigo-300/30 bg-[var(--surface)] p-4 text-sm text-[var(--muted)] transition-colors hover:border-indigo-300/70 hover:bg-[var(--surface-hover)]">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
            className="file-input block w-full text-sm"
          />
          <span className="mt-2 block text-xs">{file ? file.name : "Choose a short clip of one sign (mp4, mov, webm)"}</span>
        </label>
        {url && <video src={url} controls className="max-h-72 w-full rounded-2xl bg-black shadow-md" />}
        <button onClick={run} disabled={!file || busy} className="btn btn-primary">
          {busy && <span className="spinner" />}
          {busy ? "Analysing..." : "Predict sign"}
        </button>
        {error && <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-300">{error}</p>}
      </div>
      <div>
        {result ? (
          <Results top5={result.top5} />
        ) : (
          <div className="grid h-full min-h-40 place-items-center rounded-2xl bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">
            Results will appear here
          </div>
        )}
      </div>
    </div>
  );
}
