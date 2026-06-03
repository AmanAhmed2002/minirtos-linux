package com.minirtos.playground.service;

import java.util.Optional;

import java.util.List;

import org.springframework.stereotype.Service;

import com.minirtos.playground.dto.ScenarioResponse;

@Service
public class ScenarioService {

    public List<ScenarioResponse> getScenarios() {
        return List.of(
            new ScenarioResponse(
                "normal",
                "Normal Runtime",
                "round_robin",
                "Beginner",
                "Periodic tasks and baseline runtime telemetry",
                "Runs the MiniRTOS simulator with healthy periodic task execution and normal message flow.",
                "configs/normal.json",
                List.of(
                    "What an embedded runtime loop looks like",
                    "How periodic tasks execute",
                    "How telemetry is generated"
                ),
                List.of(
                    "runtime_started",
                    "scheduler_started",
                    "task_started",
                    "task_completed",
                    "runtime_summary"
                )
            ),

            new ScenarioResponse(
                "priority_scheduler",
                "Priority Scheduler",
                "priority",
                "Intermediate",
                "Priority-based scheduling",
                "Runs the simulator using priority scheduling so students can compare task order against round-robin behavior.",
                "configs/priority_scheduler.json",
                List.of(
                    "How task priority affects scheduling",
                    "Why higher-priority tasks run first",
                    "How scheduler policy changes system behavior"
                ),
                List.of(
                    "scheduler_started",
                    "task_started",
                    "task_completed",
                    "runtime_summary"
                )
            ),

            new ScenarioResponse(
                "deadline_scheduler",
                "Earliest Deadline First Scheduler",
                "earliest_deadline_first",
                "Advanced",
                "Deadline-driven scheduling",
                "Runs the simulator using earliest-deadline-first scheduling to demonstrate deadline-aware task ordering.",
                "configs/deadline_scheduler.json",
                List.of(
                    "How EDF scheduling works",
                    "Why deadlines affect execution order",
                    "How real-time scheduling differs from simple round-robin"
                ),
                List.of(
                    "scheduler_started",
                    "task_started",
                    "task_completed",
                    "runtime_summary"
                )
            ),

            new ScenarioResponse(
                "queue_overflow",
                "Queue Overflow",
                "round_robin",
                "Intermediate",
                "Bounded queue capacity and message drops",
                "Demonstrates what happens when producers send messages faster than the consumer can drain them.",
                "configs/queue_overflow.json",
                List.of(
                    "Why embedded queues are bounded",
                    "How queue pressure causes message drops",
                    "Difference between queue-full drops and fault-injected drops"
                ),
                List.of(
                    "message_sent",
                    "message_received",
                    "message_dropped",
                    "runtime_summary"
                )
            ),

            new ScenarioResponse(
                "cpu_spike",
                "CPU Spike Fault",
                "round_robin",
                "Advanced",
                "Transient CPU load anomaly",
                "Injects a simulated CPU spike into NetworkTask so students can observe abnormal execution behavior.",
                "configs/cpu_spike.json",
                List.of(
                    "How CPU spikes affect runtime stability",
                    "How timing anomalies appear in structured logs",
                    "Why observability matters in embedded systems"
                ),
                List.of(
                    "fault_injected",
                    "task_completed",
                    "deadline_missed",
                    "runtime_summary"
                )
            ),

            new ScenarioResponse(
                "task_crash",
                "Task Crash Simulation",
                "round_robin",
                "Advanced",
                "Task failure and skipped execution",
                "Simulates NetworkTask entering a failed state and being skipped by the scheduler on future due times.",
                "configs/task_crash.json",
                List.of(
                    "How task failure affects runtime behavior",
                    "Why failed tasks must be observable",
                    "How task_skipped telemetry explains degraded behavior"
                ),
                List.of(
                    "fault_injected",
                    "task_failed",
                    "task_skipped",
                    "runtime_summary"
                )
            ),

            new ScenarioResponse(
                "slow_task",
                "Slow Task Fault",
                "round_robin",
                "Intermediate",
                "Deadline misses caused by long task execution",
                "Simulates ControlTask taking too long to complete, causing deadline pressure and warning or unstable telemetry.",
                "configs/slow_task.json",
                List.of(
                    "What deadline misses mean",
                    "Why execution time matters",
                    "How timing faults appear in logs"
                ),
                List.of(
                    "fault_injected",
                    "task_completed",
                    "deadline_missed",
                    "runtime_summary"
                )
            ),

            new ScenarioResponse(
                "dropped_messages",
                "Dropped Messages Fault",
                "round_robin",
                "Intermediate",
                "Fault-injected message reliability loss",
                "Intentionally drops messages to LoggerTask after the configured start time to simulate message reliability faults.",
                "configs/dropped_messages.json",
                List.of(
                    "How message reliability faults differ from queue pressure",
                    "Why telemetry should separate drop reasons",
                    "How fault injection creates reproducible failures"
                ),
                List.of(
                    "fault_injected",
                    "message_dropped",
                    "runtime_summary"
                )
            ),

            new ScenarioResponse(
                "watchdog_slow_task",
                "Watchdog Slow Task Recovery",
                "round_robin",
                "Advanced",
                "Watchdog monitoring and simulated recovery",
                "Combines slow-task behavior with watchdog monitoring, timeout telemetry, and simulated task recovery.",
                "configs/watchdog_slow_task.json",
                List.of(
                    "What a watchdog is",
                    "Why watchdogs monitor repeated deadline misses",
                    "How simulated recovery is represented in telemetry"
                ),
                List.of(
                    "fault_injected",
                    "watchdog_timeout",
                    "task_recovered",
                    "runtime_summary"
                )
            )
        );
    }
    public Optional<ScenarioResponse> findById(String scenarioId) {
      if (scenarioId == null || scenarioId.isBlank()) {
        return Optional.empty();
    }

      return getScenarios().stream()
        .filter(scenario -> scenario.id().equals(scenarioId))
        .findFirst();
    }
}

