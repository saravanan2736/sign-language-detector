"""Record your own sign samples from the webcam for the demo words.

Usage:  python record_samples.py            (all demo words)
        python record_samples.py drink eat  (only these)
Controls: SPACE = start/stop a take, N = next word, Q = quit.
Each take is resampled to 64 frames and saved to data/own/<word>_<k>.npy
Sign naturally; start just before and stop just after the sign (~1-3 s).
"""
import glob
import json
import os
import sys

import cv2
import mediapipe as mp
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(ROOT, "frontend"))
from live import extract_landmarks  # noqa: E402

words = sys.argv[1:] or json.load(open(os.path.join(ROOT, "data", "metadata", "demo_words.json")))
out_dir = os.path.join(ROOT, "data", "own")
os.makedirs(out_dir, exist_ok=True)

pose = mp.solutions.pose.Pose(static_image_mode=False, min_detection_confidence=0.5)
hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5)
cap = cv2.VideoCapture(0)

wi, recording, take = 0, False, []
while wi < len(words):
    word = words[wi]
    have = len(glob.glob(os.path.join(out_dir, f"{word}_*.npy")))
    ok, frame = cap.read()
    if not ok:
        break
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    sk = extract_landmarks(pose.process(rgb), hands.process(rgb))
    if recording:
        take.append(sk)
        if len(take) > 150:      # 5 s safety limit
            recording = False
    view = cv2.flip(frame, 1)
    color = (0, 0, 255) if recording else (0, 255, 0)
    cv2.putText(view, f"SIGN: {word.upper()}  (saved: {have})", (10, 35), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    cv2.putText(view, "REC - press SPACE to stop" if recording else "SPACE=record  N=next  Q=quit",
                (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    cv2.imshow("Record samples", view)
    key = cv2.waitKey(1) & 0xFF
    if key == ord("q"):
        break
    if key == ord("n"):
        wi, recording, take = wi + 1, False, []
    if key == ord(" "):
        if not recording:
            recording, take = True, []
        else:
            recording = False
            if len(take) >= 10 and any(t.any() for t in take):
                idx = np.linspace(0, len(take) - 1, 64).astype(int)
                np.save(os.path.join(out_dir, f"{word}_{have + 1}.npy"), np.stack([take[i] for i in idx]).astype(np.float16))
                print(f"saved {word} #{have + 1} ({len(take)} frames)")
            else:
                print("take discarded (too short or nothing detected)")
            take = []
cap.release()
cv2.destroyAllWindows()
