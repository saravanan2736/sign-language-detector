# Demo vocabulary (20 basic words) and sample clips

The app uses an ensemble of 5 models (`checkpoints/ens_0..4.pth`, 20 classes, word list in
`data/metadata/demo_words.json`). Delete the `ens_*.pth` files to fall back to the single model
(`checkpoints/demo.pth`); delete that too to use the full 100-word model (`checkpoint.pth`).
Retrain the ensemble with `./train_ensemble.sh`.
"hello", "hi" and "vanakkam" are NOT in the WLASL dataset, so they are not supported.

Held-out accuracy of the 20-word ensemble:

| Metric | Validation (47 clips) | Test (38 clips) |
|---|---|---|
| Top-1 accuracy | 51.1% | 26.3% |
| Top-5 accuracy | 80.9% | 60.5% |
| Macro F1-score | 0.487 | 0.213 |

(For comparison, the earlier 12-word ensemble got 42.9% top-1 and 71.4% top-5 on its 21 test clips; more words is a harder task. Chance top-1 is 5% for 20 words.)

Clips in `demo videos/` and `web/public/samples/` (each predicted correctly by the ensemble). Confidence is spread over 20 classes, so it is lower than with 12 words.

| Word | Source clip | Confidence | Clip type |
|---|---|---|---|
| family | data/raw/69316.mp4 | 0.71 | unseen (val) |
| mother | data/raw/36944.mp4 | 0.65 | training clip |
| want | data/raw/62254.mp4 | 0.64 | unseen (val) |
| like | data/raw/33280.mp4 | 0.60 | unseen (val) |
| need | data/raw/37887.mp4 | 0.49 | unseen (val) |
| go | data/raw/69345.mp4 | 0.43 | unseen (val) |
| drink | data/raw/17730.mp4 | 0.42 | unseen (test) |
| what | data/raw/69531.mp4 | 0.42 | unseen (val) |
| work | data/raw/63788.mp4 | 0.39 | unseen (val) |
| who | data/raw/63226.mp4 | 0.36 | unseen (test) |
| finish | data/raw/21942.mp4 | 0.31 | unseen (val) |
| eat | data/raw/18323.mp4 | 0.30 | unseen (val) |
| yes | data/raw/64297.mp4 | 0.25 | unseen (test) |
| computer | data/raw/12315.mp4 | 0.24 | unseen (val) |
| man | data/raw/66097.mp4 | 0.23 | unseen (val) |
| school | data/raw/69455.mp4 | 0.23 | unseen (val) |
| woman | data/raw/63664.mp4 | 0.21 | unseen (test) |
| help | data/raw/27207.mp4 | 0.21 | training clip |
| fine | data/raw/21886.mp4 | 0.18 | unseen (val) |
| no | data/raw/38525.mp4 | 0.16 | unseen (test) |
