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
        # Feature dimensions based on our previous implementations
        self.i3d = VisualStreamI3D(feature_dim=512)
        self.st_gcn = SkeletalStreamSTGCN(feature_dim=256)
        self.fusion = MultiStreamFusion(i3d_feature_dim=512, st_gcn_feature_dim=256, num_classes=num_classes)

    def forward(self, rgb_input, skeletal_input):
        v_feat = self.i3d(rgb_input)
        s_feat = self.st_gcn(skeletal_input)
        out = self.fusion(v_feat, s_feat)
        return out

def train_one_epoch(model, dataloader, optimizer, criterion, device, scaler):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    # Progress bar
    pbar = tqdm(dataloader, desc="Training")
    
    for rgb_frames, skeletons, labels in pbar:
        rgb_frames, skeletons, labels = rgb_frames.to(device), skeletons.to(device), labels.to(device)
        
        optimizer.zero_grad()
        
        # Forward pass with Automatic Mixed Precision (AMP)
        with torch.amp.autocast('cuda' if torch.cuda.is_available() else 'cpu'):
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
        
        pbar.set_postfix({"Loss": running_loss/total, "Acc": 100.*correct/total})
        
    return running_loss / len(dataloader), 100. * correct / total

def main():
    # 1. Device configuration
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    # 2. DataLoaders
    # Assuming the data folder is placed at the root level relative to ml_pipeline
    data_dir = "../../data" 
    train_dataset = WLASLDataset(data_dir=data_dir, split="train")
    
    # Num workers is 0 by default to prevent multiprocessing issues on Windows/small setups, 
    # but should be increased on capable hardware.
    train_loader = DataLoader(train_dataset, batch_size=4, shuffle=True, num_workers=0)
    
    # 3. Model
    # WLASL 100 has 100 classes
    model = TwoStreamModel(num_classes=100).to(device)
    
    # 4. Loss and Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
    
    # Initialize Gradient Scaler for AMP
    scaler = torch.amp.GradScaler('cuda' if torch.cuda.is_available() else 'cpu')
    
    # 5. Training Loop
    num_epochs = 10
    for epoch in range(num_epochs):
        print(f"\nEpoch [{epoch+1}/{num_epochs}]")
        train_loss, train_acc = train_one_epoch(model, train_loader, optimizer, criterion, device, scaler)
        
        # In a full implementation, you would run a validation loop here and save best checkpoints
        print(f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}%")
        
        # Save checkpoint
        torch.save(model.state_dict(), f"checkpoint_epoch_{epoch+1}.pth")

if __name__ == "__main__":
    main()
