import torch
import torch.nn as nn

class MultiStreamFusion(nn.Module):
    def __init__(self, i3d_feature_dim, st_gcn_feature_dim, num_classes):
        super(MultiStreamFusion, self).__init__()
        
        # Projections for each stream
        self.proj_i3d = nn.Linear(i3d_feature_dim, 256)
        self.proj_st_gcn = nn.Linear(st_gcn_feature_dim, 256)
        
        # Layer Normalization
        self.ln_i3d = nn.LayerNorm(256)
        self.ln_st_gcn = nn.LayerNorm(256)
        
        # Dropout
        self.dropout = nn.Dropout(0.5)
        
        # Classifier Head
        self.classifier = nn.Linear(512, num_classes)

    def forward(self, i3d_features, st_gcn_features):
        # 1. Projection and Normalization
        u_v = self.ln_i3d(self.proj_i3d(i3d_features))
        u_s = self.ln_st_gcn(self.proj_st_gcn(st_gcn_features))
        
        # 2. Concatenation
        z_concat = torch.cat((u_v, u_s), dim=1)
        
        # 3. Dropout
        z_drop = self.dropout(z_concat)
        
        # 4. Classification
        logits = self.classifier(z_drop)
        return logits
