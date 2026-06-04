import type {
  AnalysisResponse,
  CreateRunRequest,
  RunSummaryResponse,
  ScenarioResponse,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8081";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      errorText || `Request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getScenarios(): Promise<ScenarioResponse[]> {
  return request<ScenarioResponse[]>("/api/scenarios");
}

export async function createRun(
  scenarioId: string
): Promise<RunSummaryResponse> {
  const body: CreateRunRequest = { scenarioId };

  return request<RunSummaryResponse>("/api/runs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getRuns(): Promise<RunSummaryResponse[]> {
  return request<RunSummaryResponse[]>("/api/runs");
}

export async function getRunAnalysis(
  runId: string
): Promise<AnalysisResponse> {
  return request<AnalysisResponse>(`/api/runs/${encodeURIComponent(runId)}/analysis`);
}
