"use client";
import { useEffect, useRef, useState } from "react";
import { predictVideo, type Prediction } from "@/lib/api";
import Results, { EmptyResult } from "./Results";
import SampleGrid from "./SampleGrid";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);
  const [aspect, setAspect] = useState(4 / 3);
  const topRef = useRef<HTMLDivElement>(null);

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
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      run(f);
    } catch {
      setError("Could not load the sample clip.");
    }
  }

  return (
    <div className="space-y-6">
      <div ref={topRef} className="grid scroll-mt-6 gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Input</h2>
            {file && <span className="max-w-[60%] truncate text-[13px] text-[var(--muted)]">{file.name}</span>}
          </div>
          <div className="card-body space-y-4">
            {url ? (
              <video
                key={url}
                src={url}
                controls
                loop
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
                }}
                className="reveal-block aspect-video w-full rounded-lg bg-black"
              />
            ) : (
              <label
                className="dropzone"
                data-dragging={dragging}
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
              >
                <input type="file" accept="video/*" onChange={(e) => choose(e.target.files?.[0] ?? null)} className="sr-only" />
                <svg viewBox="0 0 24 24" className="dropzone-icon mx-auto mb-3 h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                <span className="block font-medium text-[var(--text)]">Choose a video or drop it here</span>
                <span className="mt-1 block text-[13px]">One short clip of a single sign. MP4, MOV or WebM.</span>
              </label>
            )}

            <div className="flex items-center gap-3">
              <button onClick={() => run()} disabled={!file || busy} className="btn btn-primary">
                {busy && <span className="spinner" />}
                {busy ? "Analysing" : "Predict sign"}
              </button>
              {file && !busy && (
                <button onClick={() => choose(null)} className="btn btn-secondary">
                  Clear
                </button>
              )}
            </div>

            {error && <p className="alert alert-danger reveal-block">{error}</p>}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Result</h2>
            {busy && <span className="text-[13px] text-[var(--muted)]">Extracting landmarks and predicting</span>}
          </div>
          <div className="card-body">
            {result ? (
              <Results top5={result.top5} skeleton={result.skeleton} aspect={aspect} />
            ) : busy ? (
              <div className="space-y-3" aria-busy>
                <div className="skeleton h-9 w-40" />
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-4 w-full" />
                ))}
              </div>
            ) : (
              <EmptyResult message="Upload a clip or pick a sample below to see a prediction." />
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Sample clips</h2>
          <span className="text-[13px] text-[var(--muted)]">Hover to preview, click to predict</span>
        </div>
        <div className="card-body">
          <SampleGrid selected={file?.name.replace(".mp4", "") ?? null} disabled={busy} onPick={useSample} />
        </div>
      </section>
    </div>
  );
}
