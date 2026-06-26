/*
 * Lesson catalog — the learning-first backbone of MiniRTOS Playground.
 *
 * This is frontend-only metadata. The backend already serves scenario metadata
 * (id, name, scheduler mode, difficulty, concept, description, teaches,
 * expectedSignals) from GET /api/scenarios, so lessons only need to *reference*
 * a scenario by id rather than redefine it. Keeping lessons here avoids adding
 * backend complexity for this phase.
 *
 * The shape is intentionally forward-compatible: fields like quizzes, progress
 * tracking, or guided labs can be layered on later without restructuring.
 */

export type LessonLevel = "beginner" | "intermediate";

export interface Lesson {
  /** Stable kebab-case id used in the /learn/:lessonId route. */
  id: string;
  /** Zero-based module number for ordering and display ("Module 0"). */
  moduleNumber: number;
  title: string;
  level: LessonLevel;
  estimatedMinutes: number;
  summary: string;
  learningObjectives: string[];
  /** Glossary-aligned terms a beginner meets in this lesson. */
  keyTerms: string[];
  /** A single plain-English analogy that anchors the concept. */
  analogy: string;
  /** 2-4 short paragraphs explaining the concept without C++ syntax. */
  conceptExplanation: string[];
  /** Primary scenario this lesson maps to (must be a backend scenario id). */
  scenarioId: string;
  /** Human-readable scenario name (matches backend ScenarioService). */
  scenarioName: string;
  /** Other scenarios that reinforce the same concept. */
  relatedScenarioIds: string[];
  beforeRunChecklist: string[];
  whatToObserve: string[];
  expectedOutcome: string;
  analysisExplanation: string;
  /** Next lesson in the path, or null for the final lesson. */
  nextLessonId: string | null;
}

