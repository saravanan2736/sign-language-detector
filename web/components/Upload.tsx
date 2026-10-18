"use client";
import { useEffect, useState } from "react";
import { predictVideo, type Prediction } from "@/lib/api";
import Results from "./Results";

// strongest demo clips first
const SAMPLES = ["need", "drink", "no", "what", "mother", "help", "want", "eat", "go", "yes", "like", "who"];

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);

  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function run(f: File | null = file) {
    if (!f) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await predictVideo(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function choose(f: File | null) {
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function useSample(word: string) {
    try {
      const blob = await (await fetch(`/samples/${word}.mp4`)).blob();
      const f = new File([blob], `${word}.mp4`, { type: "video/mp4" });
      choose(f);
      run(f);
    } catch {
      setError("Could not load the sample clip.");
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f && f.type.startsWith("video/")) choose(f);
            else setError("Please drop a video file.");
          }}
          className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center text-sm transition-all duration-200 ${
            dragging
              ? "scale-[1.02] border-indigo-300 bg-indigo-400/15 text-white"
              : "border-indigo-300/30 bg-[var(--surface)] text-[var(--muted)] hover:border-indigo-300/70 hover:bg-[var(--surface-hover)]"
          }`}
        >
          <input type="file" accept="video/*" onChange={(e) => choose(e.target.files?.[0] ?? null)} className="sr-only" />
          <svg viewBox="0 0 24 24" className={`mx-auto mb-2 h-8 w-8 transition-transform ${dragging ? "-translate-y-1" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0L7 9m5-5 5 5" />
            <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          <p className="font-medium text-[var(--ink)]">{file ? file.name : "Drop a video here, or click to browse"}</p>
          <p className="mt-1 text-xs">One short clip of a single sign (mp4, mov, webm)</p>
        </label>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Or try a sample clip</p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((w) => (
              <button
                key={w}
                onClick={() => useSample(w)}
                disabled={busy}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 ${
                  file?.name === `${w}.mp4`
                    ? "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white"
                    : "bg-[var(--surface-hover)] text-[var(--ink)] hover:bg-white/20"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {url && <video src={url} controls className="max-h-72 w-full rounded-2xl bg-black shadow-md" />}
        <button onClick={() => run()} disabled={!file || busy} className="btn btn-primary">
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
            {busy ? "Analysing the clip..." : "Results will appear here"}
          </div>
        )}
      </div>
    </div>
  );
}
