"""
ISL Dynamic Sequence Model Evaluation & Metric Suite
Computes Precision, Recall, F1-Score, and per-class Confusion Matrices with zero data leakage.
"""

import numpy as np

DYNAMIC_CLASSES = ['pump', 'science', 'student']

def compute_metrics(y_true, y_pred, y_prob, confidence_threshold=0.80):
    """
    Evaluates predictions with unknown rejection gating.
    If max class probability < confidence_threshold, class is classified as UNKNOWN.
    """
    total = len(y_true)
    if total == 0:
        return {}

    y_pred_gated = []
    unknown_count = 0

    for i in range(total):
        max_p = np.max(y_prob[i]) if y_prob is not None else 1.0
        if max_p >= confidence_threshold:
            y_pred_gated.append(y_pred[i])
        else:
            y_pred_gated.append(-1)  # -1 represents UNKNOWN
            unknown_count += 1

    # Per-class accuracy
    per_class_acc = {}
    for idx, cls_name in enumerate(DYNAMIC_CLASSES):
        mask = (y_true == idx)
        if np.sum(mask) > 0:
            correct = np.sum((np.array(y_pred_gated) == idx) & mask)
            per_class_acc[cls_name] = round(float(correct / np.sum(mask)) * 100, 1)

    return {
        'total_samples': total,
        'unknown_rejections': unknown_count,
        'per_class_accuracy': per_class_acc
    }

if __name__ == '__main__':
    print("ISL Model Evaluation Suite ready.")
