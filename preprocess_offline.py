import os
import glob
import numpy as np
from tqdm import tqdm
import sys

# Add ml_pipeline to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'ml_pipeline/src'))
from data.preprocess import VideoProcessor

raw_dir = "data/raw"
proc_dir = "data/processed"
os.makedirs(proc_dir, exist_ok=True)

print("Initializing MediaPipe CPU pipelines...")
processor = VideoProcessor(target_frames=64, target_size=(224, 224))
videos = glob.glob(os.path.join(raw_dir, "*.mp4"))

print(f"\nFound {len(videos)} raw videos. Starting offline preprocessing...")
print("This will extract tracking dots into tiny .npy files to bypass the CPU bottleneck!")

for vid_path in tqdm(videos, desc="Pre-processing Dataset"):
    vid_id = os.path.basename(vid_path).split('.')[0]
    out_frames = os.path.join(proc_dir, f"{vid_id}_frames.npy")
    out_skeletons = os.path.join(proc_dir, f"{vid_id}_skeletons.npy")
    
    # Skip if already processed
    if os.path.exists(out_frames) and os.path.exists(out_skeletons):
        continue
        
    try:
        frames_np, skeletons_np = processor.process_video(vid_path)
        # Save as float16 to save massive disk space (reduces size by 50%)
        np.save(out_frames, frames_np.astype(np.float16))
        np.save(out_skeletons, skeletons_np.astype(np.float16))
    except Exception as e:
        print(f"Error processing {vid_path}: {e}")

print("\nDone! Your PyTorch DataLoader will now run at lightning GPU speeds.")
