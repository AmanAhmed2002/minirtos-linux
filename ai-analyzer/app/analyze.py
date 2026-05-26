#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from anomaly_detector import analyze_anomaly_windows, print_anomaly_report

Event = dict[str, Any]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze MiniRTOS-Linux JSONL runtime logs."
    )

    parser.add_argument(
        "--log",
        default="logs/runtime_logs.jsonl",
        help="Path to the JSONL runtime log file. Default: logs/runtime_logs.jsonl",
    )

    parser.add_argument(
        "--window-ms",
        type=int,
        default=5000,
        help="Anomaly detection window size in milliseconds. Default: 5000",
    )

    parser.add_argument(
        "--ml-model",
        default=None,
        help=(
            "Optional trained ML model artifact path. "
            "If omitted, ML prediction output is skipped."
        ),
    )

    parser.add_argument(
        "--ml-label-encoder",
        default="models/label_encoder.joblib",
        help=(
            "Optional label encoder artifact path used with --ml-model. "
            "Default: models/label_encoder.joblib"
        ),
    )

    return parser.parse_args()


def load_events(log_path: Path) -> list[Event]:
    if not log_path.exists():
        raise FileNotFoundError(
            f"Log file not found: {log_path}. "
            "Run ./scripts/run_normal.sh, ./scripts/run_fault.sh, or "
            "./scripts/run_watchdog.sh first."
        )

    events: list[Event] = []

    with log_path.open("r", encoding="utf-8") as file:
        for line_number, raw_line in enumerate(file, start=1):
            line = raw_line.strip()

            if not line:
                continue

            try:
                event = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Invalid JSONL at {log_path}:{line_number}: {exc.msg}"
                ) from exc

            if not isinstance(event, dict):
                raise ValueError(
                    f"Invalid JSONL at {log_path}:{line_number}: "
                    "each line must contain a JSON object."
                )

            events.append(event)

    return events


def as_int(value: Any, default: int = 0) -> int:
    if isinstance(value, bool):
        return int(value)

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(value)

    if isinstance(value, str):
        try:
            return int(value)
        except ValueError:
            return default

    return default


def format_float(value: float) -> str:
    return f"{value:.1f}"


def collect_task_metrics(events: list[Event]) -> dict[str, dict[str, Any]]:
    task_metrics: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "runs": 0,
            "deadline_misses": 0,
            "deadline_missed_events": 0,
            "durations": [],
            "max_duration_ms": 0,
            "avg_duration_ms": 0.0,
        }
    )

    for event in events:
        if event.get("event_type") == "task_completed":
            task_name = str(event.get("task", "unknown"))
            observed_duration_ms = as_int(event.get("observed_duration_ms"))
            run_count = as_int(event.get("run_count"))
            deadline_miss_count = as_int(event.get("deadline_miss_count"))

            metrics = task_metrics[task_name]
            metrics["runs"] = max(metrics["runs"], run_count)
            metrics["deadline_misses"] = max(
                metrics["deadline_misses"],
                deadline_miss_count,
            )
            metrics["durations"].append(observed_duration_ms)

            if event.get("deadline_missed") is True:
                metrics["deadline_missed_events"] += 1

        elif event.get("event_type") == "runtime_summary":
            task_name = str(event.get("task", "unknown"))
            metrics = task_metrics[task_name]
            metrics["runs"] = max(metrics["runs"], as_int(event.get("run_count")))
            metrics["deadline_misses"] = max(
                metrics["deadline_misses"],
                as_int(event.get("deadline_miss_count")),
            )

    for metrics in task_metrics.values():
        durations = metrics["durations"]

        if durations:
            metrics["max_duration_ms"] = max(durations)
            metrics["avg_duration_ms"] = sum(durations) / len(durations)

    return dict(task_metrics)


