"""
Model Evaluation and Metrics Utility Module
Computes classification metrics, confusion matrices, and visualization figures.
"""

from typing import Dict, Any, List
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score
)

def compute_all_metrics(
    y_true: List[int],
    y_pred: List[int],
    y_prob: List[float],
    model_name: str,
    dataset_name: str = "UCI SMS Spam Collection",
    train_count: int = 0,
    test_count: int = 0,
    model_version: str = "1.0.0"
) -> Dict[str, Any]:
    """
    Computes a comprehensive dictionary of evaluation metrics.
    Spam class is encoded as 1, Ham class is encoded as 0.
    """
    acc = float(accuracy_score(y_true, y_pred))
    prec_spam = float(precision_score(y_true, y_pred, pos_label=1, zero_division=0))
    rec_spam = float(recall_score(y_true, y_pred, pos_label=1, zero_division=0))
    f1_spam = float(f1_score(y_true, y_pred, pos_label=1, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        auc = 0.5

    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.shape == (2, 2) else (0, 0, 0, 0)

    report = classification_report(y_true, y_pred, target_names=["legitimate", "spam"], output_dict=True)

    return {
        "model_name": model_name,
        "dataset_name": dataset_name,
        "model_version": model_version,
        "accuracy": round(acc, 4),
        "spam_precision": round(prec_spam, 4),
        "spam_recall": round(rec_spam, 4),
        "spam_f1_score": round(f1_spam, 4),
        "roc_auc": round(auc, 4),
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
            "matrix_array": cm.tolist()
        },
        "classification_report": report,
        "num_train_messages": int(train_count),
        "num_test_messages": int(test_count)
    }
