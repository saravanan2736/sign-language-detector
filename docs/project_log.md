# Project Log & Status

This file documents the steps taken during the implementation of the Sign Language Detector to serve as a reference and ensure reproducibility.

## Initialization
- **Git Repo initialized**: `git init` and initial commit made to snapshot the baseline.
- **Frontend replacement**: Next.js scaffold was removed. Streamlit was adopted for a minimal, fast frontend UI.
- **Backend plan documented**: Created `backend_plan.md` defining phases of the ML and backend development.

## Phase 1: Data Processing
- Created `ml_pipeline/src/data/preprocess.py`: Implemented a `VideoProcessor` using OpenCV to capture RGB frames and MediaPipe (Pose & Hands) to capture 75 landmarks (33 pose + 2x21 hands). Implemented uniform temporal sampling/padding.
- Created `ml_pipeline/src/data/dataset.py`: Implemented `WLASLDataset`, a PyTorch `Dataset` that utilizes `VideoProcessor` and loads the class vocabulary from `data/metadata/wlasl100_classes.json`.

## Phase 2: Neural Network Architecture 
- Created `ml_pipeline/src/models/fusion.py`: Implemented `MultiStreamFusion`, which projects and concatenates the I3D and ST-GCN embeddings, applying a classifier head as dictated by the paper.
- Created `ml_pipeline/src/models/i3d.py`: Implemented `VisualStreamI3D` (Visual Stream).
- Created `ml_pipeline/src/models/st_gcn.py`: Implemented `SkeletalStreamSTGCN` (Skeletal Stream).

## Phase 3: Training Loop
- Created `ml_pipeline/src/train.py`: Set up the optimization routine using `AdamW` and cross-entropy loss.
- **Optimized for 8GB VRAM**: Added `torch.amp.autocast` and `GradScaler` to use Mixed Precision Training, halving memory usage for the network activations.

## Phase 4: API Backend & Database (In Progress)
- Created `backend/database.py`: Set up SQLAlchemy connection string using SQLite (`signdb.sqlite3`; PostgreSQL URL left commented in the file).
- Created `backend/db_models.py`: Added the `RecognitionHistory` ORM model.
- Updated `backend/main.py`: Imported the database engine to auto-create tables on startup. Injected the database session as a dependency in `/predict` to log history on each inference call.

## Phase 5: Evaluation & Fixes
- Added `evaluate.py` (top-1/top-5/macro-F1 on train/val/test; writes `docs/eval_results.json`).
- Found severe overfitting in the first model (train 96.5% vs test 8.3%).
- Retrained skeleton-only model (`train.py`): shoulder-centred/scaled normalisation inside the model, velocity and hand-local features (9 channels), augmentation, dropout, label smoothing, val-based best checkpoint + early stopping.
- Result: test top-1 17.2%, top-5 42.0% (val 33.2%). Small dataset (~7 clips/sign) limits accuracy; RGB stream is not used.
- Backend: path fixes, error handling (422 when nothing detected), `GET /history`. Added `tests/`.
