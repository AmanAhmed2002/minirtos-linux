export type RunStatus = "RUNNING" | "COMPLETED" | "FAILED";

export interface ScenarioResponse {
  id: string;
  name: string;
  schedulerMode: string;
  difficulty: string;
  concept: string;
  description: string;
  configPath: string;
  teaches: string[];
  expectedSignals: string[];
}

export interface CreateRunRequest {
  scenarioId: string;
}

export interface RunSummaryResponse {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  status: RunStatus;
  runtimeHealth: string | null;
  logPath: string | null;
  analysisPath: string | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface MessageSummaryResponse {
  sent: number;
  received: number;
  dropped: number;
  queueFullDrops: number;
  faultInjectedDrops: number;
}

export interface TaskMetricResponse {
  runs: number;
  deadlineMisses: number;
  deadlineMissedEvents: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

export interface AnalysisResponse {
  runId: string;
  scenarioId: string;
  runtimeHealth: string | null;
  eventsLoaded: number | null;
  simulationName: string | null;
  schedulerMode: string | null;
  configuredDurationSeconds: number | null;
  observedDurationMs: number | null;
  eventCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  taskMetrics: Record<string, TaskMetricResponse>;
  messageSummary: MessageSummaryResponse | null;
  rootCauses: string[];
  rawReport: string | null;
}
