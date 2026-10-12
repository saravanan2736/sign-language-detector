# Demo vocabulary (12 basic words) and sample clips

The app uses `checkpoints/demo.pth` (12 classes, list in `data/metadata/demo_words.json`) when present.
Delete that file to fall back to the full 100-word model (`checkpoint.pth`).
"hello", "hi" and "vanakkam" are NOT in the WLASL dataset, so they are not supported.

Held-out accuracy (21 test clips): top-1 33%, top-3 67% (val: 66% / 83%).

| Word | Sample clip | Confidence | Clip type |
|---|---|---|---|
| need | data/raw/37887.mp4 | 0.84 | unseen (val) |
| drink | data/raw/68042.mp4 | 0.71 | unseen (val) |
| no | data/raw/68110.mp4 | 0.65 | unseen (val) |
| what | data/raw/62965.mp4 | 0.47 | unseen (val) |
| help | data/raw/65891.mp4 | 0.38 | unseen (val) |
| want | data/raw/62244.mp4 | 0.33 | unseen (val) |
| go | data/raw/24946.mp4 | 0.25 | unseen (val) |
| yes | data/raw/64287.mp4 | 0.24 | unseen (val) |
| like | data/raw/33268.mp4 | 0.21 | unseen (val) |
| who | data/raw/63229.mp4 | 0.18 | unseen (val) |
| mother | data/raw/36929.mp4 | 0.45 | training clip |
| eat | data/raw/18324.mp4 | 0.32 | training clip |