export const lessonCatalog: Lesson[] = [
  {
    id: "what-is-an-embedded-system",
    moduleNumber: 0,
    title: "What is an embedded system?",
    level: "beginner",
    estimatedMinutes: 6,
    summary:
      "Meet the tiny computers hidden inside everyday devices — what they do and why their timing matters.",
    learningObjectives: [
      "Describe what an embedded system is in plain language",
      "Give three real-world examples of embedded systems",
      "Explain why an embedded system reacts to inputs and controls outputs",
    ],
    keyTerms: ["Embedded system", "Task", "Real-time system"],
    analogy:
      "Think of the computer inside a microwave. It is not for browsing the web — it has one job: watch the buttons and timer, then control the heating element safely.",
    conceptExplanation: [
      "An embedded system is a small computer built into a larger device to do one dedicated job. It is not a general-purpose laptop — it is the brain inside a thermostat, a car's braking system, a drone, an insulin pump, or a washing machine.",
      "Embedded systems follow a simple loop: they monitor inputs (sensors, buttons), make decisions, and control outputs (motors, heaters, screens, alerts). They do this continuously, often for years, without anyone restarting them.",
      "What makes them special is that timing matters. A medical monitor that reports a heartbeat two seconds late is dangerous even if it eventually reports it. This is why we study how these systems schedule and prioritize their work.",
    ],
    scenarioId: "normal",
    scenarioName: "Normal Runtime",
    relatedScenarioIds: [],
    beforeRunChecklist: [
      "You do not need to understand the code — you are watching behavior.",
      "Expect a calm, healthy run with no faults.",
      "Note that the simulator runs several small tasks over and over.",
    ],
    whatToObserve: [
      "The run completes with health NORMAL.",
      "Each task runs many times on a steady rhythm.",
      "No deadline misses, drops, or crashes appear.",
    ],
    expectedOutcome:
      "A healthy baseline run. This is what 'everything working' looks like, so you can recognize trouble later.",
    analysisExplanation:
      "The analyzer reports NORMAL health. Use this run as your reference point — every later lesson introduces one problem and asks how the picture changes.",
    nextLessonId: "what-is-an-rtos",
  },
  {
    id: "what-is-an-rtos",
    moduleNumber: 1,
    title: "What is an RTOS?",
    level: "beginner",
    estimatedMinutes: 7,
    summary:
      "How a real-time operating system helps a small device juggle several time-sensitive jobs predictably.",
    learningObjectives: [
      "Explain what an RTOS does for an embedded device",
      "Define a task and a scheduler in plain language",
      "Explain why predictable timing matters more than raw speed",
    ],
    keyTerms: ["RTOS", "Task", "Scheduler", "Real-time system"],
    analogy:
      "An RTOS is like a kitchen expediter during a dinner rush: many orders arrive at once, and someone has to decide what gets cooked next so nothing burns and no table waits too long.",
    conceptExplanation: [
      "A Real-Time Operating System (RTOS) is software that lets a small device run several jobs at once in a predictable order. Instead of one giant program doing everything in sequence, the work is split into independent tasks.",
      "A scheduler decides which task runs next. That single decision — who goes now — is the heart of an RTOS, and different scheduling rules lead to very different behavior.",
      "An RTOS does not try to be the fastest. It tries to be predictable: the same input should produce the same timely response every time. That predictability is what safety-critical devices depend on.",
    ],
    scenarioId: "priority_scheduler",
    scenarioName: "Priority Scheduler",
    relatedScenarioIds: ["normal"],
    beforeRunChecklist: [
      "Recall the calm baseline from Module 0.",
      "Notice that several tasks share one CPU here.",
      "The scheduler, not the tasks, decides the order.",
    ],
    whatToObserve: [
      "Multiple tasks take turns on a single timeline.",
      "The run stays healthy even with several tasks active.",
      "Task order follows a rule, not randomness.",
    ],
    expectedOutcome:
      "A healthy run where the scheduler coordinates several tasks. You will see order emerge from a rule.",
    analysisExplanation:
      "The analyzer shows NORMAL health and a scheduler mode. The takeaway is that an RTOS keeps multiple tasks predictable — the next lessons explore the rules it uses.",
    nextLessonId: "tasks-priorities-and-preemption",
  },
  {
    id: "tasks-priorities-and-preemption",
    moduleNumber: 2,
    title: "Tasks, priorities, and preemption",
    level: "beginner",
    estimatedMinutes: 8,
    summary:
      "Why some tasks are more important than others, and how a high-priority task can cut ahead of a lower one.",
    learningObjectives: [
      "Define a task as an independent unit of work",
      "Explain what priority means and why lower-number-is-higher here",
      "Describe preemption with a real-world analogy",
    ],
    keyTerms: ["Task", "Priority", "Preemption", "Scheduler"],
    analogy:
      "Hospital triage: a patient with a life-threatening emergency is seen before someone with a minor cut, even if the minor case arrived first. Priority decides who is treated next.",
    conceptExplanation: [
      "A task is an independent unit of work — like 'read the sensor' or 'log the data'. Each task runs over and over on its own schedule.",
      "Priority ranks how important each task is. In this simulator a lower priority number means higher importance, so a task with priority 1 outranks one with priority 2.",
      "Preemption is when a more important task interrupts a less important one that is currently running, so the urgent work happens first. This is how critical jobs stay responsive even when the system is busy.",
      "The trade-off: always favoring high-priority work can starve low-priority work, meaning it rarely gets a turn. Good real-time design balances responsiveness against fairness.",
    ],
    scenarioId: "priority_scheduler",
    scenarioName: "Priority Scheduler",
    relatedScenarioIds: ["normal"],
    beforeRunChecklist: [
      "Remember: lower priority number = more important.",
      "Predict which task should run first when several are ready.",
      "Compare the order to a plain take-turns approach.",
    ],
    whatToObserve: [
      "The highest-priority ready task is chosen first.",
      "Lower-priority tasks wait their turn.",
      "Health stays NORMAL — priority changes order, not safety here.",
    ],
    expectedOutcome:
      "A healthy run where task order follows priority. You should be able to predict who runs next.",
    analysisExplanation:
      "Health is NORMAL, but the event order differs from simple round-robin. The lesson lives in the ordering, not the health verdict.",
    nextLessonId: "deadlines-and-missed-deadlines",
  },
  {
    id: "deadlines-and-missed-deadlines",
    moduleNumber: 3,
    title: "Deadlines and missed deadlines",
    level: "intermediate",
    estimatedMinutes: 9,
    summary:
      "Real-time systems are judged on finishing on time — not just finishing. See what a missed deadline looks like.",
    learningObjectives: [
      "Explain the difference between 'done' and 'done on time'",
      "Define a deadline and a deadline miss",
      "Connect a slow task to a cascade of missed deadlines",
    ],
    keyTerms: ["Deadline", "Task", "Real-time system", "Health status"],
    analogy:
      "A heart monitor must report each beat within a fixed window. Reporting it late is not 'a little slow' — it can mean a missed alarm. The deadline is part of being correct.",
    conceptExplanation: [
      "In a real-time system, every task has a deadline: the latest moment its work may finish. Meeting the deadline is part of being correct, not a bonus.",
      "A deadline miss happens when a task takes longer than its allotted window. One miss can be unlucky; repeated misses signal a real problem.",
      "When a task runs slower than expected, late work piles onto the next round of work. This cascade is why a single slow task can destabilize a whole schedule.",
      "The Earliest Deadline First scheduler tackles this by always running the task whose deadline is closest — a timing-aware way to decide what matters most right now.",
    ],
    scenarioId: "deadline_scheduler",
    scenarioName: "Earliest Deadline First Scheduler",
    relatedScenarioIds: ["slow_task"],
    beforeRunChecklist: [
      "Run the deadline scheduler first to see timing-aware ordering.",
      "Then run the slow-task scenario to see deadlines actually missed.",
      "Predict when misses begin (a fault starts partway through the run).",
    ],
    whatToObserve: [
      "Under EDF, the task with the nearest deadline runs first.",
      "In the slow-task run, deadline misses begin after the fault starts.",
      "Health moves from NORMAL toward WARNING or UNSTABLE as misses pile up.",
    ],
    expectedOutcome:
      "The deadline scheduler stays healthy; the slow-task run shows mounting deadline misses and degraded health.",
    analysisExplanation:
      "Watch the per-task deadline-miss count and average duration climb after the fault. Health drops because work is finishing late, even though the program never crashed.",
    nextLessonId: "queues-and-message-passing",
  },
  {
    id: "queues-and-message-passing",
    moduleNumber: 4,
    title: "Queues and message passing",
    level: "intermediate",
    estimatedMinutes: 9,
    summary:
      "How tasks talk to each other through queues — and what happens when messages arrive faster than they can be handled.",
    learningObjectives: [
      "Explain how tasks communicate using a queue",
      "Describe queue overflow and why messages get dropped",
      "Distinguish a full-queue drop from an injected (unreliable-link) drop",
    ],
    keyTerms: ["Queue", "Dropped message", "Task"],
    analogy:
      "A queue is like a mailbox with limited slots. If letters arrive faster than you empty it, the box fills up and the mail carrier has to turn new letters away.",
    conceptExplanation: [
      "Tasks rarely work alone — they pass messages to each other through a queue, a small waiting line held in memory. One task produces messages; another consumes them.",
      "Embedded memory is limited, so queues are bounded: they hold only so many messages. When a queue is full and a new message arrives, it is dropped — there is nowhere to put it.",
      "Queue overflow happens when producers are faster than the consumer for long enough to fill the queue. The fix is rarely 'a bigger queue' — it is matching the rates or draining faster.",
      "A different cause of loss is an unreliable link, where messages are dropped on purpose to simulate a flaky connection. Same symptom, different cause — and the analyzer separates the two.",
    ],
    scenarioId: "queue_overflow",
    scenarioName: "Queue Overflow",
    relatedScenarioIds: ["dropped_messages"],
    beforeRunChecklist: [
      "Run queue overflow first: drops come from a full queue.",
      "Then run dropped messages: drops are injected to mimic a flaky link.",
      "Predict which kind of drop dominates in each run.",
    ],
    whatToObserve: [
      "Many messages are dropped while tasks keep running.",
      "Queue overflow shows mostly queue-full drops.",
      "Dropped messages shows mostly fault-injected drops.",
    ],
    expectedOutcome:
      "Both runs report WARNING health with lots of dropped messages, but for different reasons you can read in the breakdown.",
    analysisExplanation:
      "Compare queue-full drops vs fault-injected drops in the message summary. The breakdown tells you the cause, and the cause determines the fix.",
    nextLessonId: "watchdogs-and-recovery",
  },
  {
    id: "watchdogs-and-recovery",
    moduleNumber: 5,
    title: "Watchdogs and recovery",
    level: "intermediate",
    estimatedMinutes: 8,
    summary:
      "A safety monitor that notices when a task is stuck or crashed and triggers a recovery.",
    learningObjectives: [
      "Explain what a watchdog does and why devices need one",
      "Distinguish a single task failing from the whole program crashing",
      "Explain why recovery restores liveness but does not fix the root cause",
    ],
    keyTerms: ["Watchdog", "Crash", "Task", "Health status"],
    analogy:
      "A watchdog is like a lifeguard watching swimmers. If someone stops moving, the lifeguard steps in. The lifeguard does not fix why they got tired — they just prevent disaster.",
    conceptExplanation: [
      "A watchdog is a supervisor that periodically checks whether tasks are still making progress. If a task gets stuck or repeatedly misses deadlines, the watchdog acts instead of letting it fail silently.",
      "A task crash means one task stops working while the rest of the system keeps running — very different from the whole program crashing. Good designs contain failures to one part so the device degrades gracefully.",
      "When the watchdog fires, it triggers a recovery (a simulated reset). But if the underlying fault is still active, the task will struggle again — recovery buys time, it does not cure the cause.",
    ],
    scenarioId: "watchdog_slow_task",
    scenarioName: "Watchdog Slow Task Recovery",
    relatedScenarioIds: ["task_crash"],
    beforeRunChecklist: [
      "Run the watchdog scenario: a slow task plus a monitor that reacts.",
      "Run the task-crash scenario: one task fails while others continue.",
      "Predict whether health returns to NORMAL after recovery.",
    ],
    whatToObserve: [
      "The watchdog fires only after repeated misses, not a single one.",
      "A recovery event appears, then the trouble can return.",
      "In the crash run, the other tasks keep working normally.",
    ],
    expectedOutcome:
      "Health stays UNSTABLE even though recovery happens, because the root-cause fault is still present.",
    analysisExplanation:
      "Trace the order: fault, repeated misses, watchdog timeout, recovery, repeat. Recovery and an UNSTABLE verdict can coexist — that is the key insight.",
    nextLessonId: "linux-vs-rtos-scheduling",
  },
  {
    id: "linux-vs-rtos-scheduling",
    moduleNumber: 6,
    title: "Linux scheduling vs RTOS scheduling",
    level: "intermediate",
    estimatedMinutes: 7,
    summary:
      "Why a general-purpose Linux scheduler and a real-time scheduler optimize for different things.",
    learningObjectives: [
      "Contrast fairness/throughput with predictability/timing guarantees",
      "Explain why your laptop feels fine but is not 'real-time'",
      "Describe when you would choose an RTOS over general-purpose Linux",
    ],
    keyTerms: ["Linux scheduler", "Scheduler", "RTOS", "Real-time system"],
    analogy:
      "A general-purpose scheduler is like a fair lunch line — everyone gets a turn. A real-time scheduler is like an emergency room — the most time-critical case is always handled first.",
    conceptExplanation: [
      "Linux uses a general-purpose scheduler (the CFS family) designed for fairness and throughput: keep everything responsive enough and use the CPU efficiently across many programs.",
      "An RTOS scheduler optimizes for predictability and timing guarantees instead. It will gladly be 'unfair' to make sure the most time-critical task always meets its deadline.",
      "Neither is better in general — they solve different problems. Your laptop runs Linux happily because nothing breaks if a window redraws a few milliseconds late. A flight controller cannot make that trade.",
    ],
    scenarioId: "priority_scheduler",
    scenarioName: "Priority Scheduler",
    relatedScenarioIds: ["deadline_scheduler"],
    beforeRunChecklist: [
      "Recall how the priority scheduler ordered tasks in Module 2.",
      "Think about what 'fairness' would change about that order.",
      "Predict which approach a safety-critical device should pick.",
    ],
    whatToObserve: [
      "The RTOS-style scheduler favors importance over fairness.",
      "Critical tasks run first and stay predictable.",
      "Order is determined by policy, not by who waited longest.",
    ],
    expectedOutcome:
      "A healthy run that highlights how a real-time scheduler trades fairness for predictable timing.",
    analysisExplanation:
      "There is no fault here — focus on ordering. The point is conceptual: real-time scheduling guarantees timing for what matters, where a fair scheduler would spread attention evenly.",
    nextLessonId: "reading-logs-and-analysis",
  },
  {
    id: "reading-logs-and-analysis",
    moduleNumber: 7,
    title: "Reading logs and analysis",
    level: "intermediate",
    estimatedMinutes: 8,
    summary:
      "Turn raw runtime logs and analyzer output into a clear story of what happened and why.",
    learningObjectives: [
      "Interpret health status, warnings, and missed deadlines",
      "Read the message summary to explain dropped messages",
      "Connect analyzer root causes back to the lesson concepts",
    ],
    keyTerms: ["Runtime log", "Analysis", "Health status", "Warning"],
    analogy:
      "Reading logs is like reading a flight recorder after a flight. You do not relive every second — you look for the moments that changed the outcome.",
    conceptExplanation: [
      "The simulator writes a runtime log: one line per event, such as a task finishing or a message dropping. Raw logs are precise but overwhelming, so we rarely read them line by line.",
      "The analyzer reads the whole log and produces a summary: an overall health status (NORMAL, WARNING, or UNSTABLE), counts of warnings and misses, and a short list of root causes.",
      "A key habit: a run that COMPLETED is not automatically healthy. COMPLETED just means the process finished. Health is the analyzer's separate verdict — always read it, not just the status.",
      "To investigate, start with health and root causes, then drill into per-task metrics or the message summary to confirm the story before opening the raw log.",
    ],
    scenarioId: "queue_overflow",
    scenarioName: "Queue Overflow",
    relatedScenarioIds: ["slow_task", "watchdog_slow_task"],
    beforeRunChecklist: [
      "Pick any recent completed run — or run a scenario now.",
      "Open the Beginner Summary tab before the raw logs.",
      "Try to explain the result out loud before reading the analysis.",
    ],
    whatToObserve: [
      "Health status and how it differs from the COMPLETED status.",
      "Warning, missed-deadline, and dropped-message counts.",
      "Root causes that name the underlying problem.",
    ],
    expectedOutcome:
      "You can read any run's summary and explain what happened, why it matters, and which concept it demonstrates.",
    analysisExplanation:
      "This lesson is the payoff: every panel on the Analysis page maps to a concept you have learned. Use the plain-English summaries to connect runtime behavior back to the idea behind it.",
    nextLessonId: null,
  },
];

export function getLessonById(lessonId: string): Lesson | undefined {
  return lessonCatalog.find((lesson) => lesson.id === lessonId);
}

/** First lesson that maps to a scenario (primary mapping wins over related). */
export function getLessonForScenario(scenarioId: string): Lesson | undefined {
  return (
    lessonCatalog.find((lesson) => lesson.scenarioId === scenarioId) ??
    lessonCatalog.find((lesson) =>
      lesson.relatedScenarioIds.includes(scenarioId)
    )
  );
}
