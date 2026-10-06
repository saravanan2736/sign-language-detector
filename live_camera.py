import cv2
import torch
import numpy as np
import mediapipe as mp
import torch.nn.functional as F
import sys
import os

# Add pipeline to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'ml_pipeline/src'))
from train import TwoStreamModel

print("Initializing PyTorch and MediaPipe...")
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = TwoStreamModel(num_classes=100)
model.load_state_dict(torch.load("checkpoint.pth", map_location=device, weights_only=True))
model.to(device)
model.eval()

mp_pose = mp.solutions.pose.Pose(static_image_mode=False, min_detection_confidence=0.5)
mp_hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

def extract_landmarks(pose_results, hand_results):
    landmarks = []
    # Pose
    if pose_results.pose_landmarks:
        for lm in pose_results.pose_landmarks.landmark:
            landmarks.append([lm.x, lm.y, lm.z])
    else:
        landmarks.extend([[0, 0, 0]] * 33)
        
    # Hands
    left_hand = [[0, 0, 0]] * 21
    right_hand = [[0, 0, 0]] * 21
    
    if hand_results.multi_hand_landmarks and hand_results.multi_handedness:
        for hand_landmarks, handedness in zip(hand_results.multi_hand_landmarks, hand_results.multi_handedness):
            hand_label = handedness.classification[0].label
            coords = [[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark]
            if hand_label == "Left":
                left_hand = coords
            else:
                right_hand = coords
                
    landmarks.extend(left_hand)
    landmarks.extend(right_hand)
    return np.array(landmarks, dtype=np.float32)

import json

print("Loading vocabulary...")
with open("data/metadata/wlasl100_classes.json", "r") as f:
    vocab = json.load(f)
    index_to_word = {item["class_index"]: item["gloss"] for item in vocab}

print("Starting Webcam...")
cap = cv2.VideoCapture(0)

buffer_frames = []
buffer_skeletons = []
current_prediction = "Waiting (Need 64 frames)..."
frame_counter = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # MediaPipe needs RGB
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # 1. Get Skeletons
    pose_results = mp_pose.process(frame_rgb)
    hand_results = mp_hands.process(frame_rgb)
    skeleton = extract_landmarks(pose_results, hand_results)
    
    # Draw hand tracking dots on the frame
    if hand_results.multi_hand_landmarks:
        for hand_landmarks in hand_results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                hand_landmarks,
                mp.solutions.hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style())
                
    # 2. Get Visual Frame
    resized_frame = cv2.resize(frame_rgb, (224, 224))
    normalized_frame = resized_frame.astype(np.float32) / 255.0
    
    buffer_frames.append(normalized_frame)
    buffer_skeletons.append(skeleton)
    
    # Maintain a rolling window of 64 frames
    if len(buffer_frames) > 64:
        buffer_frames.pop(0)
        buffer_skeletons.pop(0)
        
    frame_counter += 1
        
    # Run Inference only twice a second (every 15 frames) instead of every single frame!
    if len(buffer_frames) == 64 and frame_counter % 15 == 0:
        frames_np = np.array(buffer_frames).transpose(3, 0, 1, 2)
        skeletons_np = np.array(buffer_skeletons)
        
        frames_t = torch.tensor(frames_np).unsqueeze(0).to(device)
        skeletons_t = torch.tensor(skeletons_np).unsqueeze(0).to(device)
        
        with torch.no_grad():
            outputs = model(frames_t, skeletons_t)
            probs = F.softmax(outputs, dim=1)
            max_prob, predicted_idx = torch.max(probs, 1)
            
            if max_prob.item() > 0.01:
                predicted_word = index_to_word.get(predicted_idx.item(), "Unknown").upper()
                current_prediction = f"Sign: {predicted_word} (Score: {max_prob.item():.2f})"
            
    # Draw prediction on screen
    cv2.putText(frame, current_prediction, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2, cv2.LINE_AA)
    cv2.putText(frame, "Press 'Q' to quit", (10, 450), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    
    cv2.imshow('Real-Time ASL Detector', frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break
        
cap.release()
cv2.destroyAllWindows()
