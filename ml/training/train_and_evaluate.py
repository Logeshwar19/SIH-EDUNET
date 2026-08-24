"""
Production ISL Dynamic Sequence Classifier:
1. Loads 192 samples across 8 signers (48 per class for PUMP, SCIENCE, STUDENT, and UNKNOWN).
2. Performs 4-Fold Signer-Aware Group-K-Fold Cross-Validation (zero data leakage across signers).
3. Computes Precision, Recall, F1, Confusion Matrix, and Unknown Rejection Rate.
4. Trains Final Production GRU Model and Exports to ONNX for WebAssembly browser inference.
5. Measures real model size and CPU inference latency.
"""

import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

import os
import json
import time
import math
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import GroupKFold
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix, accuracy_score

ALL_CLASSES = ['pump', 'science', 'student', 'unknown']
NUM_CLASSES = len(ALL_CLASSES)
SEQUENCE_LENGTH = 30
FEATURE_DIM = 42 * 3  # 126 coordinates

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset", "samples")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
PUBLIC_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "client", "public", "models")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(PUBLIC_MODELS_DIR, exist_ok=True)

def normalize_landmark_pt(pt, wrist, scale):
    if not pt or not wrist:
        return 0.0, 0.0, 0.0
    return (
        (pt.get('x', 0.0) - wrist.get('x', 0.0)) / scale,
        (pt.get('y', 0.0) - wrist.get('y', 0.0)) / scale,
        (pt.get('z', 0.0) - wrist.get('z', 0.0)) / scale
    )

def frame_to_feature_vector(frame):
    vec = np.zeros(FEATURE_DIM, dtype=np.float32)
    left = frame.get('leftHand', [])
    right = frame.get('rightHand', [])

    # Normalize left hand
    if left and len(left) >= 21:
        wrist_l = left[0]
        middle_l = left[9]
        scale_l = math.sqrt(
            (middle_l['x'] - wrist_l['x'])**2 +
            (middle_l['y'] - wrist_l['y'])**2 +
            (middle_l.get('z', 0) - wrist_l.get('z', 0))**2
        ) or 0.15
        for i, pt in enumerate(left[:21]):
            x, y, z = normalize_landmark_pt(pt, wrist_l, scale_l)
            vec[i * 3 + 0] = x
            vec[i * 3 + 1] = y
            vec[i * 3 + 2] = z

    # Normalize right hand
    if right and len(right) >= 21:
        wrist_r = right[0]
        middle_r = right[9]
        scale_r = math.sqrt(
            (middle_r['x'] - wrist_r['x'])**2 +
            (middle_r['y'] - wrist_r['y'])**2 +
            (middle_r.get('z', 0) - wrist_r.get('z', 0))**2
        ) or 0.15
        for i, pt in enumerate(right[:21]):
            x, y, z = normalize_landmark_pt(pt, wrist_r, scale_r)
            vec[63 + i * 3 + 0] = x
            vec[63 + i * 3 + 1] = y
            vec[63 + i * 3 + 2] = z

    return vec

def load_data():
    X, y, groups = [], [], []

    for fname in os.listdir(DATASET_DIR):
        if not fname.endswith('.json'):
            continue
        with open(os.path.join(DATASET_DIR, fname), 'r') as f:
            data = json.load(f)
            sign_id = data.get('signId')
            signer_id = data.get('signerId')
            frames = data.get('frames', [])[:SEQUENCE_LENGTH]

            seq_matrix = np.array([frame_to_feature_vector(fr) for fr in frames], dtype=np.float32)
            if len(seq_matrix) < SEQUENCE_LENGTH:
                pad = np.zeros((SEQUENCE_LENGTH - len(seq_matrix), FEATURE_DIM), dtype=np.float32)
                seq_matrix = np.vstack([seq_matrix, pad])

            if sign_id in ALL_CLASSES:
                X.append(seq_matrix)
                y.append(ALL_CLASSES.index(sign_id))
                groups.append(signer_id)

    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int64), np.array(groups)

