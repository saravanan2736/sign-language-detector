# Sign Language Detector (WLASL-100)

## Overview
This project is an AI-powered Sign Language Detector. It uses a Two-Stream Spatial-Temporal Graph Convolutional Network (ST-GCN) built with PyTorch to recognize American Sign Language (ASL) from videos. It is configured to detect 100 different ASL words based on the WLASL dataset.

## Features
* **Live Webcam Detection:** Real-time sign language recognition using your webcam with zero lag, leveraging MediaPipe for skeleton extraction.
* **Web Application:** A user-friendly Streamlit frontend for uploading isolated sign video clips and receiving predictions.
* **RESTful API:** A FastAPI backend that processes videos, runs inference, and stores prediction history in an SQLite database.
* **Out of the box:** Includes a pre-trained model checkpoint (`checkpoint.pth`) so you can run inferences immediately after cloning.

## Project Structure
* `live_camera.py`: Standalone script for real-time webcam inference.
* `frontend/`: Contains the Streamlit web application (`app.py`).
* `backend/`: Contains the FastAPI server (`main.py`) and SQLite database logic (`database.py`, `db_models.py`).
* `ml_pipeline/`: Contains the PyTorch model definitions, data processing, and training scripts.
* `data/`: Stores dataset metadata, such as the class vocabulary.
* `checkpoint.pth`: The pre-trained PyTorch model weights.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/saravanan2736/sign-language-detector.git
   cd sign-language-detector
   ```

2. **Create a virtual environment (Recommended):**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Dependencies:**
   Install backend and frontend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   pip install -r frontend/requirements.txt
   pip install -r ml_pipeline/requirements.txt 
   ```
   *(Note: Make sure to install PyTorch according to your system's specifications, especially if you have a CUDA-enabled GPU).*

## How to Run

### 1. Live Webcam Demo (Fastest / Zero Lag)
For the best real-time experience, run the native OpenCV/MediaPipe script directly from the root of the project:
```bash
python live_camera.py
```
- Stand in front of your webcam and start signing!
- Press **'Q'** to quit the application.

### 2. Full Web Application (Video Uploads)
To run the full stack application for analyzing recorded videos:

**Step A: Start the FastAPI Backend**
```bash
cd backend
python main.py
```
*(The backend will start on `http://localhost:8000`)*

**Step B: Start the Streamlit Frontend (In a new terminal window)**
```bash
cd frontend
streamlit run app.py
```
*(The frontend will open in your browser at `http://localhost:8501`)*

Now you can upload video clips in the browser and the app will predict the signs!

## Evaluation
Run `python evaluate.py`. Current skeleton-only model on WLASL-100: test top-1 17.2%, top-5 42.0%, macro-F1 0.14 (see `docs/eval_results.json`). Retrain with `python ml_pipeline/src/train.py` (run from the project root; needs `data/processed`). Tests: `pytest tests`.

## Next.js web UI (upload, live webcam, history)
A React/Next.js frontend lives in `web/` (upload video, live webcam with in-browser MediaPipe, prediction history).
It talks to the FastAPI backend (CORS is enabled for `http://localhost:3000`).
```bash
# terminal 1 (venv active)
cd backend && python main.py
# terminal 2
cd web && npm install && npm run dev      # then open http://localhost:3000
```
In the Live webcam tab use **Record a sign** (press start, sign once, press stop). It matches how the model was trained better than **Continuous**.
The Streamlit app in `frontend/` still works too.
