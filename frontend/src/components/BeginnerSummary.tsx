import { Link } from "react-router-dom";
import type {
  AnalysisResponse,
  RunSummaryResponse,
  ScenarioResponse,
} from "../types/api";
import { getRuntimeHealthExplanation } from "../content/learningContent";
import { getLessonForScenario } from "../data/lessonCatalog";
import { TooltipTerm } from "./TooltipTerm";

interface BeginnerSummaryProps {
  run: RunSummaryResponse;
  analysis: AnalysisResponse | null;
  scenario?: ScenarioResponse;
}

/*
 * The beginner-facing view of a run. Raw logs stay one tab away; this surfaces
 * the few numbers that actually tell the story, each with a tooltip, plus a
 * plain-English explanation and a link back to the matching lesson.
 */
export function BeginnerSummary({
  run,
  analysis,
  scenario,
}: BeginnerSummaryProps) {
  const lesson = getLessonForScenario(run.scenarioId);
  const health = analysis?.runtimeHealth ?? run.runtimeHealth ?? "Unknown";

  const warnings = analysis?.severityCounts?.WARNING ?? 0;
  const missedDeadlines = Object.values(analysis?.taskMetrics ?? {}).reduce(
    (sum, metric) => sum + (metric.deadlineMisses ?? 0),
    0
  );
  const droppedMessages = analysis?.messageSummary?.dropped ?? 0;
  const crashedTasks = analysis?.eventCounts?.task_failed ?? 0;

  return (
    <div className="beginner-summary">
      <div className="beginner-summary__head">
        <div>
          <span className="beginner-summary__label">Scenario</span>
          <strong>{run.scenarioName}</strong>
        </div>
        <div>
          <span className="beginner-summary__label">Concept tested</span>
          <strong>{scenario?.concept ?? lesson?.title ?? "RTOS behavior"}</strong>
        </div>
      </div>

      <div className="beginner-metric-grid">
        <div className="beginner-metric">
          <span>
            <TooltipTerm term="health status">System health</TooltipTerm>
          </span>
          <strong className={`health-text ${health.toLowerCase()}`}>{health}</strong>
        </div>
        <div className="beginner-metric">
          <span>
            <TooltipTerm term="warning">Warnings</TooltipTerm>
          </span>
          <strong>{warnings}</strong>
        </div>
        <div className="beginner-metric">
          <span>
            <TooltipTerm term="deadline">Missed deadlines</TooltipTerm>
          </span>
          <strong>{missedDeadlines}</strong>
        </div>
        <div className="beginner-metric">
          <span>
            <TooltipTerm term="dropped message">Dropped messages</TooltipTerm>
          </span>
          <strong>{droppedMessages}</strong>
        </div>
        <div className="beginner-metric">
          <span>
            <TooltipTerm term="crash">Crashed tasks</TooltipTerm>
          </span>
          <strong>{crashedTasks}</strong>
        </div>
      </div>

      <div className="beginner-summary__explain">
        <h4>What this means</h4>
        <p>{getRuntimeHealthExplanation(analysis)}</p>
        {!analysis && run.status !== "COMPLETED" && (
          <p className="empty-state">
            This run has not produced an analysis yet (status: {run.status}).
          </p>
        )}
      </div>

      {lesson && (
        <p className="beginner-summary__lesson">
          Related lesson:{" "}
          <Link to={`/learn/${lesson.id}`}>
            Module {lesson.moduleNumber} — {lesson.title}
          </Link>
        </p>
      )}
    </div>
  );
}
