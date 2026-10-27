"""Loads the inference model.

Priority: ensemble of checkpoints/ens_*.pth (demo words) -> single checkpoints/demo.pth
-> full 100-word checkpoint.pth. Delete the ens_*.pth files to fall back to the single model.
"""
import glob
import json
import os

import torch
import torch.nn as nn

from train import TwoStreamModel


class Ensemble(nn.Module):
    """Averages the softmax outputs of several models. Returns log-probabilities, so a
    softmax on the output gives back the averaged probabilities."""

    def __init__(self, models):
        super().__init__()
        self.models = nn.ModuleList(models)

    def forward(self, rgb_input, skeletal_input):
        probs = torch.stack([torch.softmax(m(rgb_input, skeletal_input), dim=1) for m in self.models]).mean(0)
        return torch.log(probs.clamp_min(1e-9))


def _load(path, num_classes, device):
    model = TwoStreamModel(num_classes=num_classes)
    model.load_state_dict(torch.load(path, map_location=device, weights_only=True))
    return model.to(device).eval()


def load_inference_model(root, device):
    meta = os.path.join(root, "data", "metadata")
    demo_words = os.path.join(meta, "demo_words.json")
    demo_ckpt = os.path.join(root, "checkpoints", "demo.pth")
    ens_ckpts = sorted(glob.glob(os.path.join(root, "checkpoints", "ens_*.pth")))

    if os.path.exists(demo_words) and (ens_ckpts or os.path.exists(demo_ckpt)):
        with open(demo_words) as f:
            index_to_word = dict(enumerate(json.load(f)))
        n = len(index_to_word)
        if ens_ckpts:
            return Ensemble([_load(p, n, device) for p in ens_ckpts]).to(device).eval(), index_to_word
        return _load(demo_ckpt, n, device), index_to_word

    with open(os.path.join(meta, "wlasl100_classes.json")) as f:
        index_to_word = {i["class_index"]: i["gloss"] for i in json.load(f)}
    return _load(os.path.join(root, "checkpoint.pth"), len(index_to_word), device), index_to_word
