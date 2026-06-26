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

/*
 * Curriculum note (content only — no UI, API, runtime, or behavior changes):
 *
 * This file is a beginner-first curriculum. It assumes no prior embedded or
 * RTOS knowledge and defines each term before relying on it. Every worked
 * example uses exact values from configs/*.json, and every "signal" names a
 * real telemetry event_type or a real analyzer/API field.
 *
 * Two naming systems appear, and we keep them distinct:
 *   - Raw telemetry events use snake_case event_type values emitted by the C++
 *     runtime, e.g. task_completed, message_dropped, fault_injected,
 *     watchdog_timeout, runtime_summary.
 *   - Parsed analyzer/API values use camelCase fields, e.g. runtimeHealth,
 *     taskMetrics, deadlineMisses, avgDurationMs, queueFullDrops.
 *
 * Important accuracy facts verified against the runtime/analyzer source:
 *   - There is NO standalone deadline_missed event. A deadline miss is recorded
 *     as the boolean deadline_missed field (plus deadline_miss_count) on
 *     task_completed events, surfaced by the analyzer as deadlineMisses /
 *     deadlineMissedEvents per task and in runtime_summary.
 *   - runtimeHealth is one of NORMAL, WARNING, or UNSTABLE. COMPLETED is a run
 *     status, not a health verdict — a run can complete and still be WARNING or
 *     UNSTABLE.
 *   - message_dropped events carry a reason: "queue_full" (capacity exceeded)
 *     or "fault_injected_drop" (the injector simulated unreliable delivery).
 *     The analyzer splits these into queueFullDrops vs faultInjectedDrops.
 *   - In this simulator, ControlTask and NetworkTask send messages to
 *     LoggerTask, which is the only consumer.
 *   - slow_task and cpu_spike are mechanically the same fault: both add extra
 *     execution time on every run once timestamp >= start_after_ms (they are
 *     not one-time blips). They differ only in the target task and magnitude.
 *
 * Simulator scope: this is a software-only educational model. It does not model
 * real hardware interrupts, true preemptive context switching, or genuine
 * parallel execution. Treat its timing as illustrative, not hardware-accurate.
 *
 * Recommended conceptual path (the dropdown order is unchanged; this is only a
 * suggested study order):
 *   1. normal  2. priority_scheduler  3. deadline_scheduler  4. queue_overflow
 *   5. dropped_messages  6. slow_task  7. cpu_spike  8. task_crash
 *   9. watchdog_slow_task
 */

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
      "Start here (step 1 of 9). Learn what an embedded system is, what this simulator models, and what a healthy baseline run looks like before studying any fault.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "None. This is the foundation scenario. Everything later (priority, deadlines, queues, faults, watchdogs) builds on the vocabulary defined here.",
        whyItMatters:
          "Later scenarios assume you already know what a task, period, deadline, and telemetry event are. Skipping this step makes the fault scenarios look like noise.",
        signalsToWatch: ["runtimeHealth", "taskMetrics", "eventCounts"],
        studentTakeaway:
          "If a term in a later scenario feels undefined, it was probably defined here first.",
      },
      {
        title: "What an embedded system is",
        summary:
          "An embedded system is a computer built into a larger device to do one dedicated job — a thermostat, a motor controller, a sensor hub — rather than a general-purpose computer that runs arbitrary apps.",
        whyItMatters:
          "Embedded systems usually have tight memory, tight CPU budgets, and real timing requirements, so 'it eventually finished' is not good enough; work must finish on time, every time.",
        signalsToWatch: ["schedulerMode", "configuredDurationSeconds"],
        studentTakeaway:
          "General-purpose computers optimize for throughput and flexibility; embedded systems optimize for predictability under constraints.",
      },
      {
        title: "The hardware mental model",
        summary:
          "A microcontroller has a CPU (executes instructions), memory (holds code and data), a timer (a steady time source that drives periodic work), and I/O such as GPIO pins (talks to the outside world). The program burned onto it is called firmware.",
        whyItMatters:
          "Real-time behavior comes from how these pieces interact: the timer paces work, the CPU has a finite budget per time slice, and limited memory caps how much data (such as queued messages) you can hold.",
        signalsToWatch: ["observedDurationMs", "eventsLoaded"],
        studentTakeaway:
          "CPU + memory + timer + I/O + firmware is the minimum mental model; every constraint in later scenarios traces back to one of these.",
      },
      {
        title: "What this simulator models — and what it does not",
        summary:
          "This is a software-only simulator. It models tasks, a scheduler, periods, deadlines, bounded message queues, fault injection, a watchdog, and JSONL telemetry. It does NOT model real hardware interrupts, true preemptive context switching, or genuine parallel CPU execution.",
        whyItMatters:
          "If you mistake this for a full hardware RTOS, you will over-trust its timing numbers. It is a teaching model for concepts and observability, not a cycle-accurate device.",
        signalsToWatch: ["simulationName", "schedulerMode"],
        studentTakeaway:
          "Trust the concepts and the telemetry workflow; treat the exact millisecond timings as illustrative, not hardware-accurate.",
      },
      {
        title: "Bare-metal loop vs an RTOS scheduler",
        summary:
          "A bare-metal program is one big loop that does everything in a fixed order. An RTOS instead splits work into independent tasks and uses a scheduler to decide which task runs next based on a policy (round-robin, priority, or deadline).",
        whyItMatters:
          "Splitting work into scheduled tasks is what lets a system meet several different timing requirements at once instead of letting one slow step block everything.",
        signalsToWatch: ["schedulerMode", "task_started", "task_completed"],
        studentTakeaway:
          "The scheduler is the new idea an RTOS adds: it chooses what runs next, so understanding its policy is the key to every scheduling scenario.",
      },
      {
        title: "Core vocabulary: task, scheduler, tick, period, execution time, deadline",
        summary:
          "A task is a unit of recurring work. The scheduler picks which ready task runs. A tick is the runtime's time step. period_ms is how often a task should run. execution_time_ms is how long its work takes. deadline_ms is the latest it may finish after release.",
        whyItMatters:
          "Every health judgment is really a comparison: did observed_duration_ms stay within deadline_ms, and did the task run as often as its period_ms expects?",
        signalsToWatch: ["task_started", "task_completed", "avgDurationMs", "deadlineMisses"],
        studentTakeaway:
          "Period = how often, execution time = how long, deadline = the time limit. Hold these three apart and scheduling stops being mysterious.",
      },
      {
        title: "Telemetry vocabulary: event, metric, analyzer, runtime health",
        summary:
          "An event is one JSONL line emitted as something happens (e.g. task_completed). A metric is an aggregate the analyzer computes (e.g. avgDurationMs). The analyzer reads all events and produces runtimeHealth: NORMAL, WARNING, or UNSTABLE.",
        whyItMatters:
          "You rarely read raw events one by one. You read the analyzer's metrics and rootCauses, then drill into events to confirm. Knowing which is which prevents confusion between event_type names and camelCase fields.",
        signalsToWatch: ["runtimeHealth", "eventCounts", "severityCounts", "rootCauses"],
        studentTakeaway:
          "Events are raw and snake_case; metrics are aggregated and camelCase; runtimeHealth is the analyzer's overall verdict, not the run's exit status.",
      },
      {
        title: "Worked example",
        summary:
          "ControlTask is configured with period_ms 100, execution_time_ms 10, deadline_ms 80. Each release it needs ~10 ms of work and must finish within 80 ms, leaving ~70 ms of slack. Over a 30 s run it should run about 30000 / 100 = 300 times.",
        whyItMatters:
          "10 ms of work against an 80 ms deadline is comfortable headroom, so a healthy baseline should show zero deadline misses for ControlTask and avgDurationMs near 10.",
        signalsToWatch: ["avgDurationMs", "maxDurationMs", "deadlineMisses", "runs"],
        studentTakeaway:
          "Slack = deadline − execution time. ControlTask's 70 ms of slack is why 'normal' is healthy; later faults eat that slack until it goes negative.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: with three tasks (ControlTask 100/80/10, NetworkTask 250/200/20, LoggerTask 500/400/15) and no fault, you should see runtimeHealth NORMAL, deadlineMisses of 0 for every task, and avgDurationMs close to each task's configured execution_time_ms.",
        whyItMatters:
          "Active learning works best when you commit to an expected result first, then compare. Predicting forces you to use the vocabulary instead of just reading the answer.",
        signalsToWatch: ["runtimeHealth", "deadlineMisses", "avgDurationMs"],
        studentTakeaway:
          "Write your prediction down before running. A surprise later is the most valuable thing on this whole platform.",
      },
      {
        title: "Read the results",
        summary:
          "After running, check runtimeHealth (expect NORMAL), open taskMetrics and confirm deadlineMisses is 0 and runs is near the period-derived count, and confirm avgDurationMs ~ configured execution time. rootCauses should report no faults or misses.",
        whyItMatters:
          "Knowing exactly which field answers your prediction is the core skill: runtimeHealth for the verdict, taskMetrics for per-task timing, rootCauses for the analyzer's reasoning.",
        signalsToWatch: ["runtimeHealth", "taskMetrics", "runs", "rootCauses"],
        studentTakeaway:
          "A healthy baseline is your reference point. You can only recognize 'degraded' later because you saw 'normal' here first.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: if a run finishes and its status is COMPLETED, does that prove the system was healthy?",
        whyItMatters:
          "This is the single most common beginner misconception on the platform, so it is worth nailing down at the start.",
        signalsToWatch: ["runtimeHealth", "severityCounts"],
        studentTakeaway:
          "No. COMPLETED only means the process finished. Health is the analyzer's separate verdict (runtimeHealth); a COMPLETED run can still be WARNING or UNSTABLE.",
      },
    ],
  },

  priority_scheduler: {
    headline:
      "Step 2 of 9. Same three tasks as the baseline, but the scheduler now picks the highest-priority ready task instead of taking turns. See how priority changes who runs first.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "Do the Normal Runtime scenario first. You should already know what a task, period, deadline, and runtimeHealth are. This scenario only changes the scheduling policy.",
        whyItMatters:
          "Priority scheduling is a variation on the baseline. If the baseline vocabulary is shaky, the difference here is invisible.",
        signalsToWatch: ["schedulerMode", "task_completed"],
        studentTakeaway:
          "Only one thing changed versus normal: schedulerMode is now 'priority'. Everything you compare flows from that.",
      },
      {
        title: "Ready, selected, running, preempted",
        summary:
          "Four distinct ideas. A task is ready when its next release time has arrived. The scheduler selects one ready task to run. That task is running while it executes. Preemption is pausing a running task to run a higher-priority one.",
        whyItMatters:
          "Beginners blur 'ready' and 'running'. Many tasks can be ready at once; the scheduler's whole job is selection among the ready set.",
        signalsToWatch: ["task_started", "task_completed", "schedulerMode"],
        studentTakeaway:
          "Readiness is about time (is it due?); selection is about policy (which due task wins?). This simulator models selection by priority but does not model true hardware preemption.",
      },
      {
        title: "Priority convention and static priority",
        summary:
          "In this simulator a LOWER priority number means HIGHER importance: ControlTask priority 1 outranks NetworkTask 2, which outranks LoggerTask 3. These priorities are static — fixed in the config, never changing at runtime.",
        whyItMatters:
          "Priority direction is a frequent source of bugs. Confirming 'lower number = higher priority' before reading results prevents misreading every scheduling decision.",
        signalsToWatch: ["schedulerMode", "task_started"],
        studentTakeaway:
          "Priority 1 is the most important task here. Static means the order is decided by you in the config, not discovered by the runtime.",
      },
      {
        title: "Starvation risk vs round-robin",
        summary:
          "Round-robin gives every task a turn in order. Strict priority always favors the top task, so a lower-priority task can be starved (rarely or never selected) if higher-priority work keeps arriving.",
        whyItMatters:
          "Priority improves responsiveness for critical work but trades away fairness. Recognizing starvation is a core real-time design skill.",
        signalsToWatch: ["task_completed", "runs", "runtime_summary"],
        studentTakeaway:
          "Round-robin = fairness; priority = control with a starvation risk. Neither is universally correct; the workload decides.",
      },
      {
        title: "Worked example",
        summary:
          "Priorities are ControlTask 1, NetworkTask 2, LoggerTask 3. When several tasks are ready in the same step, the scheduler should select ControlTask first, then NetworkTask, then LoggerTask. Periods (100/250/500 ms) still control how often each becomes ready.",
        whyItMatters:
          "Because these tasks have light execution times and generous deadlines, priority changes selection order but should not, by itself, cause deadline misses — a useful contrast with the fault scenarios.",
        signalsToWatch: ["task_started", "task_completed", "deadlineMisses"],
        studentTakeaway:
          "Priority decides order of selection, not how often a task is released. Both period and priority shape the timeline.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: with light loads and no fault, expect runtimeHealth NORMAL and deadlineMisses of 0. Compared to round-robin, expect ControlTask to be selected first whenever it is ready alongside others.",
        whyItMatters:
          "Predicting 'NORMAL but different ordering' sharpens the distinction between a health problem and a mere policy difference.",
        signalsToWatch: ["runtimeHealth", "deadlineMisses", "schedulerMode"],
        studentTakeaway:
          "A different scheduler can change the order of events without changing the health verdict.",
      },
      {
        title: "Read the results",
        summary:
          "Confirm schedulerMode is 'priority'. Compare task_started/task_completed ordering against the round-robin baseline. Check taskMetrics: deadlineMisses should stay 0 and runs should still track each task's period.",
        whyItMatters:
          "The lesson is in the comparison, not the absolute numbers. The same tasks under a different policy produce a different selection pattern.",
        signalsToWatch: ["schedulerMode", "task_completed", "runs", "deadlineMisses"],
        studentTakeaway:
          "Read ordering from the event stream and health from the metrics; here the ordering changes but health should not.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: NetworkTask has priority 2 and LoggerTask has priority 3. If both are ready at the same instant, which does the scheduler select, and why?",
        whyItMatters:
          "It tests the priority convention directly, which is the one rule most likely to be remembered backwards.",
        signalsToWatch: ["schedulerMode", "task_started"],
        studentTakeaway:
          "NetworkTask. The lower priority number (2 < 3) means higher importance, so it is selected ahead of LoggerTask.",
      },
    ],
  },

  deadline_scheduler: {
    headline:
      "Step 3 of 9. Earliest Deadline First (EDF) selects the ready task whose deadline is closest in time, rather than the one with the highest static priority.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "Do Normal Runtime and Priority Scheduler first. EDF is best understood as a contrast with static priority, so you need that comparison in mind.",
        whyItMatters:
          "EDF answers 'what if urgency, not a fixed rank, decided order?' That question only lands once static priority is familiar.",
        signalsToWatch: ["schedulerMode", "deadlineMisses"],
        studentTakeaway:
          "EDF replaces 'who is most important' with 'whose deadline is soonest'.",
      },
      {
        title: "Relative vs absolute deadline",
        summary:
          "A relative deadline is the time budget after release (ControlTask 80 ms, NetworkTask 150 ms, LoggerTask 400 ms here). An absolute deadline is a point on the clock: release_time + relative_deadline. EDF compares absolute deadlines.",
        whyItMatters:
          "Two tasks with different relative deadlines, released at different times, can have surprisingly close absolute deadlines. EDF needs the absolute version to choose correctly.",
        signalsToWatch: ["task_started", "task_completed", "observedDurationMs"],
        studentTakeaway:
          "Relative deadline is a duration; absolute deadline is a clock time. EDF orders by absolute deadline.",
      },
      {
        title: "Due-task selection under EDF",
        summary:
          "Among all ready tasks, EDF selects the one with the earliest absolute deadline. Note NetworkTask's deadline here is tightened to 150 ms (vs 200 ms in the baseline), making the EDF ordering more interesting.",
        whyItMatters:
          "EDF dynamically reorders work as deadlines approach, so the selected task can change step to step even though the config is fixed.",
        signalsToWatch: ["schedulerMode", "task_started", "deadlineMisses"],
        studentTakeaway:
          "EDF's choice depends on the current moment, because absolute deadlines move with each release.",
      },
      {
        title: "EDF vs static priority, and overload limits",
        summary:
          "On a non-overloaded system EDF can meet deadline sets that static priority misses. But EDF has no special advantage under overload: when total demand exceeds capacity, EDF can miss many deadlines and degrade unpredictably.",
        whyItMatters:
          "A common misconception is that EDF is 'always best'. Its guarantees assume the task set is schedulable; overload breaks that assumption for any policy.",
        signalsToWatch: ["deadlineMisses", "deadlineMissedEvents", "runtimeHealth"],
        studentTakeaway:
          "EDF is optimal only when the workload fits. No scheduler can invent CPU time that does not exist.",
      },
      {
        title: "Worked example",
        summary:
          "Relative deadlines: ControlTask 80 ms, NetworkTask 150 ms, LoggerTask 400 ms. If all three release at t = 0, their absolute deadlines are 80 ms, 150 ms, and 400 ms, so EDF selects ControlTask, then NetworkTask, then LoggerTask.",
        whyItMatters:
          "Here EDF order happens to match the priority order, which is a feature: with light loads, well-chosen priorities and EDF can agree.",
        signalsToWatch: ["task_started", "task_completed", "deadlineMisses"],
        studentTakeaway:
          "When deadlines line up with importance, EDF and priority can produce the same order — the policies differ most under pressure.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: with these light execution times, expect runtimeHealth NORMAL and deadlineMisses of 0. Expect the EDF selection order at simultaneous releases to follow 80 ms, then 150 ms, then 400 ms.",
        whyItMatters:
          "Predicting the order from absolute deadlines is the exercise; the health verdict is almost incidental at this load.",
        signalsToWatch: ["runtimeHealth", "deadlineMisses", "schedulerMode"],
        studentTakeaway:
          "If you can predict EDF's order from the deadline numbers, you understand the policy.",
      },
      {
        title: "Read the results",
        summary:
          "Confirm schedulerMode is 'earliest_deadline_first'. Inspect task_started ordering at near-simultaneous releases and check taskMetrics deadlineMisses. Compare the order against what static priority produced in step 2.",
        whyItMatters:
          "The takeaway is the relationship between deadline values and selection order, observed directly in the event stream.",
        signalsToWatch: ["schedulerMode", "task_started", "deadlineMisses", "deadlineMissedEvents"],
        studentTakeaway:
          "EDF ties scheduling decisions directly to timing constraints — you can read the deadlines and predict the order.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: ControlTask (relative deadline 80 ms) is released at t = 100 ms. NetworkTask (relative deadline 150 ms) is released at t = 0. Both are ready at t = 100 ms. Which does EDF select?",
        whyItMatters:
          "It forces the use of absolute deadlines rather than relative ones, which is exactly where beginners slip.",
        signalsToWatch: ["schedulerMode", "task_started"],
        studentTakeaway:
          "NetworkTask. Its absolute deadline is 0 + 150 = 150 ms, which is earlier than ControlTask's 100 + 80 = 180 ms. Always compare absolute deadlines, not relative ones.",
      },
    ],
  },

  queue_overflow: {
    headline:
      "Step 4 of 9. No fault is injected here. Messages are lost purely because a bounded queue fills up faster than its consumer can drain it.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "Do Normal Runtime first so you know what message_sent, message_received, and message_dropped events are. This scenario is about queue capacity, not scheduling.",
        whyItMatters:
          "Queue overflow is a memory/throughput problem. Confusing it with a scheduling or injected fault leads to the wrong fix.",
        signalsToWatch: ["message_sent", "message_received", "message_dropped"],
        studentTakeaway:
          "This is the first scenario where the interesting signal is messages, not task timing.",
      },
      {
        title: "Producers, consumer, and bounded memory",
        summary:
          "In this simulator ControlTask and NetworkTask produce messages addressed to LoggerTask, which is the only consumer. Each task queue is bounded: it holds at most queue_limit messages, because embedded memory is finite.",
        whyItMatters:
          "A bounded queue cannot grow to absorb a burst. Once it is full, new messages must be dropped — there is nowhere to put them.",
        signalsToWatch: ["message_sent", "message_received", "messageSummary"],
        studentTakeaway:
          "Bounded memory is the whole reason drops exist. An unbounded queue would just defer the problem until you ran out of RAM.",
      },
      {
        title: "Producer/consumer rates and backpressure",
        summary:
          "Drops happen when the arrival rate exceeds the drain rate for long enough to fill the queue. Backpressure is any mechanism that slows producers when the queue is full; this simulator has none, so it simply drops.",
        whyItMatters:
          "The fix for overflow is almost never 'a bigger queue' — it is matching rates, draining faster, or applying backpressure.",
        signalsToWatch: ["queueFullDrops", "messageSummary", "rootCauses"],
        studentTakeaway:
          "Overflow is a rate mismatch made visible. A bigger buffer only delays a sustained mismatch.",
      },
      {
        title: "Worked example",
        summary:
          "queue_overflow config: ControlTask period 50 ms (~20 messages/s), NetworkTask period 75 ms (~13 messages/s), so ~33 messages/s arrive at LoggerTask. LoggerTask has queue_limit 3 and period 1000 ms, so it drains only about once per second. The queue fills almost immediately and most messages are dropped with reason 'queue_full'.",
        whyItMatters:
          "Roughly 33 arrivals per second into a 3-slot queue drained once per second means the queue is full nearly all the time — overflow is the expected, designed-in outcome here.",
        signalsToWatch: ["queueFullDrops", "message_dropped", "messageSummary"],
        studentTakeaway:
          "Compute arrival rate vs drain rate vs capacity, and the drop count stops being surprising.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: expect a large message_dropped count, queueFullDrops making up essentially 100% of drops, faultInjectedDrops of 0 (no fault is configured), and runtimeHealth WARNING because reliability is degraded even though tasks themselves run.",
        whyItMatters:
          "Predicting that drops are queue_full and not fault-injected is the central distinction this scenario teaches.",
        signalsToWatch: ["queueFullDrops", "faultInjectedDrops", "runtimeHealth"],
        studentTakeaway:
          "Predict the drop reason, not just the drop count — the reason is what determines the fix.",
      },
      {
        title: "Read the results",
        summary:
          "Open messageSummary: compare sent vs received vs dropped, and confirm queueFullDrops is high while faultInjectedDrops is 0. Check runtimeHealth (expect WARNING) and rootCauses for a queue-pressure message. Task deadlineMisses should stay low.",
        whyItMatters:
          "messageSummary splitting drops into queueFullDrops vs faultInjectedDrops is exactly how you prove the cause was capacity, not injection.",
        signalsToWatch: ["messageSummary", "queueFullDrops", "faultInjectedDrops", "runtimeHealth"],
        studentTakeaway:
          "queueFullDrops > 0 with faultInjectedDrops == 0 is the signature of pure capacity overflow.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: would raising LoggerTask's queue_limit from 3 to 30 eliminate the drops in this scenario?",
        whyItMatters:
          "It checks whether you see overflow as a sustained rate mismatch rather than a one-time buffer-size problem.",
        signalsToWatch: ["queueFullDrops", "messageSummary"],
        studentTakeaway:
          "No. With ~33 arrivals/s and ~1 drain/s, a 30-slot queue fills in about a second and then drops again. A sustained rate mismatch needs faster draining or backpressure, not just a bigger buffer.",
      },
    ],
  },

  dropped_messages: {
    headline:
      "Step 5 of 9. Here drops are deliberately injected to simulate unreliable delivery — a different cause than the capacity overflow of step 4.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "Do Queue Overflow first. You must be able to tell queueFullDrops from faultInjectedDrops, because this scenario produces the second kind on purpose.",
        whyItMatters:
          "Without the overflow contrast, an injected drop looks identical to a capacity drop in the raw count.",
        signalsToWatch: ["faultInjectedDrops", "queueFullDrops"],
        studentTakeaway:
          "Same symptom (a message vanishes), different cause (unreliable link vs full queue).",
      },
      {
        title: "Injected loss vs queue-full loss",
        summary:
          "The fault injector targets LoggerTask and, after start_after_ms 5000, drops messages with drop_probability_percent 50. These produce message_dropped events with reason 'fault_injected_drop', counted by the analyzer as faultInjectedDrops — distinct from 'queue_full' drops.",
        whyItMatters:
          "The two causes call for different fixes: capacity overflow needs rate/back­pressure work; unreliable delivery needs reliability mechanisms.",
        signalsToWatch: ["faultInjectedDrops", "queueFullDrops", "message_dropped"],
        studentTakeaway:
          "Read the drop reason, not just the count: 'fault_injected_drop' means the link was unreliable, not that the queue was full.",
      },
      {
        title: "Reliability: retries and idempotency",
        summary:
          "When delivery is unreliable, systems add retries (re-send lost messages) and idempotency (make a repeated message safe to process twice). Retries fight loss; idempotency keeps retries from causing duplicate side effects.",
        whyItMatters:
          "Retries alone can turn one lost message into several duplicated actions. Reliable systems usually need both ideas together.",
        signalsToWatch: ["faultInjectedDrops", "message_sent", "message_received"],
        studentTakeaway:
          "Retry to recover from loss; make handlers idempotent so recovery does not create new bugs.",
      },
      {
        title: "Worked example",
        summary:
          "Fault config: target LoggerTask, start_after_ms 5000, drop_probability_percent 50. For the first 5 seconds delivery is clean; after that, roughly half of the messages bound for LoggerTask are dropped as 'fault_injected_drop'. The drop is probabilistic, so exact counts vary run to run.",
        whyItMatters:
          "A timed, probabilistic fault is reproducible in shape (clean, then ~50% loss) even though the precise numbers differ — useful for studying reliability without nondeterministic chaos.",
        signalsToWatch: ["faultInjectedDrops", "message_dropped", "messageSummary"],
        studentTakeaway:
          "Expect a clean opening phase, then a steady fraction of injected drops — a different fingerprint than overflow's constant-full queue.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: expect faultInjectedDrops > 0 and queueFullDrops near 0 (the queues are not undersized here), a fault_injected event marking the start, and runtimeHealth WARNING from degraded reliability.",
        whyItMatters:
          "Predicting that faultInjectedDrops dominates (the mirror image of step 4) confirms you have internalized the two drop causes.",
        signalsToWatch: ["faultInjectedDrops", "queueFullDrops", "runtimeHealth"],
        studentTakeaway:
          "This run should look like the inverse of queue_overflow in the drop breakdown.",
      },
      {
        title: "Read the results",
        summary:
          "Find the fault_injected event (fault_type dropped_messages). In messageSummary, confirm faultInjectedDrops is high and queueFullDrops is low. Check rootCauses for a dropped-message cause and runtimeHealth for WARNING.",
        whyItMatters:
          "The fault_injected event plus the faultInjectedDrops field together prove the loss was simulated, not capacity-driven.",
        signalsToWatch: ["fault_injected", "faultInjectedDrops", "queueFullDrops", "rootCauses"],
        studentTakeaway:
          "An explicit fault_injected event plus faultInjectedDrops is the signature of injected loss.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: a run shows 400 faultInjectedDrops and 0 queueFullDrops. Is the right fix a larger queue?",
        whyItMatters:
          "It checks that you map the fix to the cause rather than reaching for the buffer-size lever again.",
        signalsToWatch: ["faultInjectedDrops", "queueFullDrops"],
        studentTakeaway:
          "No. Zero queueFullDrops means capacity was fine. The loss is unreliable delivery, so the fix is reliability (retries plus idempotency), not a bigger queue.",
      },
    ],
  },

  slow_task: {
    headline:
      "Step 6 of 9. A task is forced to take far longer than its budget after 5 seconds, so it blows past its deadline on every run that follows.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "Do Normal Runtime first so you remember ControlTask's budget: execution_time_ms 10 against deadline_ms 80 (70 ms of slack). This scenario destroys that slack.",
        whyItMatters:
          "A deadline miss only makes sense relative to the healthy budget you saw in the baseline.",
        signalsToWatch: ["deadlineMisses", "avgDurationMs"],
        studentTakeaway:
          "Keep the baseline budget in mind; the fault is defined by how far it exceeds it.",
      },
      {
        title: "Execution budget and lateness",
        summary:
          "Execution budget is how long a task may run (its execution_time_ms) while still fitting inside deadline_ms. Lateness is how far observed_duration_ms overshoots the deadline. A deadline miss is recorded as the deadline_missed field on task_completed.",
        whyItMatters:
          "There is no separate deadline_missed event — misses live in the task_completed event's deadline_missed boolean and deadline_miss_count, aggregated as deadlineMisses.",
        signalsToWatch: ["task_completed", "deadlineMisses", "deadlineMissedEvents"],
        studentTakeaway:
          "A miss is a field on task_completed, not its own event. Read deadlineMisses to count them.",
      },
      {
        title: "Cascading timing pressure",
        summary:
          "When a task's execution time exceeds its own period, it cannot finish one release before the next is due. Late work piles onto later work, so one slow task can degrade timing for the whole schedule.",
        whyItMatters:
          "Real-time failures often cascade: the first miss makes the next more likely. Catching the first one early matters.",
        signalsToWatch: ["deadlineMisses", "runtime_summary", "runtimeHealth"],
        studentTakeaway:
          "When execution time exceeds the period, misses compound instead of staying isolated.",
      },
      {
        title: "Worked example",
        summary:
          "Fault: target ControlTask, start_after_ms 5000, extra_execution_time_ms 120. After 5 s each ControlTask run takes about 10 + 120 = 130 ms. Its deadline is 80 ms, so 130 > 80 means a miss every cycle. Worse, 130 ms exceeds the 100 ms period, so runs overrun back-to-back.",
        whyItMatters:
          "130 ms of work against an 80 ms deadline and a 100 ms period is a double violation — too late and too slow to keep up — which is why health goes beyond WARNING.",
        signalsToWatch: ["deadlineMisses", "avgDurationMs", "maxDurationMs"],
        studentTakeaway:
          "Once injected duration exceeds both deadline and period, misses become continuous, not occasional.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: ControlTask shows 0 deadlineMisses for the first ~5 s, then a rising deadlineMisses count, avgDurationMs climbing toward ~130 ms, and runtimeHealth UNSTABLE once total misses reach the analyzer's threshold (3 or more).",
        whyItMatters:
          "Predicting the clean-then-failing shape, and the WARNING-to-UNSTABLE transition, ties the config numbers to the health verdict.",
        signalsToWatch: ["deadlineMisses", "avgDurationMs", "runtimeHealth"],
        studentTakeaway:
          "Expect a clean opening phase followed by sustained misses — the fault is timed, not present from t = 0.",
      },
      {
        title: "Read the results",
        summary:
          "Find the fault_injected event (fault_type slow_task). In taskMetrics for ControlTask, read deadlineMisses and avgDurationMs/maxDurationMs. Confirm runtimeHealth is UNSTABLE and rootCauses names the deadline problem.",
        whyItMatters:
          "ControlTask's avgDurationMs moving from ~10 ms to ~130 ms is the direct, measurable fingerprint of this fault.",
        signalsToWatch: ["task_completed", "deadlineMisses", "avgDurationMs", "runtimeHealth"],
        studentTakeaway:
          "Per-task metrics localize the fault: the spike is in ControlTask's duration and misses specifically.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: the run is configured for 30 s and the fault starts at 5000 ms. Roughly what fraction of the run should ControlTask appear healthy?",
        whyItMatters:
          "It reinforces that the fault is time-gated by start_after_ms, not active for the entire run.",
        signalsToWatch: ["deadlineMisses", "observedDurationMs"],
        studentTakeaway:
          "About the first 5 of 30 seconds (~1/6 of the run) is healthy; misses accumulate across the remaining ~25 s.",
      },
    ],
  },

  cpu_spike: {
    headline:
      "Step 7 of 9. The same kind of timing fault as step 6, but aimed at a different task with a larger magnitude — a good lens for average vs maximum duration.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "Do Slow Task first. cpu_spike is mechanically the same injection (extra execution time after start_after_ms), so the new learning here is how to read it through duration metrics, not a new mechanism.",
        whyItMatters:
          "Knowing it is the same mechanism prevents the misconception that 'cpu_spike' is a separate, one-time event in this simulator.",
        signalsToWatch: ["avgDurationMs", "maxDurationMs", "deadlineMisses"],
        studentTakeaway:
          "cpu_spike and slow_task share an engine; only the target task and size differ.",
      },
      {
        title: "What this fault actually does here",
        summary:
          "Fault: target NetworkTask, start_after_ms 5000, extra_execution_time_ms 220. After 5 s every NetworkTask run takes about 20 + 220 = 240 ms against a 200 ms deadline. Important: this simulator applies the extra time on every run after the start time — it is not a single transient blip.",
        whyItMatters:
          "Being honest about the model matters: do not describe this as one isolated spike, because the runtime keeps adding 220 ms each cycle once active.",
        signalsToWatch: ["fault_injected", "task_completed", "deadlineMisses"],
        studentTakeaway:
          "In this simulator the 'spike' persists once it starts; the teaching value is in how a large per-run cost shows up in metrics.",
      },
      {
        title: "Average vs maximum duration",
        summary:
          "avgDurationMs blends the clean early runs (~20 ms) with the inflated later runs (~240 ms), so the average lands in between. maxDurationMs captures the worst single run. In real-time systems the maximum (worst case) often matters more than the average.",
        whyItMatters:
          "A reassuring average can hide deadline-breaking peaks. Worst-case timing is what determines whether deadlines are ever missed.",
        signalsToWatch: ["avgDurationMs", "maxDurationMs", "deadlineMissedEvents"],
        studentTakeaway:
          "Averages comfort; maxima warn. Always check maxDurationMs against the deadline, not just the average.",
      },
      {
        title: "Interpreting a timing anomaly",
        summary:
          "A gap between avgDurationMs and maxDurationMs is a signature of intermittent or phase-shifted load. Combined with a fault_injected event and rising deadlineMisses, it tells a clear story of when and how timing degraded.",
        whyItMatters:
          "Observability means reconstructing 'what happened and when' from telemetry. The avg/max gap plus the fault timestamp does exactly that.",
        signalsToWatch: ["avgDurationMs", "maxDurationMs", "fault_injected"],
        studentTakeaway:
          "The shape of the data (avg vs max, before vs after the fault timestamp) tells the story, not any single number.",
      },
      {
        title: "Worked example",
        summary:
          "NetworkTask period 250 ms, deadline 200 ms, base execution 20 ms. After the fault: ~240 ms per run > 200 ms deadline, so misses begin around the 5 s mark. Unlike ControlTask in slow_task, 240 ms is still under the 250 ms period, so runs do not overrun into each other as severely.",
        whyItMatters:
          "Comparing this to slow_task shows that the relationship between execution time, deadline, AND period decides whether misses also cascade.",
        signalsToWatch: ["deadlineMisses", "avgDurationMs", "maxDurationMs"],
        studentTakeaway:
          "240 ms beats the deadline (200) but fits the period (250): deadlines are missed without the back-to-back overrun seen in slow_task.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: NetworkTask clean for ~5 s, then maxDurationMs jumping toward ~240 ms while avgDurationMs rises more gently, deadlineMisses climbing, and runtimeHealth reaching UNSTABLE once misses pass the threshold.",
        whyItMatters:
          "Predicting that max moves faster than average is the heart of this scenario.",
        signalsToWatch: ["avgDurationMs", "maxDurationMs", "runtimeHealth"],
        studentTakeaway:
          "Expect the maximum to react sharply and the average to drift up — the gap between them is the lesson.",
      },
      {
        title: "Read the results",
        summary:
          "Locate the fault_injected event (fault_type cpu_spike). In taskMetrics for NetworkTask, compare avgDurationMs with maxDurationMs and read deadlineMisses. Confirm runtimeHealth and check rootCauses.",
        whyItMatters:
          "Reading avg and max side by side, anchored to the fault timestamp, is the concrete observability skill here.",
        signalsToWatch: ["task_completed", "avgDurationMs", "maxDurationMs", "deadlineMisses"],
        studentTakeaway:
          "The avg/max gap on NetworkTask, starting after the fault timestamp, is this scenario's fingerprint.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: NetworkTask reports avgDurationMs 130 and maxDurationMs 240 with a 200 ms deadline. Could deadlines be missed even though the average is under 200?",
        whyItMatters:
          "It directly tests the average-vs-maximum lesson against a deadline.",
        signalsToWatch: ["avgDurationMs", "maxDurationMs", "deadlineMisses"],
        studentTakeaway:
          "Yes. Every run near the 240 ms maximum exceeds the 200 ms deadline; the sub-200 average just reflects the clean early runs being blended in.",
      },
    ],
  },

  task_crash: {
    headline:
      "Step 8 of 9. One task is forced into a failed state and then skipped on its later due times, while the rest of the runtime keeps going.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "Do Normal Runtime and Slow Task first. You should be comfortable reading per-task telemetry, because the key signals here are task-scoped: task_failed and task_skipped.",
        whyItMatters:
          "Failure isolation only makes sense once you can see that one task's events change while the others' do not.",
        signalsToWatch: ["task_failed", "task_skipped", "runtimeHealth"],
        studentTakeaway:
          "This scenario is read per task: one task fails while the others continue.",
      },
      {
        title: "Task failure vs process failure",
        summary:
          "A process failure crashes the whole program — everything stops. A task failure means a single task enters a failed state while the runtime, scheduler, and other tasks keep running. This simulator models the second kind.",
        whyItMatters:
          "Robust embedded systems aim to contain failures to one subsystem so the device degrades gracefully instead of going completely dark.",
        signalsToWatch: ["task_failed", "runtime_summary", "runtimeHealth"],
        studentTakeaway:
          "Process crash = everything stops; task crash = one subsystem stops while the system limps on.",
      },
      {
        title: "Failure isolation and skipped work",
        summary:
          "After the fault (target NetworkTask, start_after_ms 5000), NetworkTask emits task_failed once, then task_skipped on each later due time because the scheduler passes over a failed task. ControlTask and LoggerTask keep running normally.",
        whyItMatters:
          "task_skipped events are the visible evidence of degraded-but-alive operation: the work NetworkTask should have done is simply not happening.",
        signalsToWatch: ["task_failed", "task_skipped", "runtime_summary"],
        studentTakeaway:
          "One task_failed marks the crash; repeated task_skipped events show the ongoing missing work.",
      },
      {
        title: "Worked example",
        summary:
          "NetworkTask has period 250 ms over a 30 s run, so it would normally run about 120 times. The crash fires at 5000 ms (after roughly 20 runs), so expect about one task_failed event followed by task_skipped events for most of the remaining ~100 due times.",
        whyItMatters:
          "Quantifying the skipped runs turns 'it crashed' into a measurable loss of service you can see in the counts.",
        signalsToWatch: ["task_failed", "task_skipped", "runs"],
        studentTakeaway:
          "Expect a single failure followed by many skips — the skip count measures how much work was lost.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: exactly one task_failed for NetworkTask, many task_skipped events after 5 s, ControlTask and LoggerTask unaffected, and runtimeHealth UNSTABLE because a task is down. Do not expect a process-level crash.",
        whyItMatters:
          "Predicting that the OTHER tasks stay healthy is the real test of the isolation concept.",
        signalsToWatch: ["task_failed", "task_skipped", "runtimeHealth"],
        studentTakeaway:
          "The interesting prediction is what stays healthy, not just what fails.",
      },
      {
        title: "Read the results",
        summary:
          "Find the fault_injected event (fault_type task_crash) and the single task_failed for NetworkTask, then the run of task_skipped events. Confirm in taskMetrics that ControlTask and LoggerTask kept running, and check runtimeHealth.",
        whyItMatters:
          "Seeing healthy ControlTask/LoggerTask metrics alongside a failed NetworkTask is the direct evidence of failure isolation.",
        signalsToWatch: ["task_failed", "task_skipped", "taskMetrics", "runtimeHealth"],
        studentTakeaway:
          "Confirm both halves: NetworkTask down, the others still running — that is isolation made visible.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: after NetworkTask crashes, ControlTask keeps completing on time. Does that mean the run is healthy overall?",
        whyItMatters:
          "It separates per-task health from the system-wide verdict, reinforcing the COMPLETED-vs-health idea from step 1.",
        signalsToWatch: ["runtimeHealth", "task_failed"],
        studentTakeaway:
          "No. One task running well does not offset another being down; the analyzer reports UNSTABLE because NetworkTask failed and its work is being skipped.",
      },
    ],
  },

  watchdog_slow_task: {
    headline:
      "Step 9 of 9. The capstone: a slow-task fault plus a watchdog that detects repeated misses, times out, and triggers simulated recovery.",
    conceptModules: [
      {
        title: "Prerequisite",
        summary:
          "Do Slow Task first — this scenario reuses the exact same fault (ControlTask, start_after_ms 5000, extra 120 ms) and adds watchdog monitoring on top.",
        whyItMatters:
          "The watchdog is only meaningful once you understand the deadline misses it is reacting to.",
        signalsToWatch: ["deadlineMisses", "watchdog_timeout", "task_recovered"],
        studentTakeaway:
          "Same fault as slow_task, plus a supervisor watching for trouble.",
      },
      {
        title: "Liveness and the watchdog idea",
        summary:
          "Liveness means a task is still making progress on time. A watchdog is a supervisor that periodically checks liveness and acts when a task looks stuck or repeatedly late, instead of letting it fail silently forever.",
        whyItMatters:
          "Watchdogs are standard in real embedded systems because a hung critical task with no supervisor can leave a device dangerously unresponsive.",
        signalsToWatch: ["watchdog_timeout", "task_recovered", "runtimeHealth"],
        studentTakeaway:
          "A watchdog turns a silent, ongoing failure into a detected event with a response.",
      },
      {
        title: "Consecutive misses and the timeout threshold",
        summary:
          "Watchdog config: max_consecutive_deadline_misses 3, recovery_enabled true, recovery_cooldown_ms 1000. The watchdog inspects a task right after each of its executions and fires a watchdog_timeout only after 3 consecutive deadline misses — isolated single misses do not trip it.",
        whyItMatters:
          "Requiring consecutive misses reduces false positives: one unlucky late run should not trigger a disruptive recovery.",
        signalsToWatch: ["watchdog_timeout", "deadlineMisses", "runtime_summary"],
        studentTakeaway:
          "The threshold (3 in a row) is a deliberate tradeoff between catching real failures and avoiding false alarms.",
      },
      {
        title: "Recovery, cooldown, and limits",
        summary:
          "After a timeout, recovery emits a task_recovered event (a simulated reset), and recovery_cooldown_ms 1000 prevents re-triggering for 1 s. Because the underlying slow_task fault never stops, recovery does not cure the root cause — misses can resume after the cooldown.",
        whyItMatters:
          "A watchdog restores liveness but does not fix the bug. Repeated recover/relapse cycles are a signal to fix the actual cause.",
        signalsToWatch: ["task_recovered", "watchdog_timeout", "runtime_summary"],
        studentTakeaway:
          "Recovery buys time, not a cure; if the fault persists, the watchdog will keep firing.",
      },
      {
        title: "Worked example",
        summary:
          "After 5 s ControlTask takes ~130 ms against an 80 ms deadline, missing every cycle. The watchdog inspects ControlTask after each of its executions, so once 3 consecutive misses accumulate it fires a watchdog_timeout, then emits task_recovered, respects the 1 s cooldown, and likely repeats as misses continue.",
        whyItMatters:
          "Tying the after-each-execution check, the 3-miss threshold, and the 1 s cooldown together lets you predict the rough rhythm of timeout/recovery events.",
        signalsToWatch: ["watchdog_timeout", "task_recovered", "deadlineMisses"],
        studentTakeaway:
          "Expect a repeating timeout-then-recover pattern, paced by the cooldown, for as long as the fault is active.",
      },
      {
        title: "Before you run: predict",
        summary:
          "Prediction: clean for ~5 s, then ControlTask deadlineMisses rising, at least one watchdog_timeout once 3 misses stack up, one or more task_recovered events, and runtimeHealth UNSTABLE because the underlying fault persists.",
        whyItMatters:
          "Predicting that recovery happens AND health stays UNSTABLE captures the watchdog's real (limited) role.",
        signalsToWatch: ["watchdog_timeout", "task_recovered", "runtimeHealth"],
        studentTakeaway:
          "Recovery events and an UNSTABLE verdict can — and here should — coexist.",
      },
      {
        title: "Read the results",
        summary:
          "Trace the order: fault_injected (slow_task) → rising ControlTask deadlineMisses → watchdog_timeout → task_recovered, possibly repeating. Confirm the watchdog fired only after consecutive misses and check runtimeHealth and rootCauses.",
        whyItMatters:
          "The event ordering is the whole story: cause, detection, response, and (because the cause persists) relapse.",
        signalsToWatch: ["fault_injected", "watchdog_timeout", "task_recovered", "deadlineMisses"],
        studentTakeaway:
          "Read events in time order to see the full loop: fault, misses, timeout, recovery, repeat.",
      },
      {
        title: "Check your understanding",
        summary:
          "Question: a task_recovered event appears, yet runtimeHealth is still UNSTABLE. Is that a contradiction?",
        whyItMatters:
          "It tests the most important watchdog misconception: that recovery equals a fixed system.",
        signalsToWatch: ["task_recovered", "runtimeHealth", "watchdog_timeout"],
        studentTakeaway:
          "No. Recovery restores liveness but the slow_task fault is still active, so misses continue and the analyzer correctly keeps the verdict UNSTABLE.",
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