def classify_health(
    event_counts: Counter[str],
    task_metrics: dict[str, dict[str, Any]],
    fault_counts: Counter[str],
    drop_reason_counts: Counter[str],
) -> str:
    total_deadline_misses = sum(
        as_int(metrics.get("deadline_misses"))
        for metrics in task_metrics.values()
    )

    if event_counts["task_failed"] > 0:
        return "UNSTABLE"

    if event_counts["task_skipped"] > 0:
        return "UNSTABLE"

    if event_counts["watchdog_timeout"] > 0:
        return "UNSTABLE"

    if event_counts["task_recovered"] > 0:
        return "UNSTABLE"

    if total_deadline_misses >= 3:
        return "UNSTABLE"

    if fault_counts["slow_task"] > 0 and total_deadline_misses > 0:
        return "UNSTABLE"

    if event_counts["fault_injected"] > 0:
        return "WARNING"

    if total_deadline_misses > 0:
        return "WARNING"

    if drop_reason_counts:
        return "WARNING"

    return "NORMAL"


def collect_root_causes(
    status: str,
    task_metrics: dict[str, dict[str, Any]],
    fault_counts: Counter[str],
    drop_reason_counts: Counter[str],
    watchdog_tasks: Counter[str],
    recovered_tasks: Counter[str],
    failed_tasks: Counter[str],
    skipped_tasks: Counter[str],
) -> list[str]:
    causes: list[str] = []

    for task_name, metrics in sorted(task_metrics.items()):
        deadline_misses = as_int(metrics.get("deadline_misses"))

        if deadline_misses > 0:
            causes.append(
                f"{task_name} missed its deadline {deadline_misses} time(s)."
            )

    if fault_counts["slow_task"] > 0:
        causes.append("Slow-task fault injection was active.")

    if fault_counts["cpu_spike"] > 0:
        causes.append("CPU-spike fault injection was active.")

    if fault_counts["dropped_messages"] > 0:
        causes.append("Dropped-message fault injection was active.")

    if fault_counts["task_crash"] > 0:
        causes.append("Task-crash fault injection was active.")

    if drop_reason_counts["queue_full"] > 0:
        causes.append(
            "One or more task queues became full, causing queue_full message drops."
        )

    if drop_reason_counts["fault_injected_drop"] > 0:
        causes.append(
            "Fault injection intentionally dropped messages before enqueue."
        )

    for task_name, count in sorted(watchdog_tasks.items()):
        causes.append(
            f"Watchdog timeout triggered for {task_name} {count} time(s)."
        )

    for task_name, count in sorted(recovered_tasks.items()):
        causes.append(
            f"Simulated recovery ran for {task_name} {count} time(s)."
        )

    for task_name, count in sorted(failed_tasks.items()):
        causes.append(
            f"{task_name} failed due to simulated task crash {count} time(s)."
        )

    for task_name, count in sorted(skipped_tasks.items()):
        causes.append(
            f"{task_name} was skipped because it remained in a failed state {count} time(s)."
        )

    if not causes and status == "NORMAL":
        causes.append("No faults, deadline misses, watchdog events, or drops detected.")

    if not causes:
        causes.append("Runtime showed warning signals, but no single root cause dominated.")

    return causes