# PyTorch 2-Layer GRU Sequence Classifier
class ISLSequenceGRU(nn.Module):
    def __init__(self, input_dim=126, hidden_dim=64, num_classes=4):
        super().__init__()
        self.gru1 = nn.GRU(input_dim, hidden_dim, batch_first=True, num_layers=2, dropout=0.2)
        self.fc1 = nn.Linear(hidden_dim, 32)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(32, num_classes)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        out, _ = self.gru1(x)
        last_step = out[:, -1, :]
        feat = self.relu(self.fc1(last_step))
        logits = self.fc2(feat)
        probs = self.softmax(logits)
        return probs

def train_epoch(model, dataloader, optimizer, criterion):
    model.train()
    total_loss = 0.0
    for X_batch, y_batch in dataloader:
        optimizer.zero_grad()
        probs = model(X_batch)
        loss = criterion(torch.log(probs + 1e-8), y_batch)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(y_batch)
    return total_loss / len(dataloader.dataset)

def evaluate(model, X, y):
    model.eval()
    with torch.no_grad():
        X_t = torch.tensor(X, dtype=torch.float32)
        probs = model(X_t).numpy()
        preds = np.argmax(probs, axis=1)
        max_probs = np.max(probs, axis=1)
    return preds, probs, max_probs

def run_cross_validation(X, y, groups):
    print("\n" + "="*65)
    print("[*] RUNNING SIGNER-AWARE GROUP-K-FOLD CROSS-VALIDATION (4 FOLDS)")
    print("="*65)

    gkf = GroupKFold(n_splits=4)
    all_y_true = []
    all_y_pred = []
    all_max_probs = []

    fold = 1
    for train_idx, val_idx in gkf.split(X, y, groups=groups):
        val_signers = np.unique(groups[val_idx])

        X_train, y_train = X[train_idx], y[train_idx]
        X_val, y_val = X[val_idx], y[val_idx]

        train_ds = torch.utils.data.TensorDataset(torch.tensor(X_train), torch.tensor(y_train))
        train_loader = torch.utils.data.DataLoader(train_ds, batch_size=16, shuffle=True)

        model = ISLSequenceGRU(input_dim=FEATURE_DIM, hidden_dim=64, num_classes=NUM_CLASSES)
        optimizer = optim.Adam(model.parameters(), lr=0.003, weight_decay=1e-4)
        criterion = nn.NLLLoss()

        for epoch in range(45):
            train_epoch(model, train_loader, optimizer, criterion)

        preds, probs, max_probs = evaluate(model, X_val, y_val)
        fold_acc = accuracy_score(y_val, preds) * 100

        all_y_true.extend(y_val)
        all_y_pred.extend(preds)
        all_max_probs.extend(max_probs)

        print(f"Fold {fold}: Val Signers={val_signers.tolist()} | Accuracy={fold_acc:.1f}%")
        fold += 1

    all_y_true = np.array(all_y_true)
    all_y_pred = np.array(all_y_pred)
    all_max_probs = np.array(all_max_probs)

    overall_acc = accuracy_score(all_y_true, all_y_pred) * 100
    precision = precision_score(all_y_true, all_y_pred, average=None) * 100
    recall = recall_score(all_y_true, all_y_pred, average=None) * 100
    f1 = f1_score(all_y_true, all_y_pred, average=None) * 100
    conf_matrix = confusion_matrix(all_y_true, all_y_pred)

    # Unknown / Negative samples stats (Class index 3)
    unk_mask = (all_y_true == 3)
    unk_total = np.sum(unk_mask)
    unk_correct = np.sum((all_y_pred == 3) & unk_mask)
    unk_rejection_rate = (unk_correct / unk_total) * 100 if unk_total > 0 else 100.0

    print("\n" + "="*65)
    print("[RESULTS] CROSS-VALIDATION RESULTS (SIGNER-AWARE ZERO-LEAKAGE)")
    print("="*65)
    print(f"Overall 4-Class Accuracy: {overall_acc:.2f}%\n")
    print(f"{'Class':<12} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}")
    print("-" * 50)
    for i, name in enumerate(ALL_CLASSES):
        print(f"{name.upper():<12} | {precision[i]:>8.1f}% | {recall[i]:>8.1f}% | {f1[i]:>8.1f}%")

    print("\nConfusion Matrix:")
    print("Pred ->   " + "  ".join([f"{c.upper():>7}" for c in ALL_CLASSES]))
    for i, row in enumerate(conf_matrix):
        print(f"True {ALL_CLASSES[i].upper():<7}: " + "  ".join([f"{val:>7}" for val in row]))

    print(f"\nUnknown / Negative Gesture Rejection Rate: {unk_rejection_rate:.1f}% ({unk_correct}/{unk_total} correctly rejected)")

    return {
        'overall_accuracy': round(overall_acc, 2),
        'precision': {ALL_CLASSES[i]: round(precision[i], 1) for i in range(NUM_CLASSES)},
        'recall': {ALL_CLASSES[i]: round(recall[i], 1) for i in range(NUM_CLASSES)},
        'f1': {ALL_CLASSES[i]: round(f1[i], 1) for i in range(NUM_CLASSES)},
        'confusion_matrix': conf_matrix.tolist(),
        'unknown_rejection_rate': round(unk_rejection_rate, 1)
    }

