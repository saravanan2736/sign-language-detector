"use client";
import { useRef } from "react";

// strongest demo clips first
export const SAMPLES = ["need", "drink", "no", "what", "mother", "help", "want", "eat", "go", "yes", "like", "who"];

type Props = {
  selected: string | null;
  disabled?: boolean;
  onPick: (word: string) => void;
};

function Tile({ word, selected, disabled, onPick }: { word: string; selected: boolean; disabled?: boolean; onPick: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const play = () => ref.current?.play().catch(() => {});
  const reset = () => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0.5;
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
      className="tile group"
    >
      <video ref={ref} src={`/samples/${word}.mp4#t=0.5`} muted loop playsInline preload="metadata" className="tile-video" />
      <span className="tile-label capitalize">{word}</span>
    </button>
  );
}

export default function SampleGrid({ selected, disabled, onPick }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {SAMPLES.map((w) => (
        <Tile key={w} word={w} selected={selected === w} disabled={disabled} onPick={() => onPick(w)} />
      ))}
    </div>
  );
}
