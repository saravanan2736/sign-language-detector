import sys
import os
from fastapi import FastAPI, UploadFile, File, Depends
from sqlalchemy.orm import Session
import uvicorn

from database import engine, get_db
import db_models as models

# Add ml_pipeline to path so we can import our PyTorch models
sys.path.append(os.path.join(os.path.dirname(__file__), '../ml_pipeline/src'))
from train import TwoStreamModel
from data.preprocess import VideoProcessor
import torch
import torch.nn.functional as F
import tempfile
import os

# --- 0. Load Model on Startup ---
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Loading inference model on: {device}")

model = TwoStreamModel(num_classes=100)
# Use map_location to ensure it loads gracefully regardless of training device
model.load_state_dict(torch.load("../checkpoint.pth", map_location=device, weights_only=True))
model.to(device)
model.eval()

processor = VideoProcessor(target_frames=64, target_size=(224, 224))

# Initialize the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(

    title="Sign Language Detector API",
    description="Backend service for recognizing sign language from video clips",
    version="0.1.0",
)

@app.get("/")
def read_root():
    return {"message": "Sign Language Detector API is running"}

import json

# Load Vocabulary
print("Loading vocabulary...")
try:
    with open("../data/metadata/wlasl100_classes.json", "r") as f:
        vocab = json.load(f)
        index_to_word = {item["class_index"]: item["gloss"] for item in vocab}
except FileNotFoundError:
    index_to_word = {}

@app.post("/predict")
async def predict_sign(video: UploadFile = File(...), db: Session = Depends(get_db)):
    # --- 1. Video Processing ---
    # Save the UploadFile temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
        temp_video.write(await video.read())
        temp_video_path = temp_video.name

    try:
        frames_np, skeletons_np = processor.process_video(temp_video_path)
    finally:
        os.remove(temp_video_path)
        
    # Format tensors: add batch dimension (B, C, T, H, W)
    frames_t = torch.tensor(frames_np).unsqueeze(0).to(device)
    skeletons_t = torch.tensor(skeletons_np).unsqueeze(0).to(device)
    
    # --- 2. Model Inference ---
    with torch.no_grad():
        outputs = model(frames_t, skeletons_t)
        probabilities = F.softmax(outputs, dim=1)
        max_prob, predicted_idx = torch.max(probabilities, 1)
        
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
        "model_version": version,
        "record_id": history_record.id
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
