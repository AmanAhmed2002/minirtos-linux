package com.minirtos.playground.dto;

import java.time.Instant;

import com.minirtos.playground.model.RunStatus;

public record RunSummaryResponse(
    String runId,
    String scenarioId,
    String scenarioName,
    RunStatus status,
    String runtimeHealth,
    String logPath,
    String analysisPath,
    Instant createdAt,
    Instant completedAt,
    String errorMessage
) {
}
