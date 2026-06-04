import type { AnalysisResponse, ScenarioResponse } from "../types/api";

export interface ConceptModule {
  title: string;
  summary: string;
  whyItMatters: string;
  signalsToWatch: string[];
  studentTakeaway: string;
}

export interface ScenarioLearningContent {
  headline: string;
  conceptModules: ConceptModule[];
}

const defaultLearningContent: ScenarioLearningContent = {
  headline: "This scenario shows how an embedded runtime behaves under a specific scheduling or fault condition.",
  conceptModules: [
    {
      title: "Runtime telemetry",
      summary:
        "The simulator emits structured JSONL events while tasks run, messages move through queues, and the analyzer checks system health.",
      whyItMatters:
        "Telemetry is how embedded engineers understand what happened inside a runtime after a simulation or device run.",
      signalsToWatch: [
        "runtimeHealth",
        "eventCounts",
        "taskMetrics",
        "messageSummary",
        "rootCauses",
      ],
      studentTakeaway:
        "A run is not only successful or failed. It can complete while still showing warnings or unstable behavior.",
    },
  ],
};

export const scenarioLearningContent: Record<string, ScenarioLearningContent> = {
  normal: {
    headline:
      "Baseline runtime behavior: tasks run periodically, messages move through bounded queues, and the analyzer reports health.",
    conceptModules: [
      {
        title: "Periodic tasks",
        summary:
          "Embedded systems often run recurring tasks such as control loops, network handlers, and loggers.",
        whyItMatters:
          "Periodic tasks must run often enough to keep the system responsive and predictable.",
        signalsToWatch: ["task_completed", "runs", "avgDurationMs"],
        studentTakeaway:
          "A stable embedded runtime depends on tasks completing consistently within their expected timing windows.",
      },
      {
        title: "Bounded queues",
        summary:
          "The message bus uses limited queue capacity, which can cause drops if producers send faster than consumers receive.",
        whyItMatters:
          "Real embedded systems often have limited memory, so queues cannot grow forever.",
        signalsToWatch: ["message_sent", "message_received", "queueFullDrops"],
        studentTakeaway:
          "Queue drops can happen even without an injected fault when capacity is limited.",
      },
    ],
  },

  priority_scheduler: {
    headline:
      "Priority scheduling shows how higher-priority tasks can be selected before lower-priority tasks.",
    conceptModules: [
      {
        title: "Priority scheduling",
        summary:
          "Tasks are ordered by priority instead of simple round-robin order.",
        whyItMatters:
          "Safety-critical or time-sensitive work often needs to run before less important work.",
        signalsToWatch: ["schedulerMode", "task_completed", "deadlineMisses"],
        studentTakeaway:
          "Priority scheduling improves control over task order, but it must be designed carefully to avoid starvation.",
      },
    ],
  },

  deadline_scheduler: {
    headline:
      "Earliest-deadline-first scheduling prioritizes tasks with the closest deadlines.",
    conceptModules: [
      {
        title: "Earliest-deadline-first scheduling",
        summary:
          "EDF chooses work based on deadline urgency instead of static task order.",
        whyItMatters:
          "Deadline-aware scheduling is useful when missing a deadline is more important than task priority alone.",
        signalsToWatch: ["schedulerMode", "deadlineMisses", "observedDurationMs"],
        studentTakeaway:
          "EDF connects scheduling decisions directly to timing constraints.",
      },
    ],
  },

  queue_overflow: {
    headline:
      "Queue overflow demonstrates bounded queue pressure without intentional message fault injection.",
    conceptModules: [
      {
        title: "Queue pressure",
        summary:
          "Messages are dropped because the receiving task queue reaches its configured capacity.",
        whyItMatters:
          "Embedded systems often have fixed queue sizes. Overflow can reveal mismatched producer and consumer rates.",
        signalsToWatch: ["messageDropped", "queueFullDrops", "faultInjectedDrops"],
        studentTakeaway:
          "Queue-full drops mean the queue capacity was exceeded, not that the fault injector intentionally dropped messages.",
      },
      {
        title: "Warning health state",
        summary:
          "A run can complete successfully but still be classified as WARNING because important telemetry shows degraded behavior.",
        whyItMatters:
          "A runtime can finish execution while still showing reliability or throughput issues.",
        signalsToWatch: ["runtimeHealth", "rootCauses"],
        studentTakeaway:
          "WARNING usually means the system ran, but the analyzer found a condition worth investigating.",
      },
    ],
  },

  cpu_spike: {
    headline:
      "CPU spike demonstrates timing pressure where a task takes much longer than expected.",
    conceptModules: [
      {
        title: "CPU timing pressure",
        summary:
          "The fault injector adds simulated execution delay, making task duration longer.",
        whyItMatters:
          "CPU spikes can cause deadline misses and make a real-time system unstable.",
        signalsToWatch: ["avgDurationMs", "maxDurationMs", "deadlineMisses"],
        studentTakeaway:
          "Long task duration is dangerous when tasks have strict timing requirements.",
      },
    ],
  },

  task_crash: {
    headline:
      "Task crash shows how the runtime logs a simulated failed task while the overall process continues.",
    conceptModules: [
      {
        title: "Task failure isolation",
        summary:
          "A task can enter a failed state and produce skipped-task telemetry.",
        whyItMatters:
          "Embedded systems need clear failure signals so recovery logic can identify which subsystem failed.",
        signalsToWatch: ["task_failed", "task_skipped", "runtimeHealth"],
        studentTakeaway:
          "A task crash is different from a whole program crash. The runtime can continue while reporting task-level failure.",
      },
    ],
  },

  slow_task: {
    headline:
      "Slow task demonstrates what happens when a task repeatedly exceeds its expected execution timing.",
    conceptModules: [
      {
        title: "Deadline misses",
        summary:
          "A task misses its deadline when it takes too long or cannot run within its timing constraint.",
        whyItMatters:
          "Deadline misses are one of the most important indicators of real-time system instability.",
        signalsToWatch: ["deadlineMisses", "deadlineMissedEvents", "avgDurationMs"],
        studentTakeaway:
          "Repeated deadline misses usually mean the task design, scheduling mode, or CPU budget needs to be reviewed.",
      },
    ],
  },

  dropped_messages: {
    headline:
      "Dropped messages demonstrates reliability faults where messages are intentionally dropped by the fault injector.",
    conceptModules: [
      {
        title: "Fault-injected message loss",
        summary:
          "Messages are dropped because the fault injector simulates unreliable communication.",
        whyItMatters:
          "Embedded and distributed systems must often handle unreliable communication paths.",
        signalsToWatch: ["faultInjectedDrops", "messageDropped", "rootCauses"],
        studentTakeaway:
          "Fault-injected drops are different from queue-full drops because the cause is simulated unreliability, not capacity.",
      },
    ],
  },

  watchdog_slow_task: {
    headline:
      "Watchdog slow task shows how timing faults can escalate into watchdog timeouts and recovery telemetry.",
    conceptModules: [
      {
        title: "Watchdog monitoring",
        summary:
          "A watchdog checks whether a task appears unhealthy or overdue and emits timeout/recovery events.",
        whyItMatters:
          "Watchdogs are common in embedded systems because they help detect stuck or unhealthy tasks.",
        signalsToWatch: ["watchdog_timeout", "task_recovered", "deadlineMisses"],
        studentTakeaway:
          "Watchdog telemetry helps distinguish ordinary slow behavior from behavior serious enough to trigger recovery.",
      },
    ],
  },
};

