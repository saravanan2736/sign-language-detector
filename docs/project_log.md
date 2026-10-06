# Project Log & Status

This file documents the steps taken during the implementation of the Sign Language Detector to serve as a reference and ensure reproducibility.

## Initialization
- **Git Repo initialized**: `git init` and initial commit made to snapshot the baseline.
- **Frontend replacement**: Next.js scaffold was removed. Streamlit was adopted for a minimal, fast frontend UI.
- **Backend plan documented**: Created `backend_plan.md` defining phases of the ML and backend development.

## Phase 1: Data Processing
- Created `ml_pipeline/src/data/preprocess.py`: Implemented a `VideoProcessor` using OpenCV to capture RGB frames and MediaPipe (Pose & Hands) to capture 75 landmarks (33 pose + 2x21 hands). Implemented uniform temporal sampling/padding.
- Created `ml_pipeline/src/data/dataset.py`: Implemented `WLASLDataset`, a PyTorch `Dataset` that utilizes `VideoProcessor` and loads the class vocabulary from `data/metadata/wlasl100_classes.json`.

## Phase 2: Neural Network Architecture (In Progress)
- Created `ml_pipeline/src/models/fusion.py`: Implemented `MultiStreamFusion`, which projects and concatenates the I3D and ST-GCN embeddings, applying a classifier head as dictated by the paper.
- **Pending**: Implement I3D (Visual Stream) and ST-GCN (Skeletal Stream) modules.
