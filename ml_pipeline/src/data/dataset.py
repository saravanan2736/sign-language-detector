import os
import json
import torch
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
        # We will parse the WLASL dataset metadata here to get the list of video paths 
        # and their corresponding integer labels for the specified split.
        
        samples = []
        # In a real implementation, we would parse `wlasl100_available.csv` here.
        # Format might be: video_id, split, label
        # Example dummy setup:
        # samples.append({"path": os.path.join(self.data_dir, "raw", "001.mp4"), "label": 0})
        
        print(f"Loaded {len(samples)} samples for split: {self.split}")
        return samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        video_path = sample["path"]
        label = sample["label"]
        
        # 1. Process Video -> returns NumPy arrays
        frames_np, skeletons_np = self.processor.process_video(video_path)
        
        # 2. Convert to PyTorch Tensors
        frames_tensor = torch.from_numpy(frames_np).float()
        skeletons_tensor = torch.from_numpy(skeletons_np).float()
        
        return frames_tensor, skeletons_tensor, torch.tensor(label, dtype=torch.long)
