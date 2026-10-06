import sys
import os
from fastapi import FastAPI, UploadFile, File, Depends
from sqlalchemy.orm import Session
import uvicorn

from database import engine, get_db
import models

# Add ml_pipeline to path so we can import our PyTorch models
sys.path.append(os.path.join(os.path.dirname(__file__), '../ml_pipeline/src'))
# Note: You would normally import TwoStreamModel and VideoProcessor here
# from train import TwoStreamModel
# from data.preprocess import VideoProcessor

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

@app.post("/predict")
async def predict_sign(video: UploadFile = File(...), db: Session = Depends(get_db)):
    # --- 1. Video Processing ---
    # In a full deployment, we would save the UploadFile temporarily,
    # pass it to VideoProcessor.process_video(), and get the tensors back.
    
    # --- 2. Model Inference ---
    # Run the tensors through the TwoStreamModel to get predictions.
    
    # --- Dummy Results for now ---
    predicted_word = "hello"
    confidence = 0.95
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
