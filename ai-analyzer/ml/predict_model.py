#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from typing import Any

import joblib

REPO_ROOT = Path(__file__).resolve().parents[2]
APP_DIR = REPO_ROOT / "ai-analyzer" / "app"

sys.path.insert(0, str(APP_DIR))

from anomaly_detector import FEATURE_NAMES, extract_features, split_events_into_windows  # noqa: E402


FEATURE_COLUMNS = [
    "event_count",
    *FEATURE_NAMES,
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run predictions with a trained MiniRTOS-Linux anomaly classifier."
    )

    parser.add_argument(
        "--model",
        default="models/anomaly_classifier.joblib",
        help="Path to trained model artifact.",
    )

    parser.add_argument(
        "--label-encoder",
        default="models/label_encoder.joblib",
        help="Path to label encoder artifact.",
    )

    input_group = parser.add_mutually_exclusive_group(required=True)

    input_group.add_argument(
        "--dataset",
        help="Synthetic dataset CSV to predict.",
    )

    input_group.add_argument(
        "--log",
        help="Runtime JSONL log to predict using windowed features.",
    )

    parser.add_argument(
        "--window-ms",
        type=int,
        default=5000,
        help="Window size in milliseconds for --log prediction. Default: 5000.",
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Maximum predictions to print. Default: 20.",
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


def load_model_and_encoder(model_path: Path, label_encoder_path: Path) -> tuple[Any, Any]:
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model artifact not found: {model_path}. "
            "Train it first with ai-analyzer/ml/train_model.py."
        )

    if not label_encoder_path.exists():
        raise FileNotFoundError(
            f"Label encoder artifact not found: {label_encoder_path}. "
            "Train it first with ai-analyzer/ml/train_model.py."
        )

    model = joblib.load(model_path)
    label_encoder = joblib.load(label_encoder_path)

    return model, label_encoder


def row_to_features(row: dict[str, Any]) -> list[float]:
    return [safe_float(row.get(column)) for column in FEATURE_COLUMNS]


def build_probability_map(
    model: Any,
    label_encoder: Any,
    probability_row: list[float],
) -> dict[str, float]:
    class_indexes = [int(class_index) for class_index in model.classes_]
    class_labels = label_encoder.inverse_transform(class_indexes)

    return {
        str(label): float(probability)
        for label, probability in zip(class_labels, probability_row)
    }


def predict_feature_rows(
    feature_rows: list[dict[str, Any]],
    model_path: Path,
    label_encoder_path: Path,
) -> list[dict[str, Any]]:
    if not feature_rows:
        return []

    model, label_encoder = load_model_and_encoder(model_path, label_encoder_path)

    x_values = [row_to_features(row) for row in feature_rows]
    encoded_predictions = model.predict(x_values)
    predicted_labels = label_encoder.inverse_transform(encoded_predictions)

    probabilities = None

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(x_values)

    predictions: list[dict[str, Any]] = []

    for index, label in enumerate(predicted_labels):
        probability_map: dict[str, float] = {}
        confidence = 1.0

        if probabilities is not None:
            probability_map = build_probability_map(
                model=model,
                label_encoder=label_encoder,
                probability_row=list(probabilities[index]),
            )
            confidence = max(probability_map.values(), default=0.0)

        predictions.append(
            {
                "index": index,
                "prediction": str(label),
                "confidence": float(confidence),
                "probabilities": probability_map,
                "features": feature_rows[index],
            }
        )

    return predictions


def load_dataset_rows(dataset_path: Path) -> list[dict[str, Any]]:
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset not found: {dataset_path}")

    with dataset_path.open("r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        return [dict(row) for row in reader]


def predict_dataset(
    dataset_path: Path,
    model_path: Path,
    label_encoder_path: Path,
) -> list[dict[str, Any]]:
    rows = load_dataset_rows(dataset_path)
    return predict_feature_rows(
        feature_rows=rows,
        model_path=model_path,
        label_encoder_path=label_encoder_path,
    )


def load_log_events(log_path: Path) -> list[dict[str, Any]]:
    sys.path.insert(0, str(APP_DIR))

    from analyze import load_events  # noqa: WPS433

    return load_events(log_path)


def build_feature_rows_from_events(
    events: list[dict[str, Any]],
    window_ms: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for window_start_ms, window_end_ms, window_events in split_events_into_windows(
        events,
        window_ms,
    ):
        features = extract_features(window_events)

        row: dict[str, Any] = {
            "window_start_ms": window_start_ms,
            "window_end_ms": window_end_ms,
            "event_count": len(window_events),
        }

        for feature_name in FEATURE_NAMES:
            row[feature_name] = features.get(feature_name, 0.0)

        rows.append(row)

    return rows


def predict_windows_from_events(
    events: list[dict[str, Any]],
    window_ms: int,
    model_path: Path,
    label_encoder_path: Path,
) -> list[dict[str, Any]]:
    feature_rows = build_feature_rows_from_events(events, window_ms)

    return predict_feature_rows(
        feature_rows=feature_rows,
        model_path=model_path,
        label_encoder_path=label_encoder_path,
    )


def print_predictions(predictions: list[dict[str, Any]], limit: int) -> None:
    print("MiniRTOS-Linux ML Predictions")
    print("=============================")
    print()
    print(f"Predictions: {len(predictions)}")
    print()

    for prediction in predictions[:limit]:
        features = prediction["features"]

        window_text = ""

        if "window_start_ms" in features and "window_end_ms" in features:
            window_text = (
                f" window={features['window_start_ms']}-"
                f"{features['window_end_ms']}ms"
            )

        print(
            f"[{prediction['index']}]"
            f"{window_text}"
            f" prediction={prediction['prediction']}"
            f" confidence={prediction['confidence']:.3f}"
        )

        probabilities = prediction.get("probabilities", {})

        if probabilities:
            for label, probability in sorted(
                probabilities.items(),
                key=lambda item: item[1],
                reverse=True,
            ):
                print(f"    {label}: {probability:.3f}")

    if len(predictions) > limit:
        print()
        print(f"... {len(predictions) - limit} additional prediction(s) omitted")


def main() -> int:
    args = parse_args()

    try:
        model_path = Path(args.model)
        label_encoder_path = Path(args.label_encoder)

        if args.dataset:
            predictions = predict_dataset(
                dataset_path=Path(args.dataset),
                model_path=model_path,
                label_encoder_path=label_encoder_path,
            )
        else:
            events = load_log_events(Path(args.log))
            predictions = predict_windows_from_events(
                events=events,
                window_ms=args.window_ms,
                model_path=model_path,
                label_encoder_path=label_encoder_path,
            )

        print_predictions(predictions, args.limit)
    except (FileNotFoundError, ValueError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
