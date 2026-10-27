import sys
import os
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sqlalchemy.orm import Session
import uvicorn

from database import engine, get_db
import db_models as models

# Add ml_pipeline to path so we can import our PyTorch models
sys.path.append(os.path.join(os.path.dirname(__file__), '../ml_pipeline/src'))
from model_loader import load_inference_model
from data.preprocess import VideoProcessor
import torch
import torch.nn.functional as F
import tempfile
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# --- 0. Load Model on Startup ---
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Loading inference model on: {device}")

model, index_to_word = load_inference_model(ROOT, device)

processor = VideoProcessor(target_frames=64, target_size=(224, 224))

# Initialize the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(

    title="Sign Language Detector API",
    description="Backend service for recognizing sign language from video clips",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Sign Language Detector API is running"}


@app.post("/predict")
async def predict_sign(video: UploadFile = File(...), db: Session = Depends(get_db)):
    # --- 1. Video Processing ---
    # Save the UploadFile temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
        temp_video.write(await video.read())
        temp_video_path = temp_video.name

    try:
        frames_np, skeletons_np = processor.process_video(temp_video_path)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read the uploaded video")
    finally:
        os.remove(temp_video_path)

    if not skeletons_np.any():
        raise HTTPException(status_code=422, detail="No person/hands detected in the video")
        
    # Format tensors: add batch dimension (B, C, T, H, W)
    frames_t = torch.tensor(frames_np).unsqueeze(0).to(device)
    skeletons_t = torch.tensor(skeletons_np).unsqueeze(0).to(device)
    
    # --- 2. Model Inference ---
    with torch.no_grad():
        outputs = model(frames_t, skeletons_t)
        probabilities = F.softmax(outputs, dim=1)
        max_prob, predicted_idx = torch.max(probabilities, 1)
        
    top_p, top_i = torch.topk(probabilities[0], 5)
    top5 = [{"word": index_to_word.get(int(i), f"WordClass_{int(i)}"), "score": float(v)}
            for v, i in zip(top_p, top_i)]
    confidence = max_prob.item()
    predicted_class = int(predicted_idx.item())
    
    # Map to actual English word!
    predicted_word = index_to_word.get(predicted_class, f"WordClass_{predicted_class}")
    version = "v1.0"
    
    # --- 3. Database Logging ---
    history_record = models.RecognitionHistory(
        predicted_label=predicted_word,
        confidence_score=confidence,
        model_version=version
    )
    db.add(history_record)
    db.commit()
    db.refresh(history_record)
    
    return {
        "predicted_word": predicted_word,
        "score": confidence,
        "top5": top5,
        "skeleton": np.round(skeletons_np, 3).tolist(),  # 64 x 75 x 3, for the landmark replay in the UI
        "model_version": version,
        "record_id": history_record.id
    }

class SkeletonRequest(BaseModel):
    # 64 frames x 75 joints x (x, y, z): 33 pose + 21 left hand + 21 right hand
    skeleton: list[list[list[float]]]


@app.post("/predict_skeleton")
def predict_skeleton(req: SkeletonRequest):
    arr = np.array(req.skeleton, dtype=np.float32)
    if arr.ndim != 3 or arr.shape[1:] != (75, 3) or not 8 <= arr.shape[0] <= 300:
        raise HTTPException(status_code=422, detail="skeleton must be (frames, 75, 3)")
    if arr.shape[0] != 64:  # resample to the 64 frames the model expects
        arr = arr[np.linspace(0, arr.shape[0] - 1, 64).astype(int)]
    if not arr.any():
        raise HTTPException(status_code=422, detail="No person/hands detected")
    x = torch.from_numpy(arr).unsqueeze(0).to(device)
    with torch.no_grad():
        probs = F.softmax(model(None, x), dim=1)[0]
    top_p, top_i = torch.topk(probs, min(5, len(probs)))
    top5 = [{"word": index_to_word.get(int(i), f"WordClass_{int(i)}"), "score": float(v)}
            for v, i in zip(top_p, top_i)]
    return {"predicted_word": top5[0]["word"], "score": top5[0]["score"], "top5": top5}


@app.get("/history")
def get_history(limit: int = 20, db: Session = Depends(get_db)):
    rows = (db.query(models.RecognitionHistory)
              .order_by(models.RecognitionHistory.id.desc()).limit(limit).all())
    return [{"id": r.id, "predicted_word": r.predicted_label,
             "score": r.confidence_score, "model_version": r.model_version} for r in rows]


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
