package com.minirtos.playground.model;

import java.time.Instant;

import com.minirtos.playground.dto.AnalysisResponse;
import com.minirtos.playground.dto.RunSummaryResponse;

public class RunRecord {

    private final String runId;
    private final String scenarioId;
    private final String scenarioName;
    private final String logPath;
    private final String analysisPath;
    private final Instant createdAt;

    private RunStatus status;
    private String runtimeHealth;
    private Instant completedAt;
    private String errorMessage;
    private AnalysisResponse analysis;

    public RunRecord(
        String runId,
        String scenarioId,
        String scenarioName,
        String logPath,
        String analysisPath,
        Instant createdAt
    ) {
        this.runId = runId;
        this.scenarioId = scenarioId;
        this.scenarioName = scenarioName;
        this.logPath = logPath;
        this.analysisPath = analysisPath;
        this.createdAt = createdAt;
        this.status = RunStatus.RUNNING;
    }

    public String getRunId() {
        return runId;
    }

    public AnalysisResponse getAnalysis() {
        return analysis;
    }

    public void markCompleted(AnalysisResponse analysis) {
        this.status = RunStatus.COMPLETED;
        this.analysis = analysis;
        this.runtimeHealth = analysis.runtimeHealth();
        this.completedAt = Instant.now();
    }

    public void markFailed(String errorMessage) {
        this.status = RunStatus.FAILED;
        this.errorMessage = errorMessage;
        this.completedAt = Instant.now();
    }

    public RunSummaryResponse toSummaryResponse() {
        return new RunSummaryResponse(
            runId,
            scenarioId,
            scenarioName,
            status,
            runtimeHealth,
            logPath,
            analysisPath,
            createdAt,
            completedAt,
            errorMessage
        );
    }
}
