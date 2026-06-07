import * as amplitude from "@amplitude/analytics-browser";

const API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY ?? "";

let isAnalyticsEnabled = false;

export function initAmplitude(): void {
  if (!API_KEY) return;

  amplitude.init(API_KEY, { autocapture: false });
  isAnalyticsEnabled = true;
}

export function trackDashboardLoaded(
  scenarioCount: number,
  runCount: number
): void {
  if (!isAnalyticsEnabled) return;
  amplitude.track("dashboard_loaded", {
    scenario_count: scenarioCount,
    run_count: runCount,
  });
}

export function trackScenarioRunTriggered(
  scenarioId: string,
  scenarioName: string
): void {
  if (!isAnalyticsEnabled) return;
  amplitude.track("scenario_run_triggered", {
    scenario_id: scenarioId,
    scenario_name: scenarioName,
  });
}

export function trackScenarioRunCompleted(props: {
  scenarioId: string;
  scenarioName: string;
  status: string;
  runtimeHealth: string | null;
  durationMs: number;
}): void {
  if (!isAnalyticsEnabled) return;
  amplitude.track("scenario_run_completed", {
    scenario_id: props.scenarioId,
    scenario_name: props.scenarioName,
    status: props.status,
    runtime_health: props.runtimeHealth,
    duration_ms: props.durationMs,
  });
}

export function trackRunHistorySelected(props: {
  scenarioId: string;
  scenarioName: string;
  status: string;
}): void {
  if (!isAnalyticsEnabled) return;
  amplitude.track("run_history_selected", {
    scenario_id: props.scenarioId,
    scenario_name: props.scenarioName,
    status: props.status,
  });
}
