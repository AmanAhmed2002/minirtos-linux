from __future__ import annotations

import sys
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

from anomaly_detector import (
    analyze_anomaly_windows,
    classify_score,
    extract_features,
    split_events_into_windows,
)


def test_split_events_into_expected_windows() -> None:
    events = [
        {"timestamp_ms": 0, "event_type": "runtime_started"},
        {"timestamp_ms": 4999, "event_type": "task_completed"},
        {"timestamp_ms": 5000, "event_type": "task_completed"},
        {"timestamp_ms": 9999, "event_type": "task_completed"},
        {"timestamp_ms": 10000, "event_type": "runtime_finished"},
    ]

    windows = split_events_into_windows(events, 5000)

    assert len(windows) == 3

    assert windows[0][0] == 0
    assert windows[0][1] == 4999
    assert len(windows[0][2]) == 2

    assert windows[1][0] == 5000
    assert windows[1][1] == 9999
    assert len(windows[1][2]) == 2

    assert windows[2][0] == 10000
    assert windows[2][1] == 14999
    assert len(windows[2][2]) == 1


def test_split_events_rejects_invalid_window_size() -> None:
    with pytest.raises(ValueError) as exc_info:
        split_events_into_windows([], 0)

    assert "window_ms must be greater than 0" in str(exc_info.value)


def test_extract_features_counts_runtime_signals() -> None:
    events = [
        {
            "timestamp_ms": 100,
            "event_type": "task_completed",
            "severity": "warning",
            "task": "ControlTask",
            "observed_duration_ms": 130,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 110,
            "event_type": "message_sent",
            "severity": "info",
        },
        {
            "timestamp_ms": 120,
            "event_type": "message_received",
            "severity": "info",
        },
        {
            "timestamp_ms": 130,
            "event_type": "message_dropped",
            "severity": "warning",
            "reason": "queue_full",
        },
        {
            "timestamp_ms": 140,
            "event_type": "message_dropped",
            "severity": "warning",
            "reason": "fault_injected_drop",
        },
        {
            "timestamp_ms": 150,
            "event_type": "fault_injected",
            "severity": "warning",
            "fault_type": "slow_task",
        },
        {
            "timestamp_ms": 160,
            "event_type": "watchdog_timeout",
            "severity": "error",
            "task": "ControlTask",
        },
        {
            "timestamp_ms": 170,
            "event_type": "task_recovered",
            "severity": "warning",
            "task": "ControlTask",
        },
    ]

    features = extract_features(events)

    assert features["task_completed_count"] == 1
    assert features["deadline_missed_count"] == 1
    assert features["avg_task_duration_ms"] == 130
    assert features["max_task_duration_ms"] == 130
    assert features["message_sent_count"] == 1
    assert features["message_received_count"] == 1
    assert features["message_dropped_count"] == 2
    assert features["queue_full_drop_count"] == 1
    assert features["fault_injected_drop_count"] == 1
    assert features["fault_injected_count"] == 1
    assert features["watchdog_timeout_count"] == 1
    assert features["task_recovered_count"] == 1
    assert features["error_event_count"] == 1
    assert features["warning_event_count"] == 5


def test_classify_score_marks_clean_window_normal() -> None:
    features = {
        "watchdog_timeout_count": 0,
        "task_recovered_count": 0,
        "deadline_missed_count": 0,
    }

    assert classify_score(0.0, features) == "NORMAL"


def test_classify_score_marks_watchdog_window_unstable() -> None:
    features = {
        "watchdog_timeout_count": 1,
        "task_recovered_count": 0,
        "deadline_missed_count": 0,
    }

    assert classify_score(0.1, features) == "UNSTABLE"


def test_classify_score_marks_three_deadline_misses_unstable() -> None:
    features = {
        "watchdog_timeout_count": 0,
        "task_recovered_count": 0,
        "deadline_missed_count": 3,
    }

    assert classify_score(0.2, features) == "UNSTABLE"


def test_analyze_anomaly_windows_detects_unstable_window() -> None:
    events = [
        {
            "timestamp_ms": 0,
            "event_type": "task_completed",
            "severity": "info",
            "observed_duration_ms": 10,
            "deadline_missed": False,
        },
        {
            "timestamp_ms": 5000,
            "event_type": "task_completed",
            "severity": "warning",
            "observed_duration_ms": 130,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 5100,
            "event_type": "task_completed",
            "severity": "warning",
            "observed_duration_ms": 130,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 5200,
            "event_type": "task_completed",
            "severity": "warning",
            "observed_duration_ms": 130,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 5300,
            "event_type": "watchdog_timeout",
            "severity": "error",
            "task": "ControlTask",
        },
    ]

    report = analyze_anomaly_windows(events, 5000)

    assert report["window_ms"] == 5000
    assert report["overall_classification"] == "UNSTABLE"
    assert report["total_window_count"] == 2
    assert report["anomaly_window_count"] >= 1
    assert report["highest_score"] > 0
    assert "watchdog_timeout_count" in report["top_overall_drivers"]
def test_analyze_anomaly_windows_detects_cpu_spike_timing_pressure() -> None:
    events = [
        {
            "timestamp_ms": 0,
            "event_type": "task_completed",
            "severity": "info",
            "observed_duration_ms": 20,
            "deadline_missed": False,
        },
        {
            "timestamp_ms": 5000,
            "event_type": "fault_injected",
            "severity": "warning",
            "fault_type": "cpu_spike",
            "target_task": "NetworkTask",
            "extra_execution_time_ms": 220,
        },
        {
            "timestamp_ms": 5100,
            "event_type": "task_completed",
            "severity": "warning",
            "task": "NetworkTask",
            "observed_duration_ms": 240,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 5350,
            "event_type": "task_completed",
            "severity": "warning",
            "task": "NetworkTask",
            "observed_duration_ms": 240,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 5600,
            "event_type": "task_completed",
            "severity": "warning",
            "task": "NetworkTask",
            "observed_duration_ms": 240,
            "deadline_missed": True,
        },
    ]

    report = analyze_anomaly_windows(events, 5000)

    assert report["overall_classification"] == "UNSTABLE"
    assert report["anomaly_window_count"] >= 1
    assert report["highest_score"] > 0
    assert "deadline_missed_count" in report["top_overall_drivers"]
