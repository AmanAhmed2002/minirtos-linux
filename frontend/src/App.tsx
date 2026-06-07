import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  createRun,
  getRunAnalysis,
  getRuns,
  getScenarios,
} from "./api/minirtosApi";
import {
  trackDashboardLoaded,
  trackRunHistorySelected,
  trackScenarioRunCompleted,
  trackScenarioRunTriggered,
} from "./analytics/amplitude";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { DashboardHeader } from "./components/DashboardHeader";
import { LearningModulePanel } from "./components/LearningModulePanel";
import { RunHistory } from "./components/RunHistory";
import { RunResultCard } from "./components/RunResultCard";
import { ScenarioSelector } from "./components/ScenarioSelector";
import type {
  AnalysisResponse,
  RunSummaryResponse,
  ScenarioResponse,
} from "./types/api";

function App() {
  const [scenarios, setScenarios] = useState<ScenarioResponse[]>([]);
  const [runs, setRuns] = useState<RunSummaryResponse[]>([]);
  const [latestRun, setLatestRun] = useState<RunSummaryResponse | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRun = useMemo(
    () => runs.find((run) => run.runId === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  const selectedScenario = useMemo(
    () =>
      scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null,
    [scenarios, selectedScenarioId]
  );

  async function refreshRuns() {
    const runHistory = await getRuns();
    setRuns(runHistory);
    return runHistory;
  }

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError(null);

        const [scenarioList, runHistory] = await Promise.all([
          getScenarios(),
          getRuns(),
        ]);

        setScenarios(scenarioList);
        setRuns(runHistory);
        trackDashboardLoaded(scenarioList.length, runHistory.length);

        if (scenarioList.length > 0) {
          setSelectedScenarioId(scenarioList[0].id);
        }

        if (runHistory.length > 0) {
          setLatestRun(runHistory[0]);
          setSelectedRunId(runHistory[0].runId);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load dashboard data."
        );
      } finally {
        setIsInitialLoading(false);
      }
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    async function loadAnalysis() {
      if (!selectedRunId) {
        setAnalysis(null);
        return;
      }

      const run = runs.find((item) => item.runId === selectedRunId);
      if (run?.status !== "COMPLETED") {
        setAnalysis(null);
        return;
      }

      try {
        setIsAnalysisLoading(true);
        setError(null);

        const result = await getRunAnalysis(selectedRunId);
        setAnalysis(result);
      } catch (analysisError) {
        setAnalysis(null);
        setError(
          analysisError instanceof Error
            ? analysisError.message
            : "Failed to load run analysis."
        );
      } finally {
        setIsAnalysisLoading(false);
      }
    }

    loadAnalysis();
  }, [selectedRunId, runs]);

  async function handleRunScenario() {
    if (!selectedScenarioId) return;

    const runStartTime = Date.now();
    const runningScenarioName =
      scenarios.find((s) => s.id === selectedScenarioId)?.name ??
      selectedScenarioId;
    trackScenarioRunTriggered(selectedScenarioId, runningScenarioName);

    try {
      setIsRunning(true);
      setError(null);

      const createdRun = await createRun(selectedScenarioId);
      setLatestRun(createdRun);
      setSelectedRunId(createdRun.runId);

      const updatedRuns = await refreshRuns();

      const persistedRun =
        updatedRuns.find((run) => run.runId === createdRun.runId) ??
        createdRun;

      setLatestRun(persistedRun);
      trackScenarioRunCompleted({
        scenarioId: selectedScenarioId,
        scenarioName: persistedRun.scenarioName,
        status: persistedRun.status,
        runtimeHealth: persistedRun.runtimeHealth,
        durationMs: Date.now() - runStartTime,
      });
    } catch (runError) {
      setError(
        runError instanceof Error
          ? runError.message
          : "Failed to create simulation run."
      );
    } finally {
      setIsRunning(false);
    }
  }

  function handleSelectRun(runId: string) {
    setSelectedRunId(runId);

    const run = runs.find((item) => item.runId === runId);
    if (run) {
      setLatestRun(run);
      trackRunHistorySelected({
        scenarioId: run.scenarioId,
        scenarioName: run.scenarioName,
        status: run.status,
      });
    }
  }

  if (isInitialLoading) {
    return (
      <main className="app-shell">
        <DashboardHeader />
        <section className="panel">
          <h2>Loading MiniRTOS Playground...</h2>
          <p>Connecting to the Spring Boot API.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <DashboardHeader />

      {error && (
        <section className="error-banner">
          <strong>Dashboard error:</strong> {error}
        </section>
      )}

      <div className="dashboard-grid">
        <div className="left-column">
          <ScenarioSelector
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            isRunning={isRunning}
            onSelectScenario={setSelectedScenarioId}
            onRunScenario={handleRunScenario}
          />

          <LearningModulePanel scenario={selectedScenario} />

          <RunResultCard run={latestRun} />
        </div>

        <div className="right-column">
          <RunHistory
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
          />

          {selectedRun?.status === "FAILED" && (
            <section className="error-box">
              <strong>Selected run failed:</strong>{" "}
              {selectedRun.errorMessage ?? "No error message was provided."}
            </section>
          )}
        </div>
      </div>

      <AnalysisPanel analysis={analysis} isLoading={isAnalysisLoading} />
    </main>
  );
}

export default App;
