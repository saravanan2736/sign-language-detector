import os
import json
import torch
import numpy as np
import pandas as pd
from torch.utils.data import Dataset
from .preprocess import VideoProcessor

class WLASLDataset(Dataset):
    def __init__(self, data_dir, split="train", target_frames=64, target_size=(224, 224)):
        """
        Custom PyTorch Dataset for WLASL isolated sign recognition.
        
        Args:
            data_dir (str): Path to the base data directory containing 'raw' videos and 'metadata'.
            split (str): One of 'train', 'val', or 'test'.
            target_frames (int): Number of frames to sample per video.
            target_size (tuple): Spatial dimensions for RGB stream.
        """
        self.data_dir = data_dir
        self.split = split
        self.processor = VideoProcessor(target_frames=target_frames, target_size=target_size)
        
        # Load vocabulary mapping
        vocab_path = os.path.join(data_dir, "metadata", "wlasl100_classes.json")
        with open(vocab_path, "r") as f:
            self.classes = json.load(f) # e.g. {"book": 0, "drink": 1, ...}
            
        self.samples = self._load_samples()

    def _load_samples(self):
        # Parse the WLASL dataset metadata
        csv_path = os.path.join(self.data_dir, "metadata", "wlasl100_available.csv")
        
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"Metadata CSV not found at {csv_path}")
            
        df = pd.read_csv(csv_path)
        
        # Filter by requested split (train, val, test)
        df = df[df['split'] == self.split]
        
        samples = []
        for _, row in df.iterrows():
            video_id = str(row['video_id']).zfill(5)
            # Construct path to the raw video
            video_path = os.path.join(self.data_dir, "raw", f"{video_id}.mp4")
            
            # Check if video actually exists before adding it
            if os.path.exists(video_path):
                samples.append({
                    "path": video_path, 
                    "label": int(row['class_index'])
                })
        
        print(f"Loaded {len(samples)} valid samples for split: {self.split}")
        return samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        video_path = sample["path"]
        label = sample["label"]
        
        vid_id = os.path.basename(video_path).split('.')[0]
        proc_dir = os.path.join(self.data_dir, "processed")
        frames_path = os.path.join(proc_dir, f"{vid_id}_frames.npy")
        skeletons_path = os.path.join(proc_dir, f"{vid_id}_skeletons.npy")
        
        # 1. Load Pre-processed arrays if available (for lightning-fast training)
        if os.path.exists(frames_path) and os.path.exists(skeletons_path):
            frames_np = np.load(frames_path).astype(np.float32)
            skeletons_np = np.load(skeletons_path).astype(np.float32)
        else:
            # Fallback to real-time CPU processing (used by FastAPI inference)
            frames_np, skeletons_np = self.processor.process_video(video_path)
        
        # 2. Convert to PyTorch Tensors
        frames_tensor = torch.from_numpy(frames_np).float()
        skeletons_tensor = torch.from_numpy(skeletons_np).float()
        
        return frames_tensor, skeletons_tensor, torch.tensor(label, dtype=torch.long)
