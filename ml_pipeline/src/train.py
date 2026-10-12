import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.optim import AdamW
from tqdm import tqdm

# Import our custom modules
from data.dataset import WLASLDataset
from models.i3d import VisualStreamI3D
from models.st_gcn import SkeletalStreamSTGCN
from models.fusion import MultiStreamFusion

class TwoStreamModel(nn.Module):
    def __init__(self, num_classes=100):
        super(TwoStreamModel, self).__init__()
        # Reverting to the ultra-fast Skeleton-Only mode
        self.st_gcn = SkeletalStreamSTGCN(in_channels=9, feature_dim=256)
        self.dropout = nn.Dropout(0.5)
        self.classifier = nn.Linear(256, num_classes)

    def forward(self, rgb_input, skeletal_input):
        # We completely ignore the massive rgb_input!
        s_feat = self.st_gcn(normalize_skeleton(skeletal_input))
        out = self.classifier(self.dropout(s_feat))
        return out


def normalize_skeleton(x):
    """Center on the shoulder midpoint and scale by shoulder width.
    x: (B, T, 75, 3). Joints that were not detected (all zeros) stay zero."""
    valid = (x.abs().sum(-1, keepdim=True) > 0).float()
    shoulders = x[:, :, 11:13, :]                       # pose landmarks 11, 12
    center = shoulders.mean(2, keepdim=True)            # (B, T, 1, 3)
    width = (x[:, :, 11, :2] - x[:, :, 12, :2]).norm(dim=-1)  # (B, T)
    ok = width > 1e-3
    fallback = (width * ok).sum(1) / ok.sum(1).clamp(min=1)    # per-clip mean width
    width = torch.where(ok, width, fallback[:, None]).clamp(min=1e-2)
    pos = (x - center) / width[:, :, None, None] * valid
    vel = torch.zeros_like(pos)
    vel[:, 1:] = pos[:, 1:] - pos[:, :-1]
    # hand-local coordinates: each hand relative to its own wrist, scaled by hand size
    local = torch.zeros_like(pos)
    for a, b in ((33, 54), (54, 75)):
        h = pos[:, :, a:b]
        hv = valid[:, :, a:b]
        size = (h[:, :, 9, :2] - h[:, :, 0, :2]).norm(dim=-1).clamp(min=1e-2)  # wrist -> middle MCP
        local[:, :, a:b] = (h - h[:, :, 0:1]) / size[:, :, None, None] * hv
    return torch.cat([pos, vel * 5, local], dim=-1)

def train_one_epoch(model, dataloader, optimizer, criterion, device, scaler):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    # Progress bar
    pbar = dataloader
    
    for rgb_frames, skeletons, labels in pbar:
        rgb_frames, skeletons, labels = rgb_frames.to(device), skeletons.to(device), labels.to(device)
        
        optimizer.zero_grad()
        
        # Forward pass with Automatic Mixed Precision (AMP)
        with torch.amp.autocast(device.type):
            outputs = model(rgb_frames, skeletons)
            loss = criterion(outputs, labels)
        
        # Backward pass and optimize using the scaler
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        
        # Calculate accuracy
        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        pass
        
    return running_loss / len(dataloader), 100. * correct / total

def augment(x):
    """x: (T, 75, 3) numpy. Random scale/rotation/shift, temporal resample, noise."""
    import numpy as np
    T = x.shape[0]
    valid = (np.abs(x).sum(-1, keepdims=True) > 0)
    # temporal crop + resample
    keep = np.random.randint(int(T * 0.7), T + 1)
    start = np.random.randint(0, T - keep + 1)
    idx = np.linspace(start, start + keep - 1, T).astype(int)
    x, valid = x[idx], valid[idx]
    # spatial affine on x/y (applied pre-normalisation, around the clip centre)
    ang = np.deg2rad(np.random.uniform(-12, 12))
    sc = np.random.uniform(0.85, 1.15)
    R = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]]) * sc
    c = x[..., :2].mean((0, 1), keepdims=True)
    x = x.copy()
    x[..., :2] = (x[..., :2] - c) @ R.T + c + np.random.normal(0, 0.02, (1, 1, 2))
    x = x + np.random.normal(0, 0.003, x.shape)
    return (x * valid).astype(np.float32)


