"use client";
import { useEffect, useState, type ReactNode } from "react";
import Upload from "@/components/Upload";
import Live from "@/components/Live";
import History from "@/components/History";
import { API } from "@/lib/api";

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const TABS = [
  {
    id: "upload",
    label: "Upload video",
    title: "Upload video",
    description: "Predict a sign from a recorded clip.",
    icon: svg(
      <>
        <path d="M12 16V4m0 0L7 9m5-5 5 5" />
        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </>,
    ),
  },
  {
    id: "live",
    label: "Live webcam",
    title: "Live webcam",
    description: "Recognise a sign from your camera in real time.",
    icon: svg(
      <>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3" />
      </>,
    ),
  },
  {
    id: "history",
    label: "History",
    title: "History",
    description: "Predictions made from uploaded videos.",
    icon: svg(
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>,
    ),
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
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-[var(--border)] bg-[var(--surface)] p-4 md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-1">
          <div className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] text-[var(--text)]">
            {svg(
              <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1V4.5a1.5 1.5 0 0 1 3 0V12m0-6.5a1.5 1.5 0 0 1 3 0V13m0-4.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8L4 15.5a1.6 1.6 0 0 1 2.4-2L8 15" />,
            )}
          </div>
          <div className="leading-tight">
            <p className="font-semibold">Sign Detector</p>
            <p className="text-xs text-[var(--muted)]">ASL word recognition</p>
          </div>
        </div>

        <nav className="flex gap-1 md:flex-col" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined} className="nav-item">
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto hidden space-y-3 md:block">
          <div className="flex items-center justify-between border-t border-[var(--border)] px-1 pt-4 text-[13px]">
            <span className="text-[var(--muted)]">Backend</span>
            <span className={online === null ? "text-[var(--muted)]" : online ? "text-[var(--success)]" : "text-[var(--danger)]"}>
              {online === null ? "Checking" : online ? "Online" : "Offline"}
            </span>
          </div>
          <button onClick={toggle} className="btn btn-secondary btn-block">
            {theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-8">
          <header className="mb-6">
            <h1 className="text-xl font-semibold">{current.title}</h1>
            <p className="mt-1 text-[var(--muted)]">{current.description}</p>
          </header>
          {tab === "upload" && <Upload />}
          {tab === "live" && <Live />}
          {tab === "history" && <History />}
        </div>
      </main>
    </div>
  );
}
