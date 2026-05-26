#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

REPO_ROOT = Path(__file__).resolve().parents[2]
APP_DIR = REPO_ROOT / "ai-analyzer" / "app"

sys.path.insert(0, str(APP_DIR))

from anomaly_detector import FEATURE_NAMES  # noqa: E402


FEATURE_COLUMNS = [
    "event_count",
    *FEATURE_NAMES,
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train a MiniRTOS-Linux ML anomaly classifier."
    )

    parser.add_argument(
        "--dataset",
        default="reports/generated/synthetic_dataset.csv",
        help="Input synthetic dataset CSV path.",
    )

    parser.add_argument(
        "--model-output",
        default="models/anomaly_classifier.joblib",
        help="Output trained model path.",
    )

    parser.add_argument(
        "--label-encoder-output",
        default="models/label_encoder.joblib",
        help="Output label encoder path.",
    )

    parser.add_argument(
        "--metrics-output",
        default="reports/generated/model_metrics.json",
        help="Output model metrics JSON path.",
    )

    parser.add_argument(
        "--test-size",
        type=float,
        default=0.30,
        help="Fraction of rows used for evaluation. Default: 0.30.",
    )

    parser.add_argument(
        "--n-estimators",
        type=int,
        default=100,
        help="Number of trees for RandomForestClassifier. Default: 100.",
    )

    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed for reproducible training. Default: 42.",
    )

    return parser.parse_args()


def safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default

    if isinstance(value, bool):
        return float(value)

    if isinstance(value, int | float):
        return float(value)

    if isinstance(value, str):
        text = value.strip()

        if not text:
            return default

        try:
            return float(text)
        except ValueError:
            return default

    return default


def load_dataset(dataset_path: Path) -> tuple[list[list[float]], list[str], list[dict[str, str]]]:
    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {dataset_path}. "
            "Generate it first with ai-analyzer/training/generate_dataset.py."
        )

    with dataset_path.open("r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        rows = list(reader)

    if not rows:
        raise ValueError(f"Dataset is empty: {dataset_path}")

    missing_columns = [
        column for column in ["label", *FEATURE_COLUMNS]
        if column not in rows[0]
    ]

    if missing_columns:
        raise ValueError(
            "Dataset is missing required column(s): "
            + ", ".join(missing_columns)
        )

    x_values: list[list[float]] = []
    y_values: list[str] = []

    for row in rows:
        label = str(row.get("label", "")).strip()

        if not label:
            raise ValueError("Dataset contains a row with an empty label.")

        x_values.append([safe_float(row.get(column)) for column in FEATURE_COLUMNS])
        y_values.append(label)

    return x_values, y_values, rows


def to_jsonable(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): to_jsonable(item) for key, item in value.items()}

    if isinstance(value, list | tuple):
        return [to_jsonable(item) for item in value]

    if hasattr(value, "item"):
        return value.item()

    return value


def train_model(
    dataset_path: Path,
    model_output_path: Path,
    label_encoder_output_path: Path,
    metrics_output_path: Path,
    test_size: float = 0.30,
    n_estimators: int = 100,
    random_state: int = 42,
) -> dict[str, Any]:
    if not 0 < test_size < 1:
        raise ValueError("test_size must be between 0 and 1.")

    if n_estimators <= 0:
        raise ValueError("n_estimators must be greater than 0.")

    x_values, y_labels, rows = load_dataset(dataset_path)

    label_counts = Counter(y_labels)

    if len(label_counts) < 2:
        raise ValueError(
            "At least two labels are required to train a classifier."
        )

    label_encoder = LabelEncoder()
    y_values = label_encoder.fit_transform(y_labels)

    can_stratify = min(label_counts.values()) >= 2
    minimum_test_fraction = len(label_counts) / len(y_labels)
    adjusted_test_size = max(test_size, minimum_test_fraction)

    if adjusted_test_size >= 1:
        adjusted_test_size = test_size

    if can_stratify and len(y_labels) >= len(label_counts) * 2:
        x_train, x_test, y_train, y_test = train_test_split(
            x_values,
            y_values,
            test_size=adjusted_test_size,
            random_state=random_state,
            stratify=y_values,
        )
    else:
        x_train = x_values
        x_test = x_values
        y_train = y_values
        y_test = y_values

    model = RandomForestClassifier(
        n_estimators=n_estimators,
        random_state=random_state,
        class_weight="balanced",
    )

    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)

    class_names = list(label_encoder.classes_)
    encoded_class_labels = list(range(len(class_names)))

    metrics: dict[str, Any] = {
        "model_type": "RandomForestClassifier",
        "dataset_path": str(dataset_path),
        "row_count": len(rows),
        "train_row_count": len(x_train),
        "test_row_count": len(x_test),
        "feature_columns": FEATURE_COLUMNS,
        "labels": class_names,
        "label_distribution": dict(sorted(label_counts.items())),
        "accuracy": accuracy_score(y_test, y_pred),
        "classification_report": classification_report(
            y_test,
            y_pred,
            labels=encoded_class_labels,
            target_names=class_names,
            zero_division=0,
            output_dict=True,
        ),
        "confusion_matrix": confusion_matrix(
            y_test,
            y_pred,
            labels=encoded_class_labels,
        ).tolist(),
        "random_state": random_state,
        "n_estimators": n_estimators,
    }

    model_output_path.parent.mkdir(parents=True, exist_ok=True)
    label_encoder_output_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_output_path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, model_output_path)
    joblib.dump(label_encoder, label_encoder_output_path)

    with metrics_output_path.open("w", encoding="utf-8") as file:
        json.dump(to_jsonable(metrics), file, indent=2, sort_keys=True)

    return metrics


def print_training_summary(
    metrics: dict[str, Any],
    model_output_path: Path,
    label_encoder_output_path: Path,
    metrics_output_path: Path,
) -> None:
    print("MiniRTOS-Linux ML Training")
    print("==========================")
    print()
    print(f"Model: {model_output_path}")
    print(f"Label encoder: {label_encoder_output_path}")
    print(f"Metrics: {metrics_output_path}")
    print(f"Model type: {metrics['model_type']}")
    print(f"Rows: {metrics['row_count']}")
    print(f"Train rows: {metrics['train_row_count']}")
    print(f"Test rows: {metrics['test_row_count']}")
    print(f"Accuracy: {metrics['accuracy']:.3f}")
    print()
    print("Labels:")

    for label, count in metrics["label_distribution"].items():
        print(f"  {label}: {count}")

    print()
    print("Feature columns:")

    for column in metrics["feature_columns"]:
        print(f"  - {column}")


def main() -> int:
    args = parse_args()

    try:
        metrics = train_model(
            dataset_path=Path(args.dataset),
            model_output_path=Path(args.model_output),
            label_encoder_output_path=Path(args.label_encoder_output),
            metrics_output_path=Path(args.metrics_output),
            test_size=args.test_size,
            n_estimators=args.n_estimators,
            random_state=args.random_state,
        )

        print_training_summary(
            metrics=metrics,
            model_output_path=Path(args.model_output),
            label_encoder_output_path=Path(args.label_encoder_output),
            metrics_output_path=Path(args.metrics_output),
        )
    except (FileNotFoundError, ValueError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
