import { createContext, useContext } from "react";
import type {
  AnalysisResponse,
  RunSummaryResponse,
  ScenarioResponse,
} from "../types/api";

/*
 * Context value shape and hook, kept in a hook-only module so the provider file
 * can stay component-only (satisfies react-refresh/only-export-components).
 */
export interface MiniRtosData {
  scenarios: ScenarioResponse[];
  runs: RunSummaryResponse[];
  latestRun: RunSummaryResponse | null;
  selectedRunId: string | null;
  selectedRun: RunSummaryResponse | null;
  analysis: AnalysisResponse | null;

  isInitialLoading: boolean;
  isRunning: boolean;
  isAnalysisLoading: boolean;
  error: string | null;

  getScenarioById: (scenarioId: string) => ScenarioResponse | undefined;
  runScenario: (scenarioId: string) => Promise<RunSummaryResponse | null>;
  selectRun: (runId: string) => void;
}

export const MiniRtosDataContext = createContext<MiniRtosData | null>(null);

export function useMiniRtosData(): MiniRtosData {
  const context = useContext(MiniRtosDataContext);
  if (!context) {
    throw new Error(
      "useMiniRtosData must be used within a MiniRtosDataProvider."
    );
  }
  return context;
}
