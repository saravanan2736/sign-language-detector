# Demo vocabulary (12 basic words) and sample clips

The app uses an ensemble of 5 models (`checkpoints/ens_0..4.pth`, 12 classes, word list in
`data/metadata/demo_words.json`). Delete the `ens_*.pth` files to fall back to the single model
(`checkpoints/demo.pth`); delete that too to use the full 100-word model (`checkpoint.pth`).
Retrain the ensemble with `./train_ensemble.sh`.
"hello", "hi" and "vanakkam" are NOT in the WLASL dataset, so they are not supported.

Held-out accuracy, 21 test clips: single model top-1 33% / top-3 67%; 5-model ensemble top-1 43% / top-3 71%.

Clips in `demo videos/` and `web/public/samples/` (each predicted correctly by the ensemble):

| Word | Source clip | Confidence | Clip type |
|---|---|---|---|
| drink | data/raw/17730.mp4 | 0.81 | unseen (test) |
| like | data/raw/33280.mp4 | 0.80 | unseen (val) |
| mother | data/raw/36941.mp4 | 0.79 | training clip |
| need | data/raw/37887.mp4 | 0.78 | unseen (val) |
| want | data/raw/62254.mp4 | 0.70 | unseen (val) |
| no | data/raw/69411.mp4 | 0.69 | unseen (val) |
| what | data/raw/69531.mp4 | 0.66 | unseen (val) |
| go | data/raw/69345.mp4 | 0.62 | unseen (val) |
| eat | data/raw/18323.mp4 | 0.52 | unseen (val) |
| who | data/raw/63230.mp4 | 0.50 | unseen (val) |
| help | data/raw/65891.mp4 | 0.49 | unseen (val) |
| yes | data/raw/69546.mp4 | 0.43 | unseen (val) |
