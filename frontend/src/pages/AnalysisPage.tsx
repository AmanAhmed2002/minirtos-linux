import { Link } from "react-router-dom";
import { useMiniRtosData } from "../context/miniRtosData";
import { AnalysisExplanationPanel } from "../components/AnalysisExplanationPanel";
import { AnalysisPanel } from "../components/AnalysisPanel";

export function AnalysisPage() {
  const {
    runs,
    selectedRun,
    selectedRunId,
    analysis,
    isAnalysisLoading,
    selectRun,
    error,
  } = useMiniRtosData();

  const completedRuns = runs.filter((run) => run.status === "COMPLETED");

  return (
    <div className="analysis-page">
      <section className="page-header">
        <p className="eyebrow">Analysis</p>
        <h1>Read what the simulation did</h1>
        <p className="page-header__subtitle">
          Each run is summarized in plain English and tied back to the concept
          it demonstrates.
        </p>

        {completedRuns.length > 0 && (
          <label className="analysis-run-picker">
            <span>Run to analyze</span>
            <select
              value={selectedRunId ?? ""}
              onChange={(event) => selectRun(event.target.value)}
            >
              {completedRuns.map((run) => (
                <option key={run.runId} value={run.runId}>
                  {run.scenarioName} — {run.runId}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {error && (
        <section className="error-banner">
          <strong>Analysis error:</strong> {error}
        </section>
      )}

      {!selectedRun || selectedRun.status !== "COMPLETED" ? (
        <section className="panel muted-panel">
          <h2>No completed run to analyze yet</h2>
          <p>
            Run a scenario from a <Link to="/learn">lesson</Link> or the{" "}
            <Link to="/simulator">Simulator</Link> to generate analysis you can
            read here.
          </p>
        </section>
      ) : (
        <>
          {analysis && <AnalysisExplanationPanel analysis={analysis} />}
          <AnalysisPanel analysis={analysis} isLoading={isAnalysisLoading} />
        </>
      )}
    </div>
  );
}
