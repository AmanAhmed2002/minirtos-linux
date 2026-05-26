from __future__ import annotations

import csv
import sys
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1] / "ml"
sys.path.insert(0, str(ML_DIR))

from predict_model import predict_dataset, predict_windows_from_events  # noqa: E402
from train_model import FEATURE_COLUMNS, train_model  # noqa: E402


def write_training_dataset(path: Path) -> None:
    fieldnames = [
        "scenario_name",
        "label",
        "scheduler_mode",
        "window_start_ms",
        "window_end_ms",
        *FEATURE_COLUMNS,
    ]

    rows = []

    for index in range(4):
        rows.append(
            {
                "scenario_name": "normal",
                "label": "NORMAL",
                "scheduler_mode": "round_robin",
                "window_start_ms": index * 5000,
                "window_end_ms": (index + 1) * 5000 - 1,
                "event_count": 10,
                "task_completed_count": 5,
                "deadline_missed_count": 0,
                "avg_task_duration_ms": 10,
                "max_task_duration_ms": 20,
                "message_sent_count": 2,
                "message_received_count": 2,
                "message_dropped_count": 0,
                "queue_full_drop_count": 0,
                "fault_injected_drop_count": 0,
                "fault_injected_count": 0,
                "task_failed_count": 0,
                "task_skipped_count": 0,
                "watchdog_timeout_count": 0,
                "task_recovered_count": 0,
                "error_event_count": 0,
                "warning_event_count": 0,
            }
        )

        rows.append(
            {
                "scenario_name": "queue_overflow",
                "label": "QUEUE_PRESSURE",
                "scheduler_mode": "round_robin",
                "window_start_ms": index * 5000,
                "window_end_ms": (index + 1) * 5000 - 1,
                "event_count": 80,
                "task_completed_count": 20,
                "deadline_missed_count": 0,
                "avg_task_duration_ms": 8,
                "max_task_duration_ms": 15,
                "message_sent_count": 5,
                "message_received_count": 5,
                "message_dropped_count": 50,
                "queue_full_drop_count": 50,
                "fault_injected_drop_count": 0,
                "fault_injected_count": 0,
                "task_failed_count": 0,
                "task_skipped_count": 0,
                "watchdog_timeout_count": 0,
                "task_recovered_count": 0,
                "error_event_count": 0,
                "warning_event_count": 50,
            }
        )

        rows.append(
            {
                "scenario_name": "task_crash",
                "label": "TASK_CRASH",
                "scheduler_mode": "round_robin",
                "window_start_ms": index * 5000,
                "window_end_ms": (index + 1) * 5000 - 1,
                "event_count": 30,
                "task_completed_count": 5,
                "deadline_missed_count": 0,
                "avg_task_duration_ms": 15,
                "max_task_duration_ms": 20,
                "message_sent_count": 2,
                "message_received_count": 2,
                "message_dropped_count": 0,
                "queue_full_drop_count": 0,
                "fault_injected_drop_count": 0,
                "fault_injected_count": 1,
                "task_failed_count": 1,
                "task_skipped_count": 5,
                "watchdog_timeout_count": 0,
                "task_recovered_count": 0,
                "error_event_count": 2,
                "warning_event_count": 5,
            }
        )

    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def test_train_model_writes_artifacts_and_metrics(tmp_path: Path) -> None:
    dataset_path = tmp_path / "synthetic_dataset.csv"
    model_path = tmp_path / "anomaly_classifier.joblib"
    label_encoder_path = tmp_path / "label_encoder.joblib"
    metrics_path = tmp_path / "model_metrics.json"

    write_training_dataset(dataset_path)

    metrics = train_model(
        dataset_path=dataset_path,
        model_output_path=model_path,
        label_encoder_output_path=label_encoder_path,
        metrics_output_path=metrics_path,
        test_size=0.30,
        n_estimators=10,
        random_state=42,
    )

    assert model_path.exists()
    assert label_encoder_path.exists()
    assert metrics_path.exists()
    assert metrics["row_count"] == 12
    assert "NORMAL" in metrics["labels"]
    assert "QUEUE_PRESSURE" in metrics["labels"]
    assert "TASK_CRASH" in metrics["labels"]


def test_predict_dataset_returns_labels_and_confidence(tmp_path: Path) -> None:
    dataset_path = tmp_path / "synthetic_dataset.csv"
    model_path = tmp_path / "anomaly_classifier.joblib"
    label_encoder_path = tmp_path / "label_encoder.joblib"
    metrics_path = tmp_path / "model_metrics.json"

    write_training_dataset(dataset_path)

    train_model(
        dataset_path=dataset_path,
        model_output_path=model_path,
        label_encoder_output_path=label_encoder_path,
        metrics_output_path=metrics_path,
        test_size=0.30,
        n_estimators=10,
        random_state=42,
    )

    predictions = predict_dataset(
        dataset_path=dataset_path,
        model_path=model_path,
        label_encoder_path=label_encoder_path,
    )

    assert len(predictions) == 12

    first_prediction = predictions[0]

    assert first_prediction["prediction"] in {
        "NORMAL",
        "QUEUE_PRESSURE",
        "TASK_CRASH",
    }
    assert 0.0 <= first_prediction["confidence"] <= 1.0
    assert first_prediction["probabilities"]


def test_predict_windows_from_events_returns_window_predictions(tmp_path: Path) -> None:
    dataset_path = tmp_path / "synthetic_dataset.csv"
    model_path = tmp_path / "anomaly_classifier.joblib"
    label_encoder_path = tmp_path / "label_encoder.joblib"
    metrics_path = tmp_path / "model_metrics.json"

    write_training_dataset(dataset_path)

    train_model(
        dataset_path=dataset_path,
        model_output_path=model_path,
        label_encoder_output_path=label_encoder_path,
        metrics_output_path=metrics_path,
        test_size=0.30,
        n_estimators=10,
        random_state=42,
    )

    events = [
        {
            "timestamp_ms": 5000,
            "event_type": "fault_injected",
            "severity": "error",
            "fault_type": "task_crash",
        },
        {
            "timestamp_ms": 5001,
            "event_type": "task_failed",
            "severity": "error",
            "task": "NetworkTask",
        },
        {
            "timestamp_ms": 5250,
            "event_type": "task_skipped",
            "severity": "warning",
            "task": "NetworkTask",
        },
        {
            "timestamp_ms": 5500,
            "event_type": "task_skipped",
            "severity": "warning",
            "task": "NetworkTask",
        },
        {
            "timestamp_ms": 5750,
            "event_type": "task_skipped",
            "severity": "warning",
            "task": "NetworkTask",
        },
    ]

    predictions = predict_windows_from_events(
        events=events,
        window_ms=5000,
        model_path=model_path,
        label_encoder_path=label_encoder_path,
    )

    assert predictions
    assert predictions[-1]["prediction"] in {
        "NORMAL",
        "QUEUE_PRESSURE",
        "TASK_CRASH",
    }
    assert 0.0 <= predictions[-1]["confidence"] <= 1.0
