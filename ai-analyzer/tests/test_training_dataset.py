from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import pytest

TRAINING_DIR = Path(__file__).resolve().parents[1] / "training"
sys.path.insert(0, str(TRAINING_DIR))

from generate_dataset import (  # noqa: E402
    OUTPUT_COLUMNS,
    ScenarioInput,
    generate_dataset,
    infer_label,
    parse_scenario_argument,
)


def write_jsonl(path: Path, events: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as file:
        for event in events:
            file.write(json.dumps(event) + "\n")


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def test_infer_label_for_known_scenarios() -> None:
    assert infer_label("normal") == "NORMAL"
    assert infer_label("queue_overflow") == "QUEUE_PRESSURE"
    assert infer_label("cpu_spike") == "CPU_SPIKE"
    assert infer_label("task_crash") == "TASK_CRASH"
    assert infer_label("slow_task") == "SLOW_TASK"
    assert infer_label("dropped_messages") == "DROPPED_MESSAGES"
    assert infer_label("watchdog") == "WATCHDOG_RECOVERY"


def test_infer_label_rejects_unknown_scenario() -> None:
    with pytest.raises(ValueError) as exc_info:
        infer_label("unknown_scenario")

    assert "Unknown scenario label" in str(exc_info.value)


def test_parse_scenario_argument() -> None:
    scenario = parse_scenario_argument("normal=logs/normal_runtime_logs.jsonl")

    assert scenario.name == "normal"
    assert scenario.log_path == Path("logs/normal_runtime_logs.jsonl")
    assert scenario.label == "NORMAL"


def test_parse_scenario_argument_rejects_invalid_format() -> None:
    with pytest.raises(ValueError) as exc_info:
        parse_scenario_argument("normal")

    assert "Expected NAME=PATH" in str(exc_info.value)


def test_generate_dataset_writes_expected_columns_and_rows(tmp_path: Path) -> None:
    log_path = tmp_path / "task_crash_runtime_logs.jsonl"
    output_path = tmp_path / "synthetic_dataset.csv"

    events = [
        {
            "timestamp_ms": 0,
            "event_type": "runtime_started",
            "severity": "info",
            "simulation_name": "task_crash",
            "scheduler_mode": "round_robin",
            "duration_seconds": 30,
        },
        {
            "timestamp_ms": 5000,
            "event_type": "fault_injected",
            "severity": "error",
            "fault_type": "task_crash",
            "target_task": "NetworkTask",
            "reason": "simulated_task_crash",
        },
        {
            "timestamp_ms": 5001,
            "event_type": "task_failed",
            "severity": "error",
            "fault_type": "task_crash",
            "task": "NetworkTask",
            "reason": "simulated_task_crash",
        },
        {
            "timestamp_ms": 5250,
            "event_type": "task_skipped",
            "severity": "warning",
            "fault_type": "task_crash",
            "task": "NetworkTask",
            "reason": "task_in_failed_state",
        },
    ]

    write_jsonl(log_path, events)

    row_count = generate_dataset(
        scenarios=[
            ScenarioInput(
                name="task_crash",
                log_path=log_path,
                label="TASK_CRASH",
            )
        ],
        output_path=output_path,
        window_ms=5000,
        skip_missing=False,
    )

    rows = read_csv_rows(output_path)

    assert row_count == 2
    assert output_path.exists()
    assert rows
    assert list(rows[0].keys()) == OUTPUT_COLUMNS

    crash_rows = [
        row for row in rows
        if row["label"] == "TASK_CRASH"
        and row["window_start_ms"] == "5000"
    ]

    assert len(crash_rows) == 1
    assert crash_rows[0]["scenario_name"] == "task_crash"
    assert crash_rows[0]["scheduler_mode"] == "round_robin"
    assert float(crash_rows[0]["fault_injected_count"]) == 1.0
    assert float(crash_rows[0]["task_failed_count"]) == 1.0
    assert float(crash_rows[0]["task_skipped_count"]) == 1.0


def test_generate_dataset_fails_for_missing_log_when_not_skipping(
    tmp_path: Path,
) -> None:
    output_path = tmp_path / "synthetic_dataset.csv"

    with pytest.raises(FileNotFoundError) as exc_info:
        generate_dataset(
            scenarios=[
                ScenarioInput(
                    name="normal",
                    log_path=tmp_path / "missing.jsonl",
                    label="NORMAL",
                )
            ],
            output_path=output_path,
            window_ms=5000,
            skip_missing=False,
        )

    assert "Scenario log not found" in str(exc_info.value)


def test_generate_dataset_skips_missing_log_when_enabled(
    tmp_path: Path,
) -> None:
    output_path = tmp_path / "synthetic_dataset.csv"

    row_count = generate_dataset(
        scenarios=[
            ScenarioInput(
                name="normal",
                log_path=tmp_path / "missing.jsonl",
                label="NORMAL",
            )
        ],
        output_path=output_path,
        window_ms=5000,
        skip_missing=True,
    )

    rows = read_csv_rows(output_path)

    assert row_count == 0
    assert rows == []
