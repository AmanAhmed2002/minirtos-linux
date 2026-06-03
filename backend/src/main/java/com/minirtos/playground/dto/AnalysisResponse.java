package com.minirtos.playground.dto;

import java.util.List;
import java.util.Map;

public record AnalysisResponse(
    String runId,
    String scenarioId,
    String runtimeHealth,
    Integer eventsLoaded,
    String simulationName,
    String schedulerMode,
    Integer configuredDurationSeconds,
    Integer observedDurationMs,
    Map<String, Integer> eventCounts,
    Map<String, Integer> severityCounts,
    Map<String, TaskMetricResponse> taskMetrics,
    MessageSummaryResponse messageSummary,
    List<String> rootCauses,
    String rawReport
) {
}
