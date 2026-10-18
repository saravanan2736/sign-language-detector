"use client";
import { useEffect, useState, type ReactNode } from "react";
import Upload from "@/components/Upload";
import Live from "@/components/Live";
import History from "@/components/History";
import { API } from "@/lib/api";

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const TABS = [
  {
    id: "upload",
    label: "Upload video",
    hint: "Predict from a clip",
    icon: icon(
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </>,
    ),
  },
  {
    id: "live",
    label: "Live webcam",
    hint: "Sign in front of the camera",
    icon: icon(
      <>
        <rect x="3" y="6" width="13" height="12" rx="2.5" />
        <path d="m16 10 5-3v10l-5-3" />
      </>,
    ),
  },
  {
    id: "history",
    label: "History",
    hint: "Past predictions",
    icon: icon(
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>,
    ),
  },
] as const;

const WORDS = ["yes", "no", "eat", "drink", "like", "want", "help", "need", "go", "what", "who", "mother"];

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

export default function Home() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("upload");
  const online = useBackendStatus();
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 p-4 md:flex-row md:p-6">
      <aside className="card flex shrink-0 flex-col gap-6 p-4 md:sticky md:top-6 md:h-[calc(100vh-3rem)] md:w-64">
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white shadow-lg shadow-indigo-500/40">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1V4.5a1.5 1.5 0 0 1 3 0V12m0-6.5a1.5 1.5 0 0 1 3 0V13m0-4.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4 15.5a1.6 1.6 0 0 1 2.4-2L8 15" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="font-semibold">Sign Detector</p>
            <p className="text-xs text-[var(--muted)]">ASL word recognition</p>
          </div>
        </div>

        <nav className="flex flex-row gap-2 md:flex-col">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`group flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 md:flex-none ${
                  active
                    ? "bg-white/10 text-white shadow-md shadow-black/30 ring-1 ring-white/10"
                    : "text-[var(--muted)] hover:translate-x-0.5 hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                }`}
              >
                <span className={`transition-transform duration-200 group-hover:scale-110 ${active ? "text-[var(--accent-text)]" : ""}`}>
                  {t.icon}
                </span>
                <span className="font-medium">{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Words it knows</p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {WORDS.map((w) => (
              <span key={w} className="rounded-full bg-[var(--surface-hover)] px-2.5 py-1 text-xs text-[var(--ink)] transition-transform hover:-translate-y-0.5">
                {w}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto hidden items-center gap-2 px-2 text-xs text-[var(--muted)] md:flex">
          <span
            className={`h-2 w-2 rounded-full ${
              online === null ? "bg-slate-300" : online ? "bg-emerald-500" : "bg-rose-500"
            } ${online ? "animate-pulse" : ""}`}
          />
          {online === null ? "Checking backend..." : online ? "Backend online" : "Backend offline"}
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-5">
        <header className="px-1 pt-1">
          <h1 className="text-2xl font-semibold tracking-tight">{current.label}</h1>
          <p className="text-sm text-[var(--muted)]">{current.hint}</p>
        </header>
        <section key={tab} className="card fade-up p-5 md:p-7">
          {tab === "upload" && <Upload />}
          {tab === "live" && <Live />}
          {tab === "history" && <History />}
        </section>
      </main>
    </div>
  );
}
