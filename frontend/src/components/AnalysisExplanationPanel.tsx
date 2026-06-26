import { Link } from "react-router-dom";
import type { AnalysisResponse } from "../types/api";
import {
  getLessonById,
  getLessonForScenario,
} from "../data/lessonCatalog";

interface AnalysisExplanationPanelProps {
  analysis: AnalysisResponse;
}

interface ScenarioNarrative {
  plainSummary: string;
  whyItMatters: string;
}

/*
 * Plain-English narratives per scenario family. These translate analyzer
 * output into "what happened and why it matters in embedded systems" so the
 * Analysis page teaches rather than only diagnoses.
 */
function getNarrative(analysis: AnalysisResponse): ScenarioNarrative {
  const id = analysis.scenarioId;

  if (id.includes("queue_overflow")) {
    return {
      plainSummary:
        "The system dropped messages because tasks produced data faster than another task could process it, so the queue filled up.",
      whyItMatters:
        "In embedded systems, dropped messages can mean lost sensor readings, delayed alerts, or unsafe control decisions.",
    };
  }
  if (id.includes("dropped_messages")) {
    return {
      plainSummary:
        "Messages were lost on purpose to simulate an unreliable link — not because the queue was full.",
      whyItMatters:
        "Real devices face flaky connections. Telling unreliable delivery apart from queue overflow decides whether you add retries or fix capacity.",
    };
  }
  if (id.includes("slow_task")) {
    return {
      plainSummary:
        "A task was forced to run far longer than its budget, so it began finishing after its deadline.",
      whyItMatters:
        "A late result in a real-time system can be as harmful as no result — think of a monitor that reports a problem too late.",
    };
  }
  if (id.includes("cpu_spike")) {
    return {
      plainSummary:
        "A task's execution time spiked well above normal, pushing it past its deadline on later runs.",
      whyItMatters:
        "Worst-case timing, not average timing, decides whether deadlines are met. A reassuring average can hide deadline-breaking peaks.",
    };
  }
  if (id.includes("task_crash")) {
    return {
      plainSummary:
        "One task entered a failed state and was skipped afterward, while the rest of the system kept running.",
      whyItMatters:
        "Containing a failure to a single task lets a device degrade gracefully instead of going completely dark.",
    };
  }
  if (id.includes("watchdog")) {
    return {
      plainSummary:
        "A task kept missing deadlines, so the watchdog detected it and triggered a simulated recovery — repeatedly.",
      whyItMatters:
        "Watchdogs restore liveness, but they do not cure the root cause. Repeated recovery is a signal to fix the underlying fault.",
    };
  }
  if (id.includes("priority")) {
    return {
      plainSummary:
        "Tasks ran in order of importance rather than taking simple turns, so critical work went first.",
      whyItMatters:
        "Prioritizing critical work keeps a device responsive, at the cost of fairness to lower-priority tasks.",
    };
  }
  if (id.includes("deadline")) {
    return {
      plainSummary:
        "The scheduler ran whichever task had the nearest deadline, ordering work by urgency.",
      whyItMatters:
        "Tying scheduling to deadlines is a powerful way to meet timing guarantees when the workload fits.",
    };
  }
  return {
    plainSummary:
      "This run executed periodic tasks with no faults, producing a healthy baseline.",
    whyItMatters:
      "A healthy baseline is the reference point that lets you recognize degraded behavior in other runs.",
  };
}

function describeWhatChanged(analysis: AnalysisResponse): string[] {
  const changes: string[] = [];
  const message = analysis.messageSummary;

  if (message && message.dropped > 0) {
    if (message.queueFullDrops > 0) {
      changes.push(
        `${message.queueFullDrops} message(s) dropped because the queue was full.`
      );
    }
    if (message.faultInjectedDrops > 0) {
      changes.push(
        `${message.faultInjectedDrops} message(s) dropped by an injected reliability fault.`
      );
    }
  }

  const totalDeadlineMisses = Object.values(analysis.taskMetrics ?? {}).reduce(
    (sum, metric) => sum + (metric.deadlineMisses ?? 0),
    0
  );
  if (totalDeadlineMisses > 0) {
    changes.push(`${totalDeadlineMisses} deadline miss(es) recorded across tasks.`);
  }

  if (analysis.eventCounts?.task_failed) {
    changes.push(
      `${analysis.eventCounts.task_failed} task failure event(s) observed.`
    );
  }
  if (analysis.eventCounts?.watchdog_timeout) {
    changes.push(
      `${analysis.eventCounts.watchdog_timeout} watchdog timeout(s) fired.`
    );
  }

  if (changes.length === 0) {
    changes.push(
      "Nothing degraded — tasks ran on time, no messages were dropped, and no faults fired."
    );
  }
  return changes;
}

export function AnalysisExplanationPanel({
  analysis,
}: AnalysisExplanationPanelProps) {
  const narrative = getNarrative(analysis);
  const lesson = getLessonForScenario(analysis.scenarioId);
  const nextLesson = lesson?.nextLessonId
    ? getLessonById(lesson.nextLessonId)
    : undefined;

  return (
    <section className="panel explanation-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Analysis explained</p>
          <h2>What this run means</h2>
        </div>
      </div>

      <p className="explanation-panel__intro">
        This page summarizes what happened during the simulation. Use it to
        connect the lesson concept to the actual runtime behavior you observed.
      </p>

      <div className="explanation-block">
        <h3>Plain-English summary</h3>
        <p>{narrative.plainSummary}</p>
      </div>

      <div className="explanation-block">
        <h3>What changed?</h3>
        <ul>
          {describeWhatChanged(analysis).map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      </div>

      <div className="explanation-block">
        <h3>Why it matters in embedded systems</h3>
        <p>{narrative.whyItMatters}</p>
      </div>

      <div className="explanation-cta-row">
        {lesson && (
          <div className="explanation-cta">
            <span>Related lesson</span>
            <Link to={`/learn/${lesson.id}`}>
              Module {lesson.moduleNumber} — {lesson.title}
            </Link>
          </div>
        )}
        {nextLesson && (
          <div className="explanation-cta">
            <span>Suggested next concept</span>
            <Link to={`/learn/${nextLesson.id}`}>
              Module {nextLesson.moduleNumber} — {nextLesson.title}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
