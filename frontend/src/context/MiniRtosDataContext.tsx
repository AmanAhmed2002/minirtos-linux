import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createRun,
  getRunAnalysis,
  getRuns,
  getScenarios,
} from "../api/minirtosApi";
import {
  trackDashboardLoaded,
  trackRunHistorySelected,
  trackScenarioRunCompleted,
  trackScenarioRunTriggered,
} from "../analytics/amplitude";
import type {
  AnalysisResponse,
  RunSummaryResponse,
  ScenarioResponse,
} from "../types/api";
import { MiniRtosDataContext, type MiniRtosData } from "./miniRtosData";

/*
 * Shared application data for the whole router. The previous single-page
 * dashboard kept scenarios, runs, and analysis in App state. Now that the app
 * spans several routes (Learn, Simulator, Runs, Analysis), that data lives in
 * one provider so every page reads and mutates the same state — and the
 * underlying API calls (getScenarios, getRuns, createRun, getRunAnalysis) and
 * analytics behavior are preserved exactly.
 */

export function MiniRtosDataProvider({ children }: { children: ReactNode }) {
  const [scenarios, setScenarios] = useState<ScenarioResponse[]>([]);
  const [runs, setRuns] = useState<RunSummaryResponse[]>([]);
  const [latestRun, setLatestRun] = useState<RunSummaryResponse | null>(null);
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

  const refreshRuns = useCallback(async () => {
    const runHistory = await getRuns();
    setRuns(runHistory);
    return runHistory;
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setError(null);

        const [scenarioList, runHistory] = await Promise.all([
          getScenarios(),
          getRuns(),
        ]);

        setScenarios(scenarioList);
        setRuns(runHistory);
        trackDashboardLoaded(scenarioList.length, runHistory.length);

        if (runHistory.length > 0) {
          setLatestRun(runHistory[0]);
          setSelectedRunId(runHistory[0].runId);
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load MiniRTOS data."
        );
      } finally {
        setIsInitialLoading(false);
      }
    }

    loadInitialData();
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

  const getScenarioById = useCallback(
    (scenarioId: string) =>
      scenarios.find((scenario) => scenario.id === scenarioId),
    [scenarios]
  );

  const runScenario = useCallback(
    async (scenarioId: string) => {
      if (!scenarioId) return null;

      const runStartTime = Date.now();
      const runningScenarioName =
        scenarios.find((s) => s.id === scenarioId)?.name ?? scenarioId;
      trackScenarioRunTriggered(scenarioId, runningScenarioName);

      try {
        setIsRunning(true);
        setError(null);

        const createdRun = await createRun(scenarioId);
        setLatestRun(createdRun);
        setSelectedRunId(createdRun.runId);

        const updatedRuns = await refreshRuns();
        const persistedRun =
          updatedRuns.find((run) => run.runId === createdRun.runId) ??
          createdRun;

        setLatestRun(persistedRun);
        trackScenarioRunCompleted({
          scenarioId,
          scenarioName: persistedRun.scenarioName,
          status: persistedRun.status,
          runtimeHealth: persistedRun.runtimeHealth,
          durationMs: Date.now() - runStartTime,
        });

        return persistedRun;
      } catch (runError) {
        setError(
          runError instanceof Error
            ? runError.message
            : "Failed to create simulation run."
        );
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [scenarios, refreshRuns]
  );

  const selectRun = useCallback(
    (runId: string) => {
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
    },
    [runs]
  );

  const value = useMemo<MiniRtosData>(
    () => ({
      scenarios,
      runs,
      latestRun,
      selectedRunId,
      selectedRun,
      analysis,
      isInitialLoading,
      isRunning,
      isAnalysisLoading,
      error,
      getScenarioById,
      runScenario,
      selectRun,
    }),
    [
      scenarios,
      runs,
      latestRun,
      selectedRunId,
      selectedRun,
      analysis,
      isInitialLoading,
      isRunning,
      isAnalysisLoading,
      error,
      getScenarioById,
      runScenario,
      selectRun,
    ]
  );

  return (
    <MiniRtosDataContext.Provider value={value}>
      {children}
    </MiniRtosDataContext.Provider>
  );
}
