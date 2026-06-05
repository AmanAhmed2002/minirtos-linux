import type { AnalysisResponse, RunSummaryResponse, ScenarioResponse } from "../types/api";

export const scenarioFixtures: ScenarioResponse[] = [
  {
    id: "queue_overflow",
    name: "Queue Overflow",
    schedulerMode: "round_robin",
    difficulty: "Intermediate",
    concept: "Bounded queues",
    description: "Creates bounded queue pressure so students can inspect queue-full drops.",
    configPath: "configs/queue_overflow.json",
    teaches: ["Bounded queue pressure", "Queue-full drops"],
    expectedSignals: ["message_dropped", "queueFullDrops"],
  },
  {
    id: "cpu_spike",
    name: "CPU Spike",
    schedulerMode: "round_robin",
    difficulty: "Advanced",
    concept: "Timing pressure",
    description: "Adds simulated CPU timing pressure to a runtime task.",
    configPath: "configs/cpu_spike.json",
    teaches: ["CPU timing pressure", "Deadline misses"],
    expectedSignals: ["fault_injected", "deadline_missed"],
  },
];

export const completedRunFixture: RunSummaryResponse = {
  runId: "2026-06-05T010203Z-queue-overflow-test",
  scenarioId: "queue_overflow",
  scenarioName: "Queue Overflow",
  status: "COMPLETED",
  runtimeHealth: "WARNING",
  logPath: "runs/2026-06-05T010203Z-queue-overflow-test/runtime_logs.jsonl",
  analysisPath: "runs/2026-06-05T010203Z-queue-overflow-test/analysis.txt",
  createdAt: "2026-06-05T01:02:03Z",
  completedAt: "2026-06-05T01:02:33Z",
  errorMessage: null,
};

export const failedRunFixture: RunSummaryResponse = {
  runId: "failed-run",
  scenarioId: "task_crash",
  scenarioName: "Task Crash",
  status: "FAILED",
  runtimeHealth: null,
  logPath: null,
  analysisPath: null,
  createdAt: "2026-06-05T01:03:00Z",
  completedAt: "2026-06-05T01:03:05Z",
  errorMessage: "Runtime process failed.",
};

export const analysisFixture: AnalysisResponse = {
  runId: completedRunFixture.runId,
  scenarioId: "queue_overflow",
  runtimeHealth: "WARNING",
  eventsLoaded: 3064,
  simulationName: "queue_overflow",
  schedulerMode: "round_robin",
  configuredDurationSeconds: 30,
  observedDurationMs: 30000,
  eventCounts: { message_dropped: 956, task_completed: 120 },
  severityCounts: { INFO: 2100, WARNING: 956 },
  taskMetrics: {
    ControlTask: {
      runs: 60,
      deadlineMisses: 0,
      deadlineMissedEvents: 0,
      avgDurationMs: 8.5,
      maxDurationMs: 12,
    },
    NetworkTask: {
      runs: 30,
      deadlineMisses: 2,
      deadlineMissedEvents: 2,
      avgDurationMs: 17.2,
      maxDurationMs: 44,
    },
  },
  messageSummary: {
    sent: 33,
    received: 30,
    dropped: 956,
    queueFullDrops: 956,
    faultInjectedDrops: 0,
  },
  rootCauses: ["Queue pressure detected", "Dropped messages detected"],
  rawReport: "Runtime Health: WARNING\nQueue full drops: 956",
};
