"use client";

import { useMemo, useRef, useState } from "react";
import { Play, Check, Film, Sparkles } from "lucide-react";

// strongest demo clips first
export const SAMPLES = [
  { word: "family", category: "Entity" },
  { word: "mother", category: "Entity" },
  { word: "want", category: "Action" },
  { word: "like", category: "Action" },
  { word: "need", category: "Action" },
  { word: "go", category: "Action" },
  { word: "drink", category: "Action" },
  { word: "what", category: "Question" },
  { word: "work", category: "Action" },
  { word: "who", category: "Question" },
  { word: "finish", category: "Action" },
  { word: "eat", category: "Action" },
  { word: "yes", category: "Basic" },
  { word: "computer", category: "Entity" },
  { word: "man", category: "Entity" },
  { word: "school", category: "Entity" },
  { word: "woman", category: "Entity" },
  { word: "help", category: "Action" },
  { word: "fine", category: "Basic" },
  { word: "no", category: "Basic" },
] as const;

type Category = "All" | "Action" | "Basic" | "Question" | "Entity";

type Props = {
  selected: string | null;
  disabled?: boolean;
  onPick: (word: string) => void;
};

function Tile({
  word,
  category,
  selected,
  disabled,
  onPick,
}: {
  word: string;
  category: string;
  selected: boolean;
  disabled?: boolean;
  onPick: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = () => {
    if (!ref.current) return;
    ref.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const reset = () => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0.5;
    setIsPlaying(false);
  };

  return (
    <button
      onClick={onPick}
      onMouseEnter={play}
      onMouseLeave={reset}
      onFocus={play}
      onBlur={reset}
      disabled={disabled}
      aria-pressed={selected}
      className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 ${
        selected
          ? "border-sky-400 bg-sky-950/20 ring-2 ring-sky-400/30 shadow-[0_0_20px_-3px_rgba(56,189,248,0.35)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:translate-y-[-2px] hover:shadow-lg"
      } ${disabled ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
    >
      {/* Video Viewport */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/80">
        <video
          ref={ref}
          src={`/samples/${word}.mp4#t=0.5`}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105"
        />

        {/* Video Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-black/30 pointer-events-none" />

        {/* Hover / Play Micro Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Play className="h-2.5 w-2.5 fill-current text-sky-400" />
          <span>{isPlaying ? "Playing" : "Preview"}</span>
        </div>

        {/* Selection Indicator */}
        {selected && (
          <div className="absolute top-2.5 left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white shadow-md">
            <Check className="h-3 w-3 stroke-[3]" />
          </div>
        )}
      </div>

      {/* Card Info Footer */}
      <div className="flex items-center justify-between p-2.5 bg-[var(--surface)] border-t border-[var(--border)]">
        <div>
          <span className="block font-semibold text-sm capitalize text-[var(--text)] group-hover:text-sky-400 transition-colors">
            {word}
          </span>
          <span className="text-[10px] text-[var(--muted)] font-mono uppercase tracking-wider">
            {category}
          </span>
        </div>

        <span className="text-[11px] font-medium text-sky-400/80 group-hover:text-sky-300 flex items-center gap-0.5">
          <Sparkles className="h-3 w-3" />
          Test
        </span>
      </div>
    </button>
  );
}

export default function SampleGrid({ selected, disabled, onPick }: Props) {
  const [filter, setFilter] = useState<Category>("All");

  const categories: Category[] = ["All", "Action", "Basic", "Question", "Entity"];

  const filtered = useMemo(() => {
    if (filter === "All") return SAMPLES;
    return SAMPLES.filter((s) => s.category === filter);
  }, [filter]);

  return (
    <div className="space-y-4">
      {/* Category Pills Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                filter === c
                  ? "bg-[var(--surface-2)] text-sky-400 border border-sky-400/40 shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/50 border border-transparent"
              }`}
            >
              {c}
              {c === "All" && ` (${SAMPLES.length})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <Film className="h-3.5 w-3.5 text-sky-400" />
          <span>Hover to preview video • Click to run model</span>
        </div>
      </div>

      {/* Grid of Signs */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {filtered.map((item) => (
          <Tile
            key={item.word}
            word={item.word}
            category={item.category}
            selected={selected === item.word}
            disabled={disabled}
            onPick={() => onPick(item.word)}
          />
        ))}
      </div>
    </div>
  );
}
