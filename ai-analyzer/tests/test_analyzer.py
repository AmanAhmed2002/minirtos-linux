from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parents[1] / "app"
sys.path.insert(0, str(APP_DIR))

from analyze import analyze, load_events


def write_jsonl(path: Path, events: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as file:
        for event in events:
            file.write(json.dumps(event) + "\n")


def test_load_events_reads_valid_jsonl(tmp_path: Path) -> None:
    log_path = tmp_path / "runtime_logs.jsonl"

    events = [
        {
            "timestamp_ms": 0,
            "event_type": "runtime_started",
            "severity": "info",
            "simulation_name": "normal",
            "scheduler_mode": "round_robin",
            "duration_seconds": 30,
        },
        {
            "timestamp_ms": 10,
            "event_type": "task_completed",
            "severity": "info",
            "task": "ControlTask",
            "observed_duration_ms": 10,
            "run_count": 1,
            "deadline_miss_count": 0,
            "deadline_missed": False,
        },
    ]

    write_jsonl(log_path, events)

    loaded_events = load_events(log_path)

    assert loaded_events == events


def test_load_events_raises_for_missing_file(tmp_path: Path) -> None:
    missing_path = tmp_path / "missing.jsonl"

    with pytest.raises(FileNotFoundError) as exc_info:
        load_events(missing_path)

    assert "Log file not found" in str(exc_info.value)


def test_load_events_raises_for_invalid_jsonl(tmp_path: Path) -> None:
    log_path = tmp_path / "bad.jsonl"
    log_path.write_text('{"event_type":"runtime_started"}\nnot-json\n', encoding="utf-8")

    with pytest.raises(ValueError) as exc_info:
        load_events(log_path)

    assert "Invalid JSONL" in str(exc_info.value)
    assert ":2:" in str(exc_info.value)


def test_analyze_classifies_clean_run_as_normal() -> None:
    events = [
        {
            "timestamp_ms": 0,
            "event_type": "runtime_started",
            "severity": "info",
            "simulation_name": "normal",
            "scheduler_mode": "round_robin",
            "duration_seconds": 30,
        },
        {
            "timestamp_ms": 10,
            "event_type": "task_completed",
            "severity": "info",
            "task": "ControlTask",
            "observed_duration_ms": 10,
            "run_count": 1,
            "deadline_miss_count": 0,
            "deadline_missed": False,
        },
        {
            "timestamp_ms": 30,
            "event_type": "runtime_summary",
            "severity": "info",
            "task": "ControlTask",
            "run_count": 1,
            "deadline_miss_count": 0,
        },
    ]

    report = analyze(events)

    assert report["status"] == "NORMAL"
    assert report["event_counts"]["task_completed"] == 1
    assert report["task_metrics"]["ControlTask"]["runs"] == 1
    assert report["task_metrics"]["ControlTask"]["deadline_misses"] == 0


def test_analyze_classifies_watchdog_timeout_as_unstable() -> None:
    events = [
        {
            "timestamp_ms": 0,
            "event_type": "runtime_started",
            "severity": "info",
            "simulation_name": "watchdog_slow_task",
            "scheduler_mode": "round_robin",
            "duration_seconds": 30,
        },
        {
            "timestamp_ms": 5000,
            "event_type": "task_completed",
            "severity": "warning",
            "task": "ControlTask",
            "observed_duration_ms": 130,
            "run_count": 1,
            "deadline_miss_count": 1,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 5200,
            "event_type": "watchdog_timeout",
            "severity": "error",
            "task": "ControlTask",
            "deadline_miss_count": 3,
            "consecutive_miss_count": 3,
            "reason": "consecutive_deadline_misses",
        },
        {
            "timestamp_ms": 5250,
            "event_type": "task_recovered",
            "severity": "warning",
            "task": "ControlTask",
            "recovery_action": "simulated_task_reset",
        },
    ]

    report = analyze(events)

    assert report["status"] == "UNSTABLE"
    assert report["event_counts"]["watchdog_timeout"] == 1
    assert report["event_counts"]["task_recovered"] == 1
    assert report["watchdog_tasks"]["ControlTask"] == 1
    assert report["recovered_tasks"]["ControlTask"] == 1


def test_analyze_counts_message_drop_reasons() -> None:
    events = [
        {
            "timestamp_ms": 0,
            "event_type": "message_dropped",
            "severity": "warning",
            "source_task": "ControlTask",
            "target_task": "LoggerTask",
            "message_type": "control_status",
            "sequence_id": 1,
            "reason": "queue_full",
        },
        {
            "timestamp_ms": 10,
            "event_type": "message_dropped",
            "severity": "warning",
            "source_task": "NetworkTask",
            "target_task": "LoggerTask",
            "message_type": "network_packet",
            "sequence_id": 2,
            "reason": "fault_injected_drop",
        },
    ]

    report = analyze(events)

    assert report["status"] == "WARNING"
    assert report["event_counts"]["message_dropped"] == 2
    assert report["drop_reason_counts"]["queue_full"] == 1
    assert report["drop_reason_counts"]["fault_injected_drop"] == 1


def test_analyze_reports_cpu_spike_fault_as_unstable_when_deadlines_missed() -> None:
    events = [
        {
            "timestamp_ms": 0,
            "event_type": "runtime_started",
            "severity": "info",
            "simulation_name": "cpu_spike",
            "scheduler_mode": "round_robin",
            "duration_seconds": 30,
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
            "timestamp_ms": 5010,
            "event_type": "task_completed",
            "severity": "warning",
            "task": "NetworkTask",
            "observed_duration_ms": 240,
            "run_count": 1,
            "deadline_miss_count": 1,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 5260,
            "event_type": "task_completed",
            "severity": "warning",
            "task": "NetworkTask",
            "observed_duration_ms": 240,
            "run_count": 2,
            "deadline_miss_count": 2,
            "deadline_missed": True,
        },
        {
            "timestamp_ms": 5520,
            "event_type": "task_completed",
            "severity": "warning",
            "task": "NetworkTask",
            "observed_duration_ms": 240,
            "run_count": 3,
            "deadline_miss_count": 3,
            "deadline_missed": True,
        },
    ]

    report = analyze(events)

    assert report["status"] == "UNSTABLE"
    assert report["fault_counts"]["cpu_spike"] == 1
    assert report["task_metrics"]["NetworkTask"]["deadline_misses"] == 3
    assert "CPU-spike fault injection was active." in report["root_causes"]
