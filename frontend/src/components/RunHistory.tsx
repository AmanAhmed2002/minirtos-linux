import clsx from "clsx";
import type { RunSummaryResponse } from "../types/api";

interface RunHistoryProps {
  runs: RunSummaryResponse[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}

function formatShortDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function RunHistory({
  runs,
  selectedRunId,
  onSelectRun,
}: RunHistoryProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Persisted History</p>
          <h2>Previous runs</h2>
        </div>
        <span className="count-badge">{runs.length}</span>
      </div>

      {runs.length === 0 ? (
        <p className="empty-state">
          No persisted runs yet. Run a scenario to create the first history
          entry.
        </p>
      ) : (
        <div className="run-list">
          {runs.map((run) => (
            <button
              key={run.runId}
              type="button"
              className={clsx("run-list-item", {
                active: run.runId === selectedRunId,
              })}
              onClick={() => onSelectRun(run.runId)}
            >
              <div>
                <strong>{run.scenarioName}</strong>
                <span>{run.runId}</span>
              </div>

              <div className="run-list-meta">
                <span>{run.runtimeHealth ?? "Unknown"}</span>
                <span>{formatShortDate(run.completedAt ?? run.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
