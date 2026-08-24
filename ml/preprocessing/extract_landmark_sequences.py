"""
ISL Sequence Landmark Extractor & Preprocessor
Extracts 30-frame normalized MediaPipe landmark sequences from video recordings.
Enforces wrist-relative translation and palm-scale normalization across all frames.
"""

import math
import json
import os
from typing import List, Dict, Any, Optional

def normalize_hand_landmarks(landmarks: List[Dict[str, float]]) -> Optional[List[Dict[str, float]]]:
    """
    Normalizes 21 3D coordinates relative to wrist origin and scales by palm span.
    """
    if not landmarks or len(landmarks) < 21:
        return None

    wrist = landmarks[0]
    middle_mcp = landmarks[9]

    dx = middle_mcp['x'] - wrist['x']
    dy = middle_mcp['y'] - wrist['y']
    dz = middle_mcp.get('z', 0.0) - wrist.get('z', 0.0)
    palm_scale = math.sqrt(dx * dx + dy * dy + dz * dz) or 0.15

    normalized = []
    for pt in landmarks:
        normalized.append({
            'x': (pt['x'] - wrist['x']) / palm_scale,
            'y': (pt['y'] - wrist['y']) / palm_scale,
            'z': (pt.get('z', 0.0) - wrist.get('z', 0.0)) / palm_scale
        })
    return normalized

def process_raw_recording(
    raw_video_frames: List[Dict[str, Any]], 
    signer_id: str, 
    sign_id: str, 
    target_length: int = 30
) -> Dict[str, Any]:
    """
    Preprocesses a raw landmark frame stream into a fixed 30-frame normalized sequence.
    """
    processed_frames = []
    
    for idx, frame in enumerate(raw_video_frames[:target_length]):
        left_norm = normalize_hand_landmarks(frame.get('leftHand', []))
        right_norm = normalize_hand_landmarks(frame.get('rightHand', []))
        
        processed_frames.append({
            'frameIndex': idx,
            'timestampMs': idx * 33.33,
            'handsCount': (1 if left_norm else 0) + (1 if right_norm else 0),
            'leftHand': left_norm or [],
            'rightHand': right_norm or []
        })

    # Pad with last frame if video is shorter than 30 frames
    while len(processed_frames) < target_length:
        last = processed_frames[-1] if processed_frames else {
            'frameIndex': len(processed_frames),
            'timestampMs': len(processed_frames) * 33.33,
            'handsCount': 0,
            'leftHand': [],
            'rightHand': []
        }
        processed_frames.append(last)

    return {
        'sessionId': f"sess_{signer_id}_{sign_id}",
        'signerId': signer_id,
        'signId': sign_id,
        'type': 'dynamic' if sign_id in ['pump', 'science', 'student'] else 'static',
        'sampleRateFps': 30,
        'frames': processed_frames[:target_length]
    }

if __name__ == '__main__':
    print("ISL Preprocessing Pipeline initialized. Ready to process video landmark streams.")