def analyze(events: list[Event]) -> dict[str, Any]:
    event_counts: Counter[str] = Counter(
        str(event.get("event_type", "unknown"))
        for event in events
    )

    severity_counts: Counter[str] = Counter(
        str(event.get("severity", "unknown"))
        for event in events
    )

    fault_counts: Counter[str] = Counter(
        str(event.get("fault_type", "unknown"))
        for event in events
        if event.get("event_type") == "fault_injected"
    )

    drop_reason_counts: Counter[str] = Counter(
        str(event.get("reason", "unknown"))
        for event in events
        if event.get("event_type") == "message_dropped"
    )

    watchdog_tasks: Counter[str] = Counter(
        str(event.get("task", "unknown"))
        for event in events
        if event.get("event_type") == "watchdog_timeout"
    )

    recovered_tasks: Counter[str] = Counter(
        str(event.get("task", "unknown"))
        for event in events
        if event.get("event_type") == "task_recovered"
    )

    failed_tasks: Counter[str] = Counter(
        str(event.get("task", "unknown"))
        for event in events
        if event.get("event_type") == "task_failed"
    )

    skipped_tasks: Counter[str] = Counter(
        str(event.get("task", "unknown"))
        for event in events
        if event.get("event_type") == "task_skipped"
    )

    task_metrics = collect_task_metrics(events)

    status = classify_health(
        event_counts=event_counts,
        task_metrics=task_metrics,
        fault_counts=fault_counts,
        drop_reason_counts=drop_reason_counts,
    )

    root_causes = collect_root_causes(
        status=status,
        task_metrics=task_metrics,
        fault_counts=fault_counts,
        drop_reason_counts=drop_reason_counts,
        watchdog_tasks=watchdog_tasks,
        recovered_tasks=recovered_tasks,
        failed_tasks=failed_tasks,
        skipped_tasks=skipped_tasks,
    )

    timestamps = [
        as_int(event.get("timestamp_ms"))
        for event in events
        if "timestamp_ms" in event
    ]

    configured_duration_seconds = None
    simulation_name = None
    scheduler_mode = None

    for event in events:
        if event.get("event_type") == "runtime_started":
            configured_duration_seconds = event.get("duration_seconds")
            simulation_name = event.get("simulation_name")
            scheduler_mode = event.get("scheduler_mode")
            break

    return {
        "event_counts": event_counts,
        "severity_counts": severity_counts,
        "fault_counts": fault_counts,
        "drop_reason_counts": drop_reason_counts,
        "watchdog_tasks": watchdog_tasks,
        "recovered_tasks": recovered_tasks,
        "failed_tasks": failed_tasks,
        "skipped_tasks": skipped_tasks,
        "task_metrics": task_metrics,
        "status": status,
        "root_causes": root_causes,
        "observed_duration_ms": max(timestamps) if timestamps else 0,
        "configured_duration_seconds": configured_duration_seconds,
        "simulation_name": simulation_name,
        "scheduler_mode": scheduler_mode,
    }


def print_counter(title: str, counter: Counter[str]) -> None:
    print(f"{title}:")

    if not counter:
        print("  none")
        return

    for key, count in sorted(counter.items()):
        print(f"  {key}: {count}")


def print_report(log_path: Path, events: list[Event], report: dict[str, Any]) -> None:
    print("MiniRTOS-Linux Runtime Health Analyzer")
    print("======================================")
    print()
    print(f"Log file: {log_path}")
    print(f"Events loaded: {len(events)}")
    print(f"Runtime status: {report['status']}")

    if report.get("simulation_name") is not None:
        print(f"Simulation: {report['simulation_name']}")

    if report.get("scheduler_mode") is not None:
        print(f"Scheduler mode: {report['scheduler_mode']}")

    if report.get("configured_duration_seconds") is not None:
        print(f"Configured duration: {report['configured_duration_seconds']} seconds")

    print(f"Observed log duration: {report['observed_duration_ms']} ms")
    print()

    print_counter("Event counts", report["event_counts"])
    print()
    print_counter("Severity counts", report["severity_counts"])
    print()

    print("Task summary:")

    if not report["task_metrics"]:
        print("  none")
    else:
        for task_name, metrics in sorted(report["task_metrics"].items()):
            print(f"  {task_name}:")
            print(f"    runs: {metrics['runs']}")
            print(f"    deadline_misses: {metrics['deadline_misses']}")
            print(
                "    deadline_missed_events: "
                f"{metrics['deadline_missed_events']}"
            )
            print(
                "    avg_duration_ms: "
                f"{format_float(metrics['avg_duration_ms'])}"
            )
            print(f"    max_duration_ms: {metrics['max_duration_ms']}")

    print()

    print("Message summary:")
    print(f"  sent: {report['event_counts']['message_sent']}")
    print(f"  received: {report['event_counts']['message_received']}")
    print(f"  dropped: {report['event_counts']['message_dropped']}")
    print(f"  queue_full_drops: {report['drop_reason_counts']['queue_full']}")
    print(
        "  fault_injected_drops: "
        f"{report['drop_reason_counts']['fault_injected_drop']}"
    )
    print()

    print_counter("Fault summary", report["fault_counts"])
    print()

    print("Watchdog summary:")
    print(f"  watchdog_timeouts: {report['event_counts']['watchdog_timeout']}")
    print(f"  task_recoveries: {report['event_counts']['task_recovered']}")

    if report["watchdog_tasks"]:
        print("  timeout_tasks:")
        for task_name, count in sorted(report["watchdog_tasks"].items()):
            print(f"    - {task_name}: {count}")

    if report["recovered_tasks"]:
        print("  recovered_tasks:")
        for task_name, count in sorted(report["recovered_tasks"].items()):
            print(f"    - {task_name}: {count}")

    print()
    print("Task failure summary:")
    print(f"  task_failures: {report['event_counts']['task_failed']}")
    print(f"  task_skips: {report['event_counts']['task_skipped']}")

    if report["failed_tasks"]:
        print("  failed_tasks:")
        for task_name, count in sorted(report["failed_tasks"].items()):
            print(f"    - {task_name}: {count}")

    if report["skipped_tasks"]:
        print("  skipped_tasks:")
        for task_name, count in sorted(report["skipped_tasks"].items()):
            print(f"    - {task_name}: {count}")

    print()
    print("Likely root causes:")

    for cause in report["root_causes"]:
        print(f"  - {cause}")