class SkeletonSet(torch.utils.data.Dataset):
    def __init__(self, data_dir, split, train=False, words=None):
        import os, numpy as np, pandas as pd
        df = pd.read_csv(os.path.join(data_dir, "metadata", "wlasl100_available.csv"))
        df = df[df["split"] == split]
        label_of = {w: i for i, w in enumerate(words)} if words else None
        if words:
            df = df[df["gloss"].isin(words)]
        self.x, self.y = [], []
        for _, r in df.iterrows():
            p = os.path.join(data_dir, "processed", f"{str(r['video_id']).zfill(5)}_skeletons.npy")
            if os.path.exists(p):
                self.x.append(np.load(p).astype(np.float32)); self.y.append(label_of[r["gloss"]] if words else int(r["class_index"]))
        # Your own webcam recordings (data/own/<word>_<k>.npy): every 4th goes to val, the rest to train
        if words:
            import glob
            for f in sorted(glob.glob(os.path.join(data_dir, "own", "*.npy"))):
                w, k = os.path.basename(f)[:-4].rsplit("_", 1)
                if w not in label_of:
                    continue
                is_val = int(k) % 4 == 0
                if (split == "val") == is_val and split in ("train", "val"):
                    reps = 3 if split == "train" else 1   # oversample your own takes
                    for _ in range(reps):
                        self.x.append(np.load(f).astype(np.float32)); self.y.append(label_of[w])
        self.train = train
        print(f"{split}: {len(self.x)} samples")

    def __len__(self):
        return len(self.x)

    def __getitem__(self, i):
        x = augment(self.x[i]) if self.train else self.x[i]
        return torch.zeros(1), torch.from_numpy(x), torch.tensor(self.y[i])


@torch.no_grad()
def evaluate(model, loader, device):
    model.eval()
    correct = total = 0
    for rgb, sk, y in loader:
        out = model(None, sk.to(device))
        correct += (out.argmax(1).cpu() == y).sum().item(); total += len(y)
    return 100. * correct / max(total, 1)


def main():
    import os, sys, json
    # Optional: python train.py demo  -> trains a small model on data/metadata/demo_words.json
    demo = len(sys.argv) > 1 and sys.argv[1] == "demo"
    words = json.load(open("data/metadata/demo_words.json")) if demo else None
    out_path = "checkpoints/demo.pth" if demo else "checkpoints/best.pth"
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Selected training device: {device}")
    data_dir = "data"
    train_loader = DataLoader(SkeletonSet(data_dir, "train", train=True, words=words), batch_size=32, shuffle=True)
    val_loader = DataLoader(SkeletonSet(data_dir, "val", words=words), batch_size=64)

    model = TwoStreamModel(num_classes=len(words) if demo else 100).to(device)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = AdamW(model.parameters(), lr=1e-3, weight_decay=1e-2)
    num_epochs, patience = 150, 40
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, num_epochs)
    scaler = torch.amp.GradScaler(device.type)

    os.makedirs("checkpoints", exist_ok=True)
    best, bad = -1.0, 0
    for epoch in range(num_epochs):
        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion, device, scaler)
        scheduler.step()
        val_acc = evaluate(model, val_loader, device)
        print(f"Epoch {epoch+1}/{num_epochs} | loss {train_loss:.3f} | train {train_acc:.1f}% | val {val_acc:.1f}%")
        if val_acc > best:
            best, bad = val_acc, 0
            torch.save(model.state_dict(), out_path)
        else:
            bad += 1
            if bad >= patience:
                print("Early stopping"); break
    print(f"Best val acc: {best:.2f}% (saved to {out_path})")

if __name__ == "__main__":
    main()