export function getScenarioLearningContent(
  scenario: ScenarioResponse | null | undefined
): ScenarioLearningContent {
  if (!scenario) return defaultLearningContent;
  return scenarioLearningContent[scenario.id] ?? defaultLearningContent;
}

export function getRuntimeHealthExplanation(
  analysis: AnalysisResponse | null
): string {
  const health = analysis?.runtimeHealth?.toUpperCase();

  if (health === "NORMAL") {
    return "NORMAL means the analyzer did not find major timing, queue, fault, watchdog, or failure problems in this run.";
  }

  if (health === "WARNING") {
    return "WARNING means the run completed, but the analyzer found degraded behavior such as message drops or queue pressure.";
  }

  if (health === "UNSTABLE") {
    return "UNSTABLE means the analyzer found serious runtime issues such as deadline misses, task failures, CPU spikes, or watchdog events.";
  }

  return "Runtime health explains how the analyzer interpreted the run after reading the generated telemetry.";
}

export function getRootCauseExplanation(cause: string): string {
  const normalized = cause.toLowerCase();

  if (normalized.includes("queue")) {
    return "Queue-related root causes usually mean messages were produced faster than they were consumed or the queue limit was too small.";
  }

  if (normalized.includes("deadline")) {
    return "Deadline-related root causes mean one or more tasks exceeded their expected timing constraints.";
  }

  if (normalized.includes("watchdog")) {
    return "Watchdog-related root causes mean a task looked unhealthy long enough to trigger monitoring and recovery telemetry.";
  }

  if (normalized.includes("crash") || normalized.includes("failed")) {
    return "Task-failure root causes mean the simulator recorded a task entering a failed or skipped state.";
  }

  if (normalized.includes("drop")) {
    return "Dropped-message root causes mean the runtime lost messages either because of queue pressure or intentional fault injection.";
  }

  return "This root cause is a signal from the analyzer that should be compared with event counts, task metrics, and message metrics.";
}
