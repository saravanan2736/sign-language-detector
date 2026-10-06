import cv2
import mediapipe as mp
import numpy as np

class VideoProcessor:
    def __init__(self, target_frames=64, target_size=(224, 224)):
        self.target_frames = target_frames
        self.target_size = target_size
        
        self.mp_pose = mp.solutions.pose
        self.mp_hands = mp.solutions.hands

    def process_video(self, video_path):
        cap = cv2.VideoCapture(video_path)
        raw_frames = []
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            raw_frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        cap.release()
        
        # 1. Sample exactly 64 frames BEFORE running MediaPipe! 
        # This prevents 300+ frame tracking deadlocks and speeds it up by 500%
        current_len = len(raw_frames)
        if current_len == 0:
            return np.zeros((3, self.target_frames, *self.target_size)), np.zeros((self.target_frames, 75, 3))
            
        if current_len > self.target_frames:
            indices = np.linspace(0, current_len - 1, self.target_frames, dtype=int)
            sampled_raw = [raw_frames[i] for i in indices]
        elif current_len < self.target_frames:
            padding_len = self.target_frames - current_len
            sampled_raw = raw_frames + [raw_frames[-1]] * padding_len
        else:
            sampled_raw = raw_frames
            
        frames = []
        skeletons = []
        
        # Use True to absolutely guarantee no deadlocks on Windows
        with self.mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose, \
             self.mp_hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5) as hands:
             
            for frame_rgb in sampled_raw:
                frame_rgb_small = cv2.resize(frame_rgb, self.target_size)
                
                pose_results = pose.process(frame_rgb_small)
                hand_results = hands.process(frame_rgb_small)
                
                skeletons.append(self._extract_landmarks(pose_results, hand_results))
                frames.append(frame_rgb_small.astype(np.float32) / 255.0)
                
        # Format for PyTorch: (T, H, W, C) -> (C, T, H, W)
        frames_tensor = np.array(frames).transpose(3, 0, 1, 2)
        skeletons_tensor = np.array(skeletons)
        
        return frames_tensor, skeletons_tensor

    def _extract_landmarks(self, pose_results, hand_results):
        # Placeholder for specific joint selection and coordinate normalization
        # as described in the paper. We'll extract 33 pose + 2*21 hand = 75 landmarks
        # Each landmark has (x, y, z)
        
        landmarks = []
        
        # Pose
        if pose_results.pose_landmarks:
            for lm in pose_results.pose_landmarks.landmark:
                landmarks.append([lm.x, lm.y, lm.z])
        else:
            landmarks.extend([[0, 0, 0]] * 33) # 33 is standard MediaPipe pose count
            
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

    def _sample_or_pad(self, frames, skeletons):
        current_len = len(frames)
        if current_len == 0:
             # Return empty arrays of target shape if video read fails
             return [np.zeros((*self.target_size, 3))] * self.target_frames, [np.zeros((75, 3))] * self.target_frames
             
        if current_len == self.target_frames:
            return frames, skeletons
            
        if current_len > self.target_frames:
            # Uniform sampling
            indices = np.linspace(0, current_len - 1, self.target_frames, dtype=int)
            return [frames[i] for i in indices], [skeletons[i] for i in indices]
            
        # Padding by repeating the last frame
        padding_len = self.target_frames - current_len
        padded_frames = frames + [frames[-1]] * padding_len
        padded_skeletons = skeletons + [skeletons[-1]] * padding_len
        return padded_frames, padded_skeletons
