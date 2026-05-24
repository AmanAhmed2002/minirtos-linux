#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


Event = dict[str, Any]


FEATURE_NAMES = [
    "task_completed_count",
    "deadline_missed_count",
    "avg_task_duration_ms",
    "max_task_duration_ms",
    "message_sent_count",
    "message_received_count",
    "message_dropped_count",
    "queue_full_drop_count",
    "fault_injected_drop_count",
    "fault_injected_count",
    "watchdog_timeout_count",
    "task_recovered_count",
    "error_event_count",
    "warning_event_count",
]


@dataclass
class WindowAnalysis:
    start_ms: int
    end_ms: int
    features: dict[str, float]
    score: float
    classification: str
    top_drivers: list[str] = field(default_factory=list)


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


def empty_features() -> dict[str, float]:
    return {name: 0.0 for name in FEATURE_NAMES}


def event_timestamp_ms(event: Event) -> int:
    return max(0, as_int(event.get("timestamp_ms")))


def split_events_into_windows(
    events: list[Event],
    window_ms: int,
) -> list[tuple[int, int, list[Event]]]:
    if window_ms <= 0:
        raise ValueError("window_ms must be greater than 0.")

    timestamps = [
        event_timestamp_ms(event)
        for event in events
        if "timestamp_ms" in event
    ]

    if not timestamps:
        return [(0, window_ms, events)]

    max_timestamp_ms = max(timestamps)
    window_count = (max_timestamp_ms // window_ms) + 1

    windows: list[list[Event]] = [[] for _ in range(window_count)]

    for event in events:
        timestamp_ms = event_timestamp_ms(event)
        window_index = min(timestamp_ms // window_ms, window_count - 1)
        windows[window_index].append(event)

    return [
        (index * window_ms, (index + 1) * window_ms - 1, window_events)
        for index, window_events in enumerate(windows)
    ]


def extract_features(window_events: list[Event]) -> dict[str, float]:
    features = empty_features()
    task_durations: list[int] = []

    for event in window_events:
        event_type = str(event.get("event_type", "unknown"))
        severity = str(event.get("severity", "unknown"))

        if severity == "error":
            features["error_event_count"] += 1

        if severity == "warning":
            features["warning_event_count"] += 1

        if event_type == "task_completed":
            features["task_completed_count"] += 1

            observed_duration_ms = as_int(event.get("observed_duration_ms"))
            task_durations.append(observed_duration_ms)

            if event.get("deadline_missed") is True:
                features["deadline_missed_count"] += 1

        elif event_type == "message_sent":
            features["message_sent_count"] += 1

        elif event_type == "message_received":
            features["message_received_count"] += 1

        elif event_type == "message_dropped":
            features["message_dropped_count"] += 1

            reason = str(event.get("reason", "unknown"))

            if reason == "queue_full":
                features["queue_full_drop_count"] += 1
            elif reason == "fault_injected_drop":
                features["fault_injected_drop_count"] += 1

        elif event_type == "fault_injected":
            features["fault_injected_count"] += 1

        elif event_type == "watchdog_timeout":
            features["watchdog_timeout_count"] += 1

        elif event_type == "task_recovered":
            features["task_recovered_count"] += 1

    if task_durations:
        features["avg_task_duration_ms"] = (
            sum(task_durations) / len(task_durations)
        )
        features["max_task_duration_ms"] = max(task_durations)

    return features


def score_features(features: dict[str, float]) -> tuple[float, list[str]]:
    weighted_rules = [
        ("watchdog_timeout_count", 0.35, 1.0),
        ("task_recovered_count", 0.25, 1.0),
        ("deadline_missed_count", 0.25, 3.0),
        ("fault_injected_count", 0.20, 10.0),
        ("fault_injected_drop_count", 0.18, 5.0),
        ("message_dropped_count", 0.15, 25.0),
        ("queue_full_drop_count", 0.12, 25.0),
        ("error_event_count", 0.25, 1.0),
        ("warning_event_count", 0.08, 25.0),
        ("max_task_duration_ms", 0.18, 100.0),
        ("avg_task_duration_ms", 0.10, 60.0),
    ]

    contributions: list[tuple[str, float]] = []

    for feature_name, weight, saturation_value in weighted_rules:
        value = features.get(feature_name, 0.0)

        if value <= 0:
            continue

        normalized_value = min(value / saturation_value, 1.0)
        contribution = weight * normalized_value

        if contribution > 0:
            contributions.append((feature_name, contribution))

    raw_score = sum(contribution for _, contribution in contributions)
    score = min(raw_score, 1.0)

    top_drivers = [
        feature_name
        for feature_name, _ in sorted(
            contributions,
            key=lambda item: item[1],
            reverse=True,
        )[:4]
    ]

    return score, top_drivers


def classify_score(score: float, features: dict[str, float]) -> str:
    if features.get("watchdog_timeout_count", 0) > 0:
        return "UNSTABLE"

    if features.get("task_recovered_count", 0) > 0:
        return "UNSTABLE"

    if features.get("deadline_missed_count", 0) >= 3:
        return "UNSTABLE"

    if score >= 0.70:
        return "UNSTABLE"

    if score >= 0.25:
        return "WARNING"

    return "NORMAL"


def analyze_anomaly_windows(
    events: list[Event],
    window_ms: int = 5000,
) -> dict[str, Any]:
    window_results: list[WindowAnalysis] = []

    for start_ms, end_ms, window_events in split_events_into_windows(
        events,
        window_ms,
    ):
        features = extract_features(window_events)
        score, top_drivers = score_features(features)
        classification = classify_score(score, features)

        window_results.append(
            WindowAnalysis(
                start_ms=start_ms,
                end_ms=end_ms,
                features=features,
                score=score,
                classification=classification,
                top_drivers=top_drivers,
            )
        )

    classifications = [window.classification for window in window_results]

    if "UNSTABLE" in classifications:
        overall_classification = "UNSTABLE"
    elif "WARNING" in classifications:
        overall_classification = "WARNING"
    else:
        overall_classification = "NORMAL"

    anomaly_windows = [
        window
        for window in window_results
        if window.classification != "NORMAL"
    ]

    highest_score = max(
        (window.score for window in window_results),
        default=0.0,
    )

    driver_counts: dict[str, int] = {}

    for window in anomaly_windows:
        for driver in window.top_drivers:
            driver_counts[driver] = driver_counts.get(driver, 0) + 1

    top_overall_drivers = [
        driver
        for driver, _ in sorted(
            driver_counts.items(),
            key=lambda item: (-item[1], item[0]),
        )[:5]
    ]

    return {
        "window_ms": window_ms,
        "overall_classification": overall_classification,
        "anomaly_window_count": len(anomaly_windows),
        "total_window_count": len(window_results),
        "highest_score": highest_score,
        "top_overall_drivers": top_overall_drivers,
        "windows": window_results,
    }


def print_anomaly_report(report: dict[str, Any]) -> None:
    print()
    print("AI Anomaly Detection Summary")
    print("============================")
    print()
    print(f"Window size: {report['window_ms']} ms")
    print(f"Overall classification: {report['overall_classification']}")
    print(
        "Anomaly windows: "
        f"{report['anomaly_window_count']} / {report['total_window_count']}"
    )
    print(f"Highest anomaly score: {report['highest_score']:.2f}")
    print()

    print("Top anomaly drivers:")

    if report["top_overall_drivers"]:
        for driver in report["top_overall_drivers"]:
            print(f"  - {driver}")
    else:
        print("  - none")

    print()
    print("Window summary:")

    for window in report["windows"]:
        driver_text = ", ".join(window.top_drivers)

        if not driver_text:
            driver_text = "none"

        print(
            f"  {window.start_ms}-{window.end_ms} ms: "
            f"{window.classification} "
            f"score={window.score:.2f} "
            f"drivers={driver_text}"
        )
