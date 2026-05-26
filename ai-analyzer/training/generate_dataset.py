#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
APP_DIR = REPO_ROOT / "ai-analyzer" / "app"

sys.path.insert(0, str(APP_DIR))

from analyze import load_events  # noqa: E402
from anomaly_detector import FEATURE_NAMES, extract_features, split_events_into_windows  # noqa: E402


Event = dict[str, Any]


SCENARIO_LABELS: dict[str, str] = {
    "normal": "NORMAL",
    "priority_scheduler": "NORMAL",
    "priority": "NORMAL",
    "deadline_scheduler": "NORMAL",
    "deadline": "NORMAL",
    "edf": "NORMAL",
    "queue_overflow": "QUEUE_PRESSURE",
    "cpu_spike": "CPU_SPIKE",
    "task_crash": "TASK_CRASH",
    "slow_task": "SLOW_TASK",
    "dropped_messages": "DROPPED_MESSAGES",
    "watchdog": "WATCHDOG_RECOVERY",
    "watchdog_slow_task": "WATCHDOG_RECOVERY",
}


OUTPUT_COLUMNS = [
    "scenario_name",
    "label",
    "scheduler_mode",
    "window_start_ms",
    "window_end_ms",
    "event_count",
    *FEATURE_NAMES,
]


@dataclass(frozen=True)
class ScenarioInput:
    name: str
    log_path: Path
    label: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate a labeled synthetic anomaly dataset from MiniRTOS-Linux "
            "scenario JSONL logs."
        )
    )

    parser.add_argument(
        "--output",
        default="reports/generated/synthetic_dataset.csv",
        help=(
            "Output CSV path. Default: reports/generated/synthetic_dataset.csv"
        ),
    )

    parser.add_argument(
        "--window-ms",
        type=int,
        default=5000,
        help="Window size in milliseconds. Default: 5000",
    )

    parser.add_argument(
        "--scenario",
        action="append",
        default=[],
        metavar="NAME=PATH",
        help=(
            "Scenario log mapping. Example: "
            "--scenario normal=logs/normal_runtime_logs.jsonl. "
            "May be provided multiple times."
        ),
    )

    parser.add_argument(
        "--skip-missing",
        action="store_true",
        help=(
            "Skip missing scenario logs instead of failing. Useful before all "
            "Docker demo logs have been generated."
        ),
    )

    return parser.parse_args()


def infer_label(scenario_name: str) -> str:
    normalized_name = scenario_name.strip().lower().replace("-", "_")

    if normalized_name in SCENARIO_LABELS:
        return SCENARIO_LABELS[normalized_name]

    raise ValueError(
        f"Unknown scenario label for '{scenario_name}'. "
        "Add it to SCENARIO_LABELS or use a known scenario name."
    )


def parse_scenario_argument(raw_value: str) -> ScenarioInput:
    if "=" not in raw_value:
        raise ValueError(
            f"Invalid --scenario value '{raw_value}'. Expected NAME=PATH."
        )

    name, path_text = raw_value.split("=", 1)
    name = name.strip()
    path_text = path_text.strip()

    if not name:
        raise ValueError("Scenario name cannot be empty.")

    if not path_text:
        raise ValueError(f"Scenario path cannot be empty for '{name}'.")

    return ScenarioInput(
        name=name,
        log_path=Path(path_text),
        label=infer_label(name),
    )


def discover_scheduler_mode(events: list[Event]) -> str:
    for event in events:
        if event.get("event_type") == "runtime_started":
            return str(event.get("scheduler_mode", "unknown"))

    return "unknown"


def build_rows_for_scenario(
    scenario: ScenarioInput,
    window_ms: int,
) -> list[dict[str, Any]]:
    events = load_events(scenario.log_path)
    scheduler_mode = discover_scheduler_mode(events)
    rows: list[dict[str, Any]] = []

    for window_start_ms, window_end_ms, window_events in split_events_into_windows(
        events,
        window_ms,
    ):
        features = extract_features(window_events)

        row: dict[str, Any] = {
            "scenario_name": scenario.name,
            "label": scenario.label,
            "scheduler_mode": scheduler_mode,
            "window_start_ms": window_start_ms,
            "window_end_ms": window_end_ms,
            "event_count": len(window_events),
        }

        for feature_name in FEATURE_NAMES:
            row[feature_name] = features.get(feature_name, 0.0)

        rows.append(row)

    return rows


def write_dataset(output_path: Path, rows: list[dict[str, Any]]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def generate_dataset(
    scenarios: list[ScenarioInput],
    output_path: Path,
    window_ms: int,
    skip_missing: bool,
) -> int:
    if window_ms <= 0:
        raise ValueError("window_ms must be greater than 0.")

    all_rows: list[dict[str, Any]] = []

    for scenario in scenarios:
        if not scenario.log_path.exists():
            if skip_missing:
                print(
                    f"[WARN] Skipping missing log for {scenario.name}: "
                    f"{scenario.log_path}",
                    file=sys.stderr,
                )
                continue

            raise FileNotFoundError(
                f"Scenario log not found for {scenario.name}: {scenario.log_path}"
            )

        scenario_rows = build_rows_for_scenario(scenario, window_ms)
        all_rows.extend(scenario_rows)

    write_dataset(output_path, all_rows)

    print("Synthetic dataset generated")
    print("===========================")
    print(f"Output: {output_path}")
    print(f"Rows: {len(all_rows)}")
    print(f"Scenarios requested: {len(scenarios)}")
    print(f"Window size: {window_ms} ms")

    return len(all_rows)


def main() -> int:
    args = parse_args()

    try:
        scenarios = [
            parse_scenario_argument(raw_scenario)
            for raw_scenario in args.scenario
        ]

        if not scenarios:
            raise ValueError(
                "At least one --scenario NAME=PATH argument is required."
            )

        generate_dataset(
            scenarios=scenarios,
            output_path=Path(args.output),
            window_ms=args.window_ms,
            skip_missing=args.skip_missing,
        )
    except (FileNotFoundError, ValueError) as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
