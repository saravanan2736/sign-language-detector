"use client";
import { useState } from "react";
import Upload from "@/components/Upload";
import Live from "@/components/Live";
import History from "@/components/History";

const TABS = [
  { id: "upload", label: "Upload video" },
  { id: "live", label: "Live webcam" },
  { id: "history", label: "History" },
] as const;

export default function Home() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("upload");
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sign Language Detector</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Recognises 12 basic ASL words: yes, no, eat, drink, like, want, help, need, go, what, who, mother.
      </p>
      <nav className="mt-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === t.id ? "border-emerald-600 font-medium" : "border-transparent text-neutral-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <section className="mt-8">
        {tab === "upload" && <Upload />}
        {tab === "live" && <Live />}
        {tab === "history" && <History />}
      </section>
    </main>
  );
}
