export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Guess = { word: string; score: number };
export type Prediction = { predicted_word: string; score: number; top5: Guess[]; skeleton?: number[][][] };
export type HistoryRow = {
  id: number;
  predicted_word: string;
  score: number;
  model_version: string;
};

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new Error(detail);
  }
  return res.json();
}

export async function predictVideo(file: File): Promise<Prediction> {
  const body = new FormData();
  body.append("video", file);
  return parse(await fetch(`${API}/predict`, { method: "POST", body }));
}

export async function predictSkeleton(skeleton: number[][][]): Promise<Prediction> {
  return parse(
    await fetch(`${API}/predict_skeleton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skeleton }),
    }),
  );
}

export async function getHistory(limit = 20): Promise<HistoryRow[]> {
  return parse(await fetch(`${API}/history?limit=${limit}`, { cache: "no-store" }));
}
