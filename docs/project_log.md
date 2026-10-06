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
- Created `backend/database.py`: Set up SQLAlchemy connection string targeting a PostgreSQL database (`postgresql://postgres:password@localhost/signdb`).
- Created `backend/models.py`: Added the `RecognitionHistory` ORM model.
- Updated `backend/main.py`: Imported the database engine to auto-create tables on startup. Injected the database session as a dependency in `/predict` to log history on each inference call.
