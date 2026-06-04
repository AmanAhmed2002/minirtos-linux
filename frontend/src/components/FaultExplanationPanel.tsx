import type { AnalysisResponse } from "../types/api";
import {
  getRootCauseExplanation,
  getRuntimeHealthExplanation,
} from "../content/learningContent";

interface FaultExplanationPanelProps {
  analysis: AnalysisResponse;
}

function getScenarioFaultSummary(analysis: AnalysisResponse) {
  const scenarioId = analysis.scenarioId;

  if (scenarioId.includes("queue_overflow")) {
    return "This run is mainly about bounded queue capacity. Drops usually mean the queue filled up, not that the fault injector forced message loss.";
  }

  if (scenarioId.includes("cpu_spike")) {
    return "This run is mainly about CPU timing pressure. Watch task durations and deadline misses.";
  }

  if (scenarioId.includes("task_crash")) {
    return "This run is mainly about simulated task failure. Watch for task_failed and task_skipped telemetry.";
  }

  if (scenarioId.includes("slow_task")) {
    return "This run is mainly about slow task execution. Watch deadline misses and average/max task duration.";
  }

  if (scenarioId.includes("dropped_messages")) {
    return "This run is mainly about intentional message loss caused by the fault injector.";
  }

  if (scenarioId.includes("watchdog")) {
    return "This run is mainly about watchdog escalation and simulated recovery telemetry.";
  }

  if (scenarioId.includes("priority")) {
    return "This run is mainly about static priority scheduling and how task ordering changes.";
  }

  if (scenarioId.includes("deadline")) {
    return "This run is mainly about earliest-deadline-first scheduling and timing-aware task order.";
  }

  return "This run is mainly about observing runtime telemetry and analyzer health output.";
}

export function FaultExplanationPanel({ analysis }: FaultExplanationPanelProps) {
  return (
    <section className="visual-card">
      <div className="visual-heading">
        <div>
          <h3>Fault and health explanation</h3>
          <p>{getScenarioFaultSummary(analysis)}</p>
        </div>
      </div>

      <div className="explanation-grid">
        <div>
          <span>Runtime health</span>
          <strong>{analysis.runtimeHealth ?? "Unknown"}</strong>
          <p>{getRuntimeHealthExplanation(analysis)}</p>
        </div>

        <div>
          <span>Scenario</span>
          <strong>{analysis.simulationName ?? analysis.scenarioId}</strong>
          <p>
            Compare this scenario with the message summary, task metrics, and
            root causes to understand why the analyzer chose this health state.
          </p>
        </div>
      </div>

      <h4>Root-cause teaching notes</h4>

      {analysis.rootCauses.length === 0 ? (
        <p className="empty-state">
          No root causes were reported. This usually means the analyzer did not
          find a major fault pattern.
        </p>
      ) : (
        <div className="root-explanation-list">
          {analysis.rootCauses.map((cause) => (
            <article key={cause}>
              <strong>{cause}</strong>
              <p>{getRootCauseExplanation(cause)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
