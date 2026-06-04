import type { AnalysisResponse } from "../types/api";

interface AnalysisPanelProps {
  analysis: AnalysisResponse | null;
  isLoading: boolean;
}

function renderValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "N/A" : value;
}

export function AnalysisPanel({ analysis, isLoading }: AnalysisPanelProps) {
  if (isLoading) {
    return (
      <section className="panel">
        <p className="eyebrow">Analyzer</p>
        <h2>Loading analysis...</h2>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="panel muted-panel">
        <p className="eyebrow">Analyzer</p>
        <h2>No analysis selected</h2>
        <p>
          Select a completed run from the history list to inspect task metrics,
          event counts, message drops, root causes, and the raw analyzer report.
        </p>
      </section>
    );
  }

  const messageSummary = analysis.messageSummary;

  return (
    <section className="panel analysis-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Analyzer Summary</p>
          <h2>{analysis.simulationName ?? analysis.scenarioId}</h2>
        </div>
      </div>

      <div className="summary-grid">
        <div>
          <span>Runtime Health</span>
          <strong>{renderValue(analysis.runtimeHealth)}</strong>
        </div>
        <div>
          <span>Events Loaded</span>
          <strong>{renderValue(analysis.eventsLoaded)}</strong>
        </div>
        <div>
          <span>Scheduler</span>
          <strong>{renderValue(analysis.schedulerMode)}</strong>
        </div>
        <div>
          <span>Observed Duration</span>
          <strong>{renderValue(analysis.observedDurationMs)} ms</strong>
        </div>
      </div>

      {messageSummary && (
        <>
          <h3>Message Summary</h3>
          <div className="metric-grid">
            <div>
              <span>Sent</span>
              <strong>{messageSummary.sent}</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{messageSummary.received}</strong>
            </div>
            <div>
              <span>Dropped</span>
              <strong>{messageSummary.dropped}</strong>
            </div>
            <div>
              <span>Queue Full Drops</span>
              <strong>{messageSummary.queueFullDrops}</strong>
            </div>
            <div>
              <span>Fault Drops</span>
              <strong>{messageSummary.faultInjectedDrops}</strong>
            </div>
          </div>
        </>
      )}

      <h3>Task Metrics</h3>
      {Object.keys(analysis.taskMetrics ?? {}).length === 0 ? (
        <p className="empty-state">No task metrics were parsed.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Runs</th>
                <th>Deadline Misses</th>
                <th>Avg Duration</th>
                <th>Max Duration</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(analysis.taskMetrics).map(([taskName, metric]) => (
                <tr key={taskName}>
                  <td>{taskName}</td>
                  <td>{metric.runs}</td>
                  <td>{metric.deadlineMisses}</td>
                  <td>{metric.avgDurationMs.toFixed(2)} ms</td>
                  <td>{metric.maxDurationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Root Causes</h3>
      {analysis.rootCauses.length === 0 ? (
        <p className="empty-state">No root causes reported.</p>
      ) : (
        <ul className="root-cause-list">
          {analysis.rootCauses.map((cause) => (
            <li key={cause}>{cause}</li>
          ))}
        </ul>
      )}

      <details className="raw-report">
        <summary>Raw analyzer report</summary>
        <pre>{analysis.rawReport ?? "No raw report available."}</pre>
      </details>
    </section>
  );
}
