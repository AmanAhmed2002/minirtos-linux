import clsx from "clsx";
import type { RunSummaryResponse } from "../types/api";

interface RunResultCardProps {
  run: RunSummaryResponse | null;
}

function formatDate(value: string | null) {
  if (!value) return "Not completed yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RunResultCard({ run }: RunResultCardProps) {
  if (!run) {
    return (
      <section className="panel muted-panel">
        <p className="eyebrow">Latest Run</p>
        <h2>No run selected yet</h2>
        <p>
          Choose a scenario and run it to see status, runtime health, log path,
          and analyzer path.
        </p>
      </section>
    );
  }

  const healthClass = run.runtimeHealth?.toLowerCase() ?? "unknown";

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Latest Run</p>
          <h2>{run.scenarioName}</h2>
        </div>

        <span className={clsx("status-pill", run.status.toLowerCase())}>
          {run.status}
        </span>
      </div>

      <div className="summary-grid">
        <div>
          <span>Runtime Health</span>
          <strong className={clsx("health-text", healthClass)}>
            {run.runtimeHealth ?? "Unknown"}
          </strong>
        </div>

        <div>
          <span>Scenario ID</span>
          <strong>{run.scenarioId}</strong>
        </div>

        <div>
          <span>Created</span>
          <strong>{formatDate(run.createdAt)}</strong>
        </div>

        <div>
          <span>Completed</span>
          <strong>{formatDate(run.completedAt)}</strong>
        </div>
      </div>

      {run.errorMessage && (
        <div className="error-box">
          <strong>Error:</strong> {run.errorMessage}
        </div>
      )}

      <div className="path-list">
        <p>
          <span>Runtime log:</span> {run.logPath ?? "Not available"}
        </p>
        <p>
          <span>Analysis report:</span> {run.analysisPath ?? "Not available"}
        </p>
      </div>
    </section>
  );
}
