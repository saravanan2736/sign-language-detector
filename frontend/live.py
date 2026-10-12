"""Live webcam recognition inside Streamlit (streamlit-webrtc + MediaPipe + the trained model)."""
import json
import os
import sys
import threading

import av
import cv2
import mediapipe as mp
import numpy as np
import streamlit as st
import torch
import torch.nn.functional as F

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(ROOT, "ml_pipeline", "src"))
from model_loader import load_inference_model  # noqa: E402

WINDOW = 64
INFER_EVERY = 15


@st.cache_resource
def load_model():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, vocab = load_inference_model(ROOT, device)
    return model, device, vocab


def extract_landmarks(pose_results, hand_results):
    lm = [[p.x, p.y, p.z] for p in pose_results.pose_landmarks.landmark] if pose_results.pose_landmarks else [[0, 0, 0]] * 33
    left, right = [[0, 0, 0]] * 21, [[0, 0, 0]] * 21
    if hand_results.multi_hand_landmarks and hand_results.multi_handedness:
        for hl, hd in zip(hand_results.multi_hand_landmarks, hand_results.multi_handedness):
            coords = [[p.x, p.y, p.z] for p in hl.landmark]
            if hd.classification[0].label == "Left":
                left = coords
            else:
                right = coords
    return np.array(lm + left + right, dtype=np.float32)


class LiveRecognizer:
    """Holds per-session state; `callback` is passed to webrtc_streamer as video_frame_callback."""

    def __init__(self, model, device, vocab):
        self.model, self.device, self.vocab = model, device, vocab
        self.pose = mp.solutions.pose.Pose(static_image_mode=False, min_detection_confidence=0.5)
        self.hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5)
        self.buffer, self.count = [], 0
        self.top5 = []
        self.lock = threading.Lock()

    def callback(self, frame: av.VideoFrame) -> av.VideoFrame:
        img = frame.to_ndarray(format="bgr24")
        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pose_r, hand_r = self.pose.process(rgb), self.hands.process(rgb)
        self.buffer.append(extract_landmarks(pose_r, hand_r))
        self.buffer = self.buffer[-WINDOW:]
        self.count += 1

        if hand_r.multi_hand_landmarks:
            for hl in hand_r.multi_hand_landmarks:
                mp.solutions.drawing_utils.draw_landmarks(
                    img, hl, mp.solutions.hands.HAND_CONNECTIONS,
                    mp.solutions.drawing_styles.get_default_hand_landmarks_style(),
                    mp.solutions.drawing_styles.get_default_hand_connections_style())

        if len(self.buffer) == WINDOW and self.count % INFER_EVERY == 0:
            x = torch.from_numpy(np.stack(self.buffer)).unsqueeze(0).to(self.device)
            with torch.no_grad():
                probs = F.softmax(self.model(None, x), dim=1)[0]
            p, i = torch.topk(probs, 5)
            with self.lock:
                self.top5 = [(self.vocab.get(int(k), "?"), float(v)) for v, k in zip(p, i)]

        with self.lock:
            top = self.top5[0] if self.top5 else None
        text = f"{top[0].upper()} ({top[1]:.2f})" if top else f"Collecting frames {len(self.buffer)}/{WINDOW}"
        cv2.putText(img, text, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2, cv2.LINE_AA)
        return av.VideoFrame.from_ndarray(img, format="bgr24")

    def get_top5(self):
        with self.lock:
            return list(self.top5)