def train_production_model(X, y):
    print("\n" + "="*65)
    print("[*] TRAINING PRODUCTION GRU MODEL & EXPORTING TO ONNX")
    print("="*65)

    model = ISLSequenceGRU(input_dim=FEATURE_DIM, hidden_dim=64, num_classes=NUM_CLASSES)
    optimizer = optim.Adam(model.parameters(), lr=0.003, weight_decay=1e-4)
    criterion = nn.NLLLoss()

    train_ds = torch.utils.data.TensorDataset(torch.tensor(X), torch.tensor(y))
    train_loader = torch.utils.data.DataLoader(train_ds, batch_size=16, shuffle=True)

    for epoch in range(50):
        train_epoch(model, train_loader, optimizer, criterion)

    # Save PyTorch weights
    pt_path = os.path.join(MODELS_DIR, "isl_dynamic_gru.pt")
    torch.save(model.state_dict(), pt_path)
    print(f"[OK] PyTorch weights saved: {pt_path}")

    # Set model to evaluation mode before export
    model.eval()

    # Export to ONNX
    dummy_input = torch.randn(1, SEQUENCE_LENGTH, FEATURE_DIM, dtype=torch.float32)
    onnx_path_ml = os.path.join(MODELS_DIR, "isl_dynamic_gru.onnx")
    onnx_path_client = os.path.join(PUBLIC_MODELS_DIR, "isl_dynamic_gru.onnx")

    for path in [onnx_path_ml, onnx_path_client]:
        torch.onnx.export(
            model,
            dummy_input,
            path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=['sequence_input'],
            output_names=['class_probabilities'],
            dynamic_axes={
                'sequence_input': {0: 'batch_size'},
                'class_probabilities': {0: 'batch_size'}
            }
        )
        file_size_kb = os.path.getsize(path) / 1024.0
        print(f"[OK] ONNX model exported: {path} ({file_size_kb:.1f} KB)")

    # Measure CPU Inference Latency
    latencies = []
    for _ in range(100):
        t0 = time.perf_counter()
        _ = model(dummy_input)
        latencies.append((time.perf_counter() - t0) * 1000.0)

    avg_latency = np.mean(latencies[10:])
    p95_latency = np.percentile(latencies[10:], 95)
    print(f"Measured GRU Inference Latency: Mean={avg_latency:.2f} ms | P95={p95_latency:.2f} ms")

    return {
        'model_size_kb': round(file_size_kb, 1),
        'mean_latency_ms': round(avg_latency, 2),
        'p95_latency_ms': round(p95_latency, 2)
    }

if __name__ == '__main__':
    X, y, groups = load_data()
    print(f"Loaded {len(X)} total sequence samples (48 per class across 8 signers).")

    metrics = run_cross_validation(X, y, groups)
    perf = train_production_model(X, y)

    summary = {
        'classes': ALL_CLASSES,
        'metrics': metrics,
        'performance': perf,
        'timestamp': time.strftime("%Y-%m-%d %H:%M:%S")
    }

    report_path = os.path.join(MODELS_DIR, "training_report.json")
    with open(report_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"\n[OK] Complete Training Report saved to '{report_path}'")
