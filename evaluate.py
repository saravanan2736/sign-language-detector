"""Evaluate checkpoint.pth on the val/test splits (skeleton-only model).

Usage: python evaluate.py [--checkpoint checkpoint.pth] [--splits val test]
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
import torch

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(ROOT, "ml_pipeline", "src"))
from train import TwoStreamModel  # noqa: E402


def load_split(split):
    df = pd.read_csv(os.path.join(ROOT, "data", "metadata", "wlasl100_available.csv"))
    df = df[df["split"] == split]
    xs, ys = [], []
    for _, r in df.iterrows():
        p = os.path.join(ROOT, "data", "processed", f"{str(r['video_id']).zfill(5)}_skeletons.npy")
        if os.path.exists(p):
            xs.append(np.load(p).astype(np.float32))
            ys.append(int(r["class_index"]))
    return xs, ys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default=os.path.join(ROOT, "checkpoint.pth"))
    ap.add_argument("--splits", nargs="+", default=["train", "val", "test"])
    args = ap.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = TwoStreamModel(num_classes=100)
    model.load_state_dict(torch.load(args.checkpoint, map_location=device, weights_only=True))
    model.to(device).eval()

    results = {}
    for split in args.splits:
        xs, ys = load_split(split)
        if not xs:
            print(f"[{split}] no processed samples found")
            continue
        preds, top5 = [], []
        with torch.no_grad():
            for i in range(0, len(xs), 16):
                x = torch.from_numpy(np.stack(xs[i:i + 16])).to(device)
                out = model(None, x)
                top5.extend(out.topk(5, dim=1).indices.cpu().tolist())
                preds.extend(out.argmax(1).cpu().tolist())
        y, p = np.array(ys), np.array(preds)
        acc = float((y == p).mean())
        t5 = float(np.mean([yy in t for yy, t in zip(y, top5)]))
        f1s = []
        for c in np.unique(y):
            tp = np.sum((p == c) & (y == c)); fp = np.sum((p == c) & (y != c)); fn = np.sum((p != c) & (y == c))
            f1s.append(2 * tp / (2 * tp + fp + fn) if tp else 0.0)
        results[split] = {"n": len(y), "top1": acc, "top5": t5, "macro_f1": float(np.mean(f1s))}
        print(f"[{split}] n={len(y)} top1={acc:.3f} top5={t5:.3f} macroF1={np.mean(f1s):.3f}")

    with open(os.path.join(ROOT, "docs", "eval_results.json"), "w") as f:
        json.dump(results, f, indent=2)


if __name__ == "__main__":
    main()
