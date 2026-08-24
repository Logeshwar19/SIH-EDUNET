# 🧠 InclusiveAI Machine Learning & Sequence Training Pipeline

## Overview
This directory contains the training, preprocessing, and export pipelines for the **Dynamic Indian Sign Language Sequence Classifier** in InclusiveAI.

### 1. Data Integrity & Person-Aware Splitting (Zero Data Leakage)
- When capturing multiple repetitions of signs from multiple signers, frames from the same signer/recording session must **never** be randomly split across train and test sets.
- We implement `GroupKFold` / `StratifiedGroupKFold` grouped strictly by `signerId`.

### 2. Supported Dynamic Classes
- **`PUMP`**: Dual fists pulsing rhythmically in front of chest.
- **`SCIENCE`**: Both hands performing alternating circular beaker pour motions.
- **`STUDENT`**: Hand drawing knowledge upward from palm toward forehead.

### 3. Pipeline Architecture
```text
Raw ISL Video (30 FPS)
         ↓
MediaPipe Hands (42 Landmarks: 21 Left + 21 Right)
         ↓
Translation & Palm-Scale Normalization (126-dim per frame)
         ↓
30-Frame Sequence Window (Shape: 30 × 126)
         ↓
2-Layer GRU Classifier (Hidden: 64 → 32 → Dense Softmax)
         ↓
ONNX / TF.js Web Browser Export (<5ms latency)
```

### 4. Verified Dataset Claims
- **Disclaimers**: Do not use American Sign Language (ASL) or British Sign Language (BSL) datasets as a substitute for Indian Sign Language (ISL).
- Custom dataset samples recorded for InclusiveAI are validated against standard NCERT / ISLRTC (Indian Sign Language Research and Training Centre) educational vocabulary.