def print_ml_prediction_report(
    events: list[Event],
    window_ms: int,
    model_path: Path | None,
    label_encoder_path: Path,
) -> None:
    if model_path is None:
        return

    print()
    print("ML Anomaly Classifier")
    print("=====================")
    print()

    if not model_path.exists():
        print(f"Skipped: model artifact not found at {model_path}")
        return

    if not label_encoder_path.exists():
        print(f"Skipped: label encoder artifact not found at {label_encoder_path}")
        return

    ml_dir = Path(__file__).resolve().parents[1] / "ml"

    if str(ml_dir) not in sys.path:
        sys.path.insert(0, str(ml_dir))

    try:
        from predict_model import predict_windows_from_events  # noqa: WPS433
    except ModuleNotFoundError as exc:
        print(f"Skipped: could not import ML predictor: {exc}")
        return

    predictions = predict_windows_from_events(
        events=events,
        window_ms=window_ms,
        model_path=model_path,
        label_encoder_path=label_encoder_path,
    )

    if not predictions:
        print("No windows available for ML prediction.")
        return

    label_counts: Counter[str] = Counter(
        str(prediction["prediction"])
        for prediction in predictions
    )

    highest_confidence_prediction = max(
        predictions,
        key=lambda prediction: float(prediction.get("confidence", 0.0)),
    )

    print(f"Windows predicted: {len(predictions)}")
    print(
        "Highest-confidence prediction: "
        f"{highest_confidence_prediction['prediction']} "
        f"confidence={highest_confidence_prediction['confidence']:.3f}"
    )
    print()

    print("Prediction counts:")

    for label, count in sorted(label_counts.items()):
        print(f"  {label}: {count}")

    print()
    print("Window ML summary:")

    for prediction in predictions:
        features = prediction["features"]
        window_start_ms = features.get("window_start_ms", "unknown")
        window_end_ms = features.get("window_end_ms", "unknown")

        print(
            f"  {window_start_ms}-{window_end_ms} ms: "
            f"{prediction['prediction']} "
            f"confidence={prediction['confidence']:.3f}"
        )


def main() -> int:
    args = parse_args()
    log_path = Path(args.log)

    try:
        events = load_events(log_path)
        report = analyze(events)
        print_report(log_path, events, report)
        anomaly_report = analyze_anomaly_windows(events, args.window_ms)
        print_anomaly_report(anomaly_report)
        print_ml_prediction_report(
            events=events,
            window_ms=args.window_ms,
            model_path=Path(args.ml_model) if args.ml_model else None,
            label_encoder_path=Path(args.ml_label_encoder),
        )
    except (FileNotFoundError, ValueError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
