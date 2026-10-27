"use client";

import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  FileVideo,
  Sparkles,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
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
      const pred = await predictVideo(f);
      setResult(pred);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inference service encountered an error.");
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
      const response = await fetch(`/samples/${word}.mp4`);
      if (!response.ok) throw new Error("Sample file not found");
      const blob = await response.blob();
      const f = new File([blob], `${word}.mp4`, { type: "video/mp4" });
      choose(f);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      run(f);
    } catch {
      setError("Could not load the selected sample clip.");
    }
  }

  return (
    <div className="space-y-8">
      {/* ================= WORKSPACE STAGE: INPUT & RESULTS ================= */}
      <div ref={topRef} className="grid scroll-mt-24 gap-6 lg:grid-cols-2">
        
        {/* INPUT PANEL */}
        <section className="card flex flex-col">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <FileVideo className="h-4 w-4 text-sky-400" />
              <h2 className="card-title">Video Input Source</h2>
            </div>
            {file ? (
              <span className="flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-950/30 px-2.5 py-0.5 text-xs font-mono text-sky-300">
                <CheckCircle2 className="h-3 w-3 text-sky-400" />
                <span className="max-w-[140px] truncate sm:max-w-[200px]">{file.name}</span>
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">Awaiting clip</span>
            )}
          </div>

          <div className="card-body flex-1 flex flex-col justify-between space-y-4">
            {url ? (
              <div className="space-y-4">
                {/* Active Video Player Viewport */}
                <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-black shadow-md">
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
                      if (v.videoWidth && v.videoHeight) {
                        setAspect(v.videoWidth / v.videoHeight);
                      }
                    }}
                    className="aspect-video w-full object-contain bg-black"
                  />
                  {/* Overlay File Badge */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-mono text-slate-300 backdrop-blur-md">
                    <FileVideo className="h-3 w-3 text-sky-400" />
                    <span className="truncate max-w-[180px]">{file?.name}</span>
                  </div>
                </div>

                {/* Video Controls Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => run()}
                      disabled={!file || busy}
                      className="btn btn-primary"
                    >
                      {busy ? (
                        <>
                          <span className="spinner" />
                          <span>Extracting & Classifying...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Run Sign Detection</span>
                        </>
                      )}
                    </button>

                    {!busy && (
                      <button
                        onClick={() => choose(null)}
                        className="btn btn-secondary"
                        title="Remove clip"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-[var(--muted)]">
                    {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
                  </span>
                </div>
              </div>
            ) : (
              /* Drag-and-Drop Area */
              <label
                className="dropzone group relative flex min-h-[260px] flex-col items-center justify-center p-8 cursor-pointer rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]/20 hover:border-sky-400/50 hover:bg-sky-950/10 transition-all duration-200"
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
                  else setError("Please drop a valid video file (.mp4, .mov, or .webm).");
                }}
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => choose(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />

                <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-sky-400 shadow-sm group-hover:scale-110 group-hover:border-sky-400/50 group-hover:shadow-[0_0_20px_-3px_rgba(56,189,248,0.3)] transition-all duration-200">
                  <UploadCloud className="h-7 w-7" />
                </div>

                <p className="text-base font-semibold text-[var(--text)] group-hover:text-sky-300 transition-colors">
                  Upload video or drag & drop
                </p>
                <p className="mt-1 text-xs text-[var(--muted)] text-center max-w-xs">
                  Record or drop a clip of a single American Sign Language word
                </p>

                {/* Formats Pills */}
                <div className="mt-4 flex items-center gap-1.5">
                  {["MP4", "MOV", "WEBM"].map((fmt) => (
                    <span
                      key={fmt}
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-mono font-medium text-[var(--muted)]"
                    >
                      {fmt}
                    </span>
                  ))}
                </div>
              </label>
            )}

            {/* Error Banner */}
            {error && (
              <div className="alert alert-danger reveal-block flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="text-xs">{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* RESULTS PANEL */}
        <section className="card flex flex-col">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <h2 className="card-title">Prediction & Pose Inspection</h2>
            </div>
            {busy ? (
              <span className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
                <span className="spinner" />
                Processing
              </span>
            ) : result ? (
              <span className="rounded-full bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                Analysis Complete
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">Ready</span>
            )}
          </div>

          <div className="card-body flex-1">
            {result ? (
              <Results
                top5={result.top5}
                skeleton={result.skeleton}
                aspect={aspect}
              />
            ) : busy ? (
              /* Shimmering High-Tech Loading Skeleton */
              <div className="space-y-5 py-4" aria-busy>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>Extracting 75 Pose & Hand Keypoints...</span>
                    <span className="font-mono text-sky-400">Running</span>
                  </div>
                  <div className="skeleton h-10 w-48" />
                </div>

                <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    Evaluating Class Probabilities
                  </p>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between">
                        <div className="skeleton h-3 w-16" />
                        <div className="skeleton h-3 w-10" />
                      </div>
                      <div className="skeleton h-2 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyResult message="Upload a recorded gesture clip above, or select one from the vocabulary library below." />
            )}
          </div>
        </section>
      </div>

      {/* ================= SIGN VOCABULARY LIBRARY ================= */}
      <section className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-sky-400" />
            <h2 className="card-title">Pre-Recorded ASL Vocabulary Deck</h2>
          </div>
          <span className="text-xs text-[var(--muted)] hidden sm:inline">
            12 Baseline Evaluated Signs
          </span>
        </div>
        <div className="card-body">
          <SampleGrid
            selected={file?.name.replace(".mp4", "") ?? null}
            disabled={busy}
            onPick={useSample}
          />
        </div>
      </section>
    </div>
  );
}
