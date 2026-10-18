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
        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
            setError(null);
          }}
          className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-white dark:file:bg-neutral-100 dark:file:text-neutral-900"
        />
        {url && <video src={url} controls className="max-h-72 w-full rounded bg-black" />}
        <button
          onClick={run}
          disabled={!file || busy}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Analysing..." : "Predict sign"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div>{result ? <Results top5={result.top5} /> : <p className="text-sm text-neutral-500">Upload a short clip of one sign.</p>}</div>
    </div>
  );
}
