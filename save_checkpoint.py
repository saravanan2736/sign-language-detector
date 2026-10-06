import torch
import torch.nn as nn
from ml_pipeline.src.models.i3d import VisualStreamI3D
from ml_pipeline.src.models.st_gcn import SkeletalStreamSTGCN
from ml_pipeline.src.models.fusion import MultiStreamFusion

class TwoStreamModel(nn.Module):
    def __init__(self, num_classes=100):
        super().__init__()
        self.i3d = VisualStreamI3D(feature_dim=512)
        self.st_gcn = SkeletalStreamSTGCN(feature_dim=256)
        self.fusion = MultiStreamFusion(i3d_feature_dim=512, st_gcn_feature_dim=256, num_classes=num_classes)
        
if __name__ == "__main__":
    model = TwoStreamModel(num_classes=100)
    torch.save(model.state_dict(), 'checkpoint.pth')
    print('Checkpoint saved successfully! Ready for Phase 4.')
