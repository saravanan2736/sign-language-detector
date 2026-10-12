import os
import sys

import numpy as np
import torch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(ROOT, "ml_pipeline", "src"))
from train import TwoStreamModel, normalize_skeleton  # noqa: E402


def test_model_output_shape():
    model = TwoStreamModel(num_classes=100).eval()
    out = model(None, torch.rand(2, 64, 75, 3))
    assert out.shape == (2, 100)


def test_normalize_skeleton_handles_missing_joints():
    x = torch.zeros(1, 64, 75, 3)
    out = normalize_skeleton(x)
    assert out.shape == (1, 64, 75, 9)
    assert torch.isfinite(out).all()


def test_checkpoint_loads():
    model = TwoStreamModel(num_classes=100)
    model.load_state_dict(torch.load(os.path.join(ROOT, "checkpoint.pth"), map_location="cpu", weights_only=True))
