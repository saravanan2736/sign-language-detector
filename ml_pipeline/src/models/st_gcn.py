import torch
import torch.nn as nn
import torch.nn.functional as F

class GraphConvolution(nn.Module):
    def __init__(self, in_channels, out_channels):
        super(GraphConvolution, self).__init__()
        # A simple linear layer representing spatial convolution over joints
        self.fc = nn.Linear(in_channels, out_channels)

    def forward(self, x):
        # x shape: (B, T, V, C) where V is num joints, C is channels
        return self.fc(x)

class STGCNBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super(STGCNBlock, self).__init__()
        # Spatial Graph Convolution
        self.gcn = GraphConvolution(in_channels, out_channels)
        
        # Temporal Convolution
        self.tcn = nn.Conv2d(
            out_channels, out_channels, 
            kernel_size=(9, 1), 
            padding=(4, 0), 
            stride=(stride, 1)
        )
        
        # Batch Norm
        self.bn = nn.BatchNorm2d(out_channels)

    def forward(self, x):
        # x shape: (B, C, T, V)
        B, C, T, V = x.size()
        
        # Prepare for GCN: (B, T, V, C)
        x = x.permute(0, 2, 3, 1).contiguous()
        x = self.gcn(x)
        
        # Prepare for TCN: (B, C_out, T, V)
        x = x.permute(0, 3, 1, 2).contiguous()
        x = self.tcn(x)
        
        x = self.bn(x)
        return F.relu(x)

class SkeletalStreamSTGCN(nn.Module):
    def __init__(self, in_channels=3, num_joints=75, feature_dim=256):
        """
        Spatial Temporal Graph Convolutional Network (ST-GCN)
        Processes skeletal landmark sequences into a fixed-length feature embedding.
        """
        super(SkeletalStreamSTGCN, self).__init__()
        
        self.data_bn = nn.BatchNorm1d(in_channels * num_joints)
        
        # Stacking ST-GCN Blocks
        self.st_gcn_networks = nn.Sequential(
            STGCNBlock(in_channels, 64),
            STGCNBlock(64, 64),
            STGCNBlock(64, 128, stride=2),
            STGCNBlock(128, 128),
            STGCNBlock(128, 256, stride=2),
            STGCNBlock(256, 256)
        )
        
        self.feature_dim = feature_dim

    def forward(self, x):
        # x shape: (B, T, V, C) where V=75, C=3
        B, T, V, C = x.size()
        
        # Data normalization
        x = x.permute(0, 3, 2, 1).contiguous() # (B, C, V, T)
        x = x.view(B, C * V, T)
        x = self.data_bn(x)
        x = x.view(B, C, V, T).permute(0, 1, 3, 2).contiguous() # (B, C, T, V)
        
        # Pass through ST-GCN layers
        x = self.st_gcn_networks(x) # (B, 256, T_out, V)
        
        # Global Average Pooling (Spatial and Temporal)
        x = F.avg_pool2d(x, x.size()[2:]) # (B, 256, 1, 1)
        x = x.view(B, -1) # (B, 256)
        
        return x
