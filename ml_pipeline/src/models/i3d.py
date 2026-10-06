import torch
import torch.nn as nn
from torchvision.models.video import r3d_18, R3D_18_Weights

class VisualStreamI3D(nn.Module):
    def __init__(self, feature_dim=512, pretrained=True):
        """
        Visual Stream utilizing a 3D ResNet (R3D) as a proxy for I3D to extract 
        spatiotemporal features from RGB frames.
        """
        super(VisualStreamI3D, self).__init__()
        
        # Load a pretrained 3D ResNet from torchvision
        weights = R3D_18_Weights.DEFAULT if pretrained else None
        self.backbone = r3d_18(weights=weights)
        
        # Remove the final classification layer to expose the feature embedding
        # r3d_18 default output feature dimension is 512
        self.backbone.fc = nn.Identity()
        
        # Optional projection to target feature_dim
        self.projection = nn.Linear(512, feature_dim) if feature_dim != 512 else nn.Identity()

    def forward(self, x):
        # x shape should be (B, C, T, H, W)
        features = self.backbone(x) # Shape: (B, 512)
        return self.projection(features)
