import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { useMiniRtosData } from "../context/miniRtosData";
import { RunHistory } from "../components/RunHistory";
import { BeginnerSummary } from "../components/BeginnerSummary";
import { AnalysisPanel } from "../components/AnalysisPanel";
import { getRunLog } from "../api/minirtosApi";

type RunTab = "summary" | "raw";

export function RunsPage() {
  const {
    runs,
    selectedRun,
    selectedRunId,
    analysis,
    isAnalysisLoading,
    selectRun,
    getScenarioById,
  } = useMiniRtosData();
  const [tab, setTab] = useState<RunTab>("summary");
  const [logContent, setLogContent] = useState<string | null>(null);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadLog() {
      if (tab !== "raw" || !selectedRunId) {
        return;
      }

      try {
        setIsLogLoading(true);
        setLogError(null);
        const log = await getRunLog(selectedRunId);

        if (isCurrent) {
          setLogContent(log.content);
        }
      } catch (error) {
        if (isCurrent) {
          setLogContent(null);
          setLogError(
            error instanceof Error
              ? error.message
              : "Failed to load runtime log."
          );
        }
      } finally {
        if (isCurrent) {
          setIsLogLoading(false);
        }
      }
    }

    loadLog();

    return () => {
      isCurrent = false;
    };
  }, [selectedRunId, tab]);

  return (
    <div className="runs-page">
      <section className="page-header">
        <p className="eyebrow">Runs</p>
        <h1>Your simulation runs</h1>
        <p className="page-header__subtitle">
          Start with the Beginner Summary to understand a run, then open the Raw
          Logs tab for the full technical detail.
        </p>
      </section>

      <div className="runs-layout">
        <RunHistory
          runs={runs}
          selectedRunId={selectedRunId}
          onSelectRun={selectRun}
        />

        <div className="runs-detail">
          {!selectedRun ? (
            <section className="panel muted-panel">
              <h2>No run selected</h2>
              <p>
                Select a run from the list, or{" "}
                <Link to="/simulator">run a scenario</Link> to create one.
              </p>
            </section>
          ) : (
            <section className="panel">
              <div className="tab-bar" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "summary"}
                  className={clsx("tab", { "tab--active": tab === "summary" })}
                  onClick={() => setTab("summary")}
                >
                  Beginner Summary
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "raw"}
                  className={clsx("tab", { "tab--active": tab === "raw" })}
                  onClick={() => setTab("raw")}
                >
                  Raw Logs
                </button>
              </div>

              {tab === "summary" ? (
                <BeginnerSummary
                  run={selectedRun}
                  analysis={analysis}
                  scenario={getScenarioById(selectedRun.scenarioId)}
                />
              ) : (
                <div className="runs-raw">
                  <div className="path-list">
                    <p>
                      <span>Runtime log:</span>{" "}
                      {selectedRun.logPath ?? "Not available"}
                    </p>
                    <p>
                      <span>Analysis report:</span>{" "}
                      {selectedRun.analysisPath ?? "Not available"}
                    </p>
                  </div>
                  <div className="raw-log-viewer">
                    <h3>Raw runtime log</h3>
                    {isLogLoading ? (
                      <p className="empty-state">Loading runtime log...</p>
                    ) : logError ? (
                      <p className="empty-state">{logError}</p>
                    ) : (
                      <pre>
                        {logContent?.trim()
                          ? logContent
                          : "No raw runtime log content available."}
                      </pre>
                    )}
                  </div>
                  <AnalysisPanel analysis={analysis} isLoading={isAnalysisLoading} />
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
