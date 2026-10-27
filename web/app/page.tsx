"use client";

import { useEffect, useState } from "react";
import {
  UploadCloud,
  Video,
  History as HistoryIcon,
  Sun,
  Moon,
  Sparkles,
  Layers,
  Cpu,
} from "lucide-react";
import Upload from "@/components/Upload";
import Live from "@/components/Live";
import History from "@/components/History";
import { API } from "@/lib/api";

const TABS = [
  {
    id: "upload",
    label: "Video Analysis",
    eyebrow: "Video Inference Studio",
    title: "Video File Sign Recognition",
    description: "Upload a recorded clip or select from standard sign samples to perform spatial gesture classification.",
    icon: UploadCloud,
  },
  {
    id: "live",
    label: "Live Camera",
    eyebrow: "Real-time Vision",
    title: "Live Gesture Recognition",
    description: "Stream landmarks directly through your camera with on-device MediaPipe landmark tracking.",
    icon: Video,
  },
  {
    id: "history",
    label: "Inference Log",
    eyebrow: "Telemetry & History",
    title: "Prediction History",
    description: "Audit recent classification runs, confidence scores, and model performance records.",
    icon: HistoryIcon,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function useBackendStatus() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const ping = async () => {
      try {
        const r = await fetch(`${API}/`, { cache: "no-store" });
        if (alive) setOnline(r.ok);
      } catch {
        if (alive) setOnline(false);
      }
    };
    ping();
    const t = setInterval(ping, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return online;
}

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  return { theme, toggle };
}

export default function Home() {
  const [tab, setTab] = useState<TabId>("upload");
  const online = useBackendStatus();
  const { theme, toggle } = useTheme();
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)]">
      {/* ================= TOP COMMAND BAR ================= */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-[0_0_15px_-3px_rgba(56,189,248,0.3)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base tracking-tight text-[var(--text)]">
                  Sign<span className="text-sky-400">Studio</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                  <Cpu className="h-3 w-3" />
                  ST-GCN + I3D
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)]">Real-time ASL Perception</p>
            </div>
          </div>

          {/* Center Navigation Pills */}
          <nav className="flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 p-1 shadow-inner" aria-label="Main navigation">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 sm:text-[13px] ${
                    isActive
                      ? "bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)] font-semibold"
                      : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-sky-400" : "text-[var(--muted)]"}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status & Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Backend Connectivity Status */}
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs">
              <span
                className={`pulse-dot ${
                  online === null
                    ? "bg-amber-400"
                    : online
                    ? "bg-emerald-400"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-[var(--muted)]">Model Service:</span>
              <span
                className={`font-medium ${
                  online === null
                    ? "text-amber-400"
                    : online
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {online === null ? "Connecting..." : online ? "Active (Port 8000)" : "Offline"}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-2)] hover:text-[var(--text)] hover:border-[var(--border-strong)]"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-sky-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================= WORKSPACE VIEWPORT ================= */}
      <main className="flex-1 w-full">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Context Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-sky-400 uppercase">
                  {current.eyebrow}
                </span>
                <span className="text-[11px] text-[var(--muted)]">• 12 Vocabulary Targets</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
                {current.title}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)] max-w-2xl">
                {current.description}
              </p>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs text-[var(--muted)]">
              <Layers className="h-4 w-4 text-[var(--muted)]" />
              <span>Multi-Modal Gesture Fusion Architecture</span>
            </div>
          </div>

          {/* Active Module Stage */}
          <div key={tab} className="page-enter">
            {tab === "upload" && <Upload />}
            {tab === "live" && <Live />}
            {tab === "history" && <History />}
          </div>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]/50 py-4 text-center text-xs text-[var(--muted)]">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SignStudio Perception Engine • ASL Isolated Word Recognition</span>
          <span className="font-mono text-[11px]">Backend API Target: {API}</span>
        </div>
      </footer>
    </div>
  );
}
