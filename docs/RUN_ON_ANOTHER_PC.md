# Run the Sign Language Detector on another PC

These steps are for Windows (PowerShell). macOS/Linux differences are noted where they matter.
The repository already contains the trained models, so you can run predictions straight after cloning.
You do not need the dataset unless you want to retrain.

## 1. Install the prerequisites (one time)

| Tool | Version | Check with |
|---|---|---|
| Git | any recent | `git --version` |
| Python | **3.10, 3.11 or 3.12** (3.11 recommended). **Not 3.13 or newer**, MediaPipe has no build for it. | `python --version` |
| Node.js | 20 or newer (LTS) | `node --version` |
| Browser | Chrome or Edge | |
| Webcam | only for the Live webcam tab | |

Roughly 3 GB of free disk space is needed (PyTorch is large).

## 2. Clone the project

```powershell
git clone https://github.com/saravanan2736/sign-language-detector.git
cd sign-language-detector
```

## Fastest way: one command

After cloning (step 2) and installing the prerequisites (step 1), you can skip steps 3 to 5.
Double-click **`run.bat`**, or run this in PowerShell from the project folder:

```powershell
.un.ps1
```

On the first run it creates the Python environment, installs the Python and web packages (a few minutes),
starts the backend and the web UI, waits until both respond, and opens http://localhost:3000.
Press **Q** or **Ctrl+C** in that window to stop both.

| Command | What it does |
|---|---|
| `.un.ps1` | start both, open the browser, stop with Q or Ctrl+C |
| `.un.ps1 -Detach` | start both in the background and return |
| `.un.ps1 -Stop` | stop servers started with `-Detach` |
| `.un.ps1 -NoBrowser` | do not open the browser |

Logs are written to the `logs` folder. The manual steps below do the same thing one piece at a time.

## 3. Create the Python environment and install packages

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell refuses to run the activate script, run this once and try again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

macOS/Linux: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`

`pip` may print a warning that streamlit wants a newer protobuf. That is expected, the app works.

## 4. Start the backend (terminal 1)

```powershell
.\venv\Scripts\Activate.ps1
cd backend
python main.py
```

Wait for `Application startup complete`. Check it at http://localhost:8000, which shows
`{"message":"Sign Language Detector API is running"}`.

## 5. Start the web UI (terminal 2)

Open a **second** terminal in the project folder:

```powershell
cd web
npm install
npm run dev
```

Open **http://localhost:3000** in Chrome or Edge.

## 6. Use it

- **Upload video:** click a sample clip (hover to preview) or drop your own video of one sign, then read the prediction.
- **Live webcam:** click *Start camera*, allow camera access, press *Start recording* (or the Space key), make one sign.
- **History:** predictions made from uploaded videos.

The first prediction after starting the backend is slow (up to about 20 seconds) while MediaPipe warms up.
Do one test prediction before showing it to anyone.

The model knows 20 words only: yes, no, eat, drink, like, want, help, need, go, what, who, mother, woman, man, finish, computer, family, fine, school, work.

## Optional: the Streamlit version of the UI

With the backend running (step 4), in another terminal:

```powershell
.\venv\Scripts\Activate.ps1
cd frontend
streamlit run app.py
```

Open http://localhost:8501. To point it at a backend on another machine, set `BACKEND_URL` first
(`$env:BACKEND_URL = "http://<that-pc-ip>:8000"`).

## Optional: the native webcam script

```powershell
.\venv\Scripts\Activate.ps1
python live_camera.py
```

Press Q to quit.

## Optional: run the tests

```powershell
.\venv\Scripts\Activate.ps1
pytest tests
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `pip install` fails on `mediapipe` | You are on Python 3.13 or newer. Install Python 3.11 and recreate the venv. |
| `module 'mediapipe' has no attribute 'solutions'` | A newer MediaPipe was installed. Run `pip install mediapipe==0.10.14 "protobuf>=4.25.3,<5"`. |
| Web UI shows "Backend offline" | The backend is not running, or is on another port. Start it (step 4). |
| Port already in use (8000 or 3000) | Close the old process, or run on another port (`npm run dev -- -p 3001`; for the backend edit the port at the bottom of `backend/main.py`). If the web UI moves ports, add its address to the CORS list in `backend/main.py`. |
| Camera does not start | Allow camera access in the browser. The camera only works on `http://localhost` or HTTPS, not on a plain LAN IP address. |
| Predictions are very slow | Another program is using the CPU. Close it. MediaPipe runs on the CPU. |
| `npm install` fails | Check `node --version` is 20 or newer. Delete `web/node_modules` and retry. |
| Everything looks stale after a code change | Stop the servers, delete `web/.next`, and start them again. |
| Wrong CUDA / want GPU | Optional. Install PyTorch from https://pytorch.org for your CUDA version. The CPU build is fine for this project. |

## What is not included

The training videos and the cached landmarks (`data/raw`, `data/processed`) are not in the repository, because of
their size. Inference works without them. Retraining (`ml_pipeline/src/train.py`, `train_ensemble.sh`) and
`evaluate.py` need the WLASL-100 dataset in `data/`.
