from fastapi import FastAPI, UploadFile, File
import uvicorn

app = FastAPI(
    title="Sign Language Detector API",
    description="Backend service for recognizing sign language from video clips",
    version="0.1.0",
)

@app.get("/")
def read_root():
    return {"message": "Sign Language Detector API is running"}

@app.post("/predict")
async def predict_sign(video: UploadFile = File(...)):
    # Placeholder for video processing and model inference
    # 1. Save video to a temporary file
    # 2. Extract frames (RGB and Skeletal)
    # 3. Run through I3D + ST-GCN fused model
    # 4. Map result to word label
    
    return {
        "predicted_word": "hello", # Dummy prediction
        "score": 0.95,
        "model_version": "v1.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
