"use client";
import { useEffect, useState } from "react";
import { predictVideo, type Prediction } from "@/lib/api";
import Results, { EmptyResult } from "./Results";

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
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Input</h2>
        </div>
        <div className="card-body space-y-5">
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
            <span className="block font-medium text-[var(--text)]">{file ? file.name : "Choose a video or drop it here"}</span>
            <span className="mt-1 block text-[13px]">One short clip of a single sign. MP4, MOV or WebM.</span>
          </label>

          <div>
            <p className="label mb-2">Sample clips</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((w) => (
                <button
                  key={w}
                  onClick={() => useSample(w)}
                  disabled={busy}
                  aria-pressed={file?.name === `${w}.mp4`}
                  className="chip capitalize"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {url && <video src={url} controls className="aspect-video w-full rounded-lg bg-black" />}

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

          {error && <p className="alert alert-danger">{error}</p>}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Result</h2>
        </div>
        <div className="card-body">
          {result ? (
            <Results top5={result.top5} />
          ) : (
            <EmptyResult message={busy ? "Analysing the clip..." : "Upload a clip or pick a sample to see a prediction."} />
          )}
        </div>
      </section>
    </div>
  );
}
