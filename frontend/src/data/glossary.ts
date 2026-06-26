/*
 * Glossary — beginner-friendly definitions for the embedded/RTOS terms used
 * across the platform.
 *
 * Each entry has:
 *   - term:    the canonical display name
 *   - short:   a tooltip definition kept under ~30 words, plain English, no
 *              dense OS jargon. Used by <TooltipTerm>.
 *   - full:    a slightly longer definition for the /glossary page.
 *   - category: loose grouping for future filtering (not required for display).
 *
 * Tooltip lookups are case-insensitive and also match a few common aliases
 * (e.g. "tasks" -> "Task") so the same data powers inline tooltips everywhere.
 */

export type GlossaryCategory =
  | "fundamentals"
  | "scheduling"
  | "messaging"
  | "reliability"
  | "observability";

export interface GlossaryEntry {
  term: string;
  short: string;
  full: string;
  category: GlossaryCategory;
  /** Extra lookup keys (lowercase) for tooltips, e.g. plurals. */
  aliases?: string[];
}

export const glossary: GlossaryEntry[] = [
  {
    term: "Embedded system",
    short:
      "A small computer built into a device to do one job, like the chip running a microwave or a car's brakes.",
    full: "An embedded system is a dedicated computer inside a larger device. Instead of running arbitrary apps like a laptop, it monitors inputs, makes decisions, and controls outputs for a single purpose — often for years without a restart.",
    category: "fundamentals",
    aliases: ["embedded systems", "embedded"],
  },
  {
    term: "RTOS",
    short:
      "A Real-Time Operating System: software that helps a small device run several time-sensitive tasks in a predictable order.",
    full: "A Real-Time Operating System (RTOS) coordinates multiple tasks on a small device so that time-critical work happens predictably. It emphasizes meeting deadlines over raw speed or fairness.",
    category: "fundamentals",
    aliases: ["real-time operating system"],
  },
  {
    term: "Task",
    short:
      "An independent unit of work the system runs over and over, such as reading a sensor or logging data.",
    full: "A task is a self-contained piece of work that runs repeatedly on its own schedule. Splitting a program into tasks lets an RTOS meet several timing requirements at once instead of doing everything in one long sequence.",
    category: "fundamentals",
    aliases: ["tasks"],
  },
  {
    term: "Scheduler",
    short:
      "The part of an RTOS that decides which task runs next when several are ready.",
    full: "The scheduler is the decision-maker that picks which ready task runs next. Different scheduling policies — round-robin, priority, or earliest-deadline-first — produce very different behavior from the same set of tasks.",
    category: "scheduling",
    aliases: ["scheduling"],
  },
  {
    term: "Priority",
    short:
      "A ranking of how important a task is. Here, a lower number means higher importance.",
    full: "Priority ranks tasks by importance so the scheduler can favor critical work. In this simulator a lower priority number means higher importance (priority 1 outranks priority 2).",
    category: "scheduling",
    aliases: ["priorities"],
  },
  {
    term: "Preemption",
    short:
      "When a more important task interrupts a less important one that is already running, so urgent work happens first.",
    full: "Preemption lets a higher-priority task pause a running lower-priority task so the urgent work is handled immediately. It keeps critical jobs responsive when the system is busy.",
    category: "scheduling",
    aliases: ["preempt", "preempted"],
  },
  {
    term: "Queue",
    short:
      "A small waiting line in memory where one task leaves messages for another task to pick up.",
    full: "A queue is a bounded buffer that holds messages passed between tasks. Because embedded memory is limited, queues have a fixed capacity — when full, new messages must be dropped.",
    category: "messaging",
    aliases: ["queues"],
  },
  {
    term: "Semaphore",
    short:
      "A counter tasks use to coordinate access to a shared resource or to signal that something is ready.",
    full: "A semaphore is a synchronization tool that tracks available units of a resource. Tasks take and release it to coordinate, for example limiting how many can use a shared resource at once.",
    category: "messaging",
  },
  {
    term: "Mutex",
    short:
      "A lock that lets only one task use a shared resource at a time, preventing two tasks from clashing.",
    full: "A mutex (mutual exclusion lock) ensures only one task touches a shared resource at a time. It prevents corruption that happens when two tasks modify the same data simultaneously.",
    category: "messaging",
  },
  {
    term: "Deadline",
    short:
      "The latest moment a task's work may finish. Finishing on time is part of being correct.",
    full: "A deadline is the time limit by which a task must complete its work. In real-time systems, meeting the deadline is part of correctness — late work can be as bad as no work.",
    category: "scheduling",
    aliases: ["deadlines"],
  },
  {
    term: "Watchdog",
    short:
      "A safety monitor that notices when a task is stuck or repeatedly late and triggers a recovery.",
    full: "A watchdog is a supervisor that periodically checks task progress. If a task hangs or keeps missing deadlines, the watchdog acts — for example forcing a reset — instead of letting the failure go unnoticed.",
    category: "reliability",
  },
  {
    term: "Latency",
    short:
      "The delay between something happening and the system responding to it.",
    full: "Latency is the time between an event (a button press, a sensor reading) and the system's response. Low, predictable latency is a core goal of real-time systems.",
    category: "observability",
  },
  {
    term: "Jitter",
    short:
      "How much the timing of a repeating task wobbles from one run to the next.",
    full: "Jitter is the variation in timing for work that should happen at regular intervals. High jitter means the system is less predictable, which can be a problem even if no single deadline is missed.",
    category: "observability",
  },
  {
    term: "Throughput",
    short:
      "How much work a system completes over a period of time.",
    full: "Throughput measures the volume of work done per unit of time. General-purpose schedulers often optimize for throughput, while real-time schedulers prioritize predictable timing instead.",
    category: "observability",
  },
  {
    term: "Linux scheduler",
    short:
      "The part of Linux that shares the CPU among programs, aiming for fairness and efficiency rather than strict timing.",
    full: "The Linux scheduler decides how programs share the CPU on a general-purpose system. It optimizes for fairness and throughput, which is why ordinary Linux is responsive but not considered hard real-time.",
    category: "scheduling",
  },
  {
    term: "CFS",
    short:
      "The Completely Fair Scheduler — Linux's approach to giving each program a fair share of CPU time.",
    full: "CFS (Completely Fair Scheduler) is a long-standing Linux scheduling design that aims to give every runnable task a fair portion of CPU time. It favors fairness over the timing guarantees an RTOS provides.",
    category: "scheduling",
  },
  {
    term: "Real-time system",
    short:
      "A system whose correctness depends on doing things on time, not just doing them.",
    full: "A real-time system must produce results within strict timing constraints. Being correct includes being on time — a right answer delivered too late is treated as a failure.",
    category: "fundamentals",
    aliases: ["real-time systems", "real time"],
  },
  {
    term: "Hard real-time",
    short:
      "Timing where a single missed deadline is a failure — think flight controls or pacemakers.",
    full: "In a hard real-time system, missing a deadline is a critical failure. These systems control things where lateness is unacceptable, such as airbags, flight controllers, or medical devices.",
    category: "fundamentals",
  },
  {
    term: "Soft real-time",
    short:
      "Timing where occasional lateness degrades quality but is not catastrophic, like a video stream stuttering.",
    full: "In a soft real-time system, missing a deadline reduces quality but is not a disaster. Video playback or live dashboards are examples — a late frame is annoying, not dangerous.",
    category: "fundamentals",
  },
  {
    term: "Dropped message",
    short:
      "A message that was thrown away because the queue was full or a fault deliberately discarded it.",
    full: "A dropped message is data that never reached its destination. It can happen because a bounded queue overflowed, or because a fault simulated an unreliable link. The cause determines the right fix.",
    category: "messaging",
    aliases: ["dropped messages", "message dropped", "drop", "drops"],
  },
  {
    term: "Crash",
    short:
      "When a task stops working. Here, one task can crash while the rest of the system keeps running.",
    full: "A crash is a task entering a failed state. A well-designed embedded system contains the failure to one task so the device degrades gracefully instead of shutting down completely.",
    category: "reliability",
    aliases: ["crashed", "task crash", "crashes"],
  },
  {
    term: "Health check",
    short:
      "The analyzer's overall verdict on a run: NORMAL, WARNING, or UNSTABLE.",
    full: "A health check is the analyzer's summary judgment of a run. NORMAL means no major problems, WARNING means degraded behavior such as drops, and UNSTABLE means serious issues like deadline misses or crashes.",
    category: "observability",
    aliases: ["health status", "health", "runtime health"],
  },
  {
    term: "Warning",
    short:
      "A signal that the run completed but showed degraded behavior, such as dropped messages or queue pressure.",
    full: "A warning indicates the run finished but with degraded behavior the analyzer flagged — for example dropped messages or queue pressure. It sits between a fully healthy run and an unstable one.",
    category: "observability",
    aliases: ["warnings"],
  },
  {
    term: "Runtime log",
    short:
      "The detailed, line-by-line record of events the simulator writes while it runs.",
    full: "A runtime log is the raw, event-by-event record the simulator produces — one line per task completion, message drop, fault, and so on. It is precise but verbose, so the analyzer summarizes it.",
    category: "observability",
    aliases: ["runtime logs", "logs", "log"],
  },
  {
    term: "Analysis",
    short:
      "The analyzer's plain summary of a run: health, warnings, misses, drops, and likely root causes.",
    full: "Analysis is the processed summary of a runtime log. Instead of reading thousands of raw lines, you get an overall health status, key counts, and a short list of root causes that explain what happened.",
    category: "observability",
    aliases: ["analyzer", "analysis report"],
  },
];

const lookup = new Map<string, GlossaryEntry>();
for (const entry of glossary) {
  lookup.set(entry.term.toLowerCase(), entry);
  for (const alias of entry.aliases ?? []) {
    lookup.set(alias.toLowerCase(), entry);
  }
}

/** Case-insensitive lookup that also matches known aliases. */
export function getGlossaryEntry(term: string): GlossaryEntry | undefined {
  return lookup.get(term.trim().toLowerCase());
}
