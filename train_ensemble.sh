#!/bin/bash
cd "S:/Sign Detector"
for i in 0 1 2 3 4; do
  echo "== model $i =="
  venv/Scripts/python.exe ml_pipeline/src/train.py demo data/metadata/demo_words.json checkpoints/ens_$i.pth $((i+1)) 2>&1 | tail -1
done
echo ALL_DONE
