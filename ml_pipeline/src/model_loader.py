"""Loads the demo model (12 basic words) if present, otherwise the full 100-word model."""
import json
import os

import torch

from train import TwoStreamModel


def load_inference_model(root, device):
    meta = os.path.join(root, "data", "metadata")
    demo_ckpt = os.path.join(root, "checkpoints", "demo.pth")
    demo_words = os.path.join(meta, "demo_words.json")
    if os.path.exists(demo_ckpt) and os.path.exists(demo_words):
        with open(demo_words) as f:
            words = json.load(f)
        ckpt, index_to_word = demo_ckpt, dict(enumerate(words))
    else:
        with open(os.path.join(meta, "wlasl100_classes.json")) as f:
            index_to_word = {i["class_index"]: i["gloss"] for i in json.load(f)}
        ckpt = os.path.join(root, "checkpoint.pth")
    model = TwoStreamModel(num_classes=len(index_to_word))
    model.load_state_dict(torch.load(ckpt, map_location=device, weights_only=True))
    return model.to(device).eval(), index_to_word
