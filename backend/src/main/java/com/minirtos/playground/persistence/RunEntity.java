package com.minirtos.playground.persistence;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.minirtos.playground.dto.AnalysisResponse;
import com.minirtos.playground.dto.MessageSummaryResponse;
import com.minirtos.playground.dto.RunSummaryResponse;
import com.minirtos.playground.model.RunStatus;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "runs")
public class RunEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", nullable = false, unique = true, length = 160)
    private String runId;

    @Column(name = "scenario_id", nullable = false, length = 120)
    private String scenarioId;

    @Column(name = "scenario_name", nullable = false)
    private String scenarioName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private RunStatus status;

    @Column(name = "runtime_health", length = 64)
    private String runtimeHealth;

    @Column(name = "log_path", nullable = false, columnDefinition = "text")
    private String logPath;

    @Column(name = "analysis_path", nullable = false, columnDefinition = "text")
    private String analysisPath;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "events_loaded")
    private Integer eventsLoaded;

    @Column(name = "simulation_name")
    private String simulationName;

    @Column(name = "scheduler_mode")
    private String schedulerMode;

    @Column(name = "configured_duration_seconds")
    private Integer configuredDurationSeconds;

    @Column(name = "observed_duration_ms")
    private Integer observedDurationMs;

    @Column(name = "message_sent")
    private Integer messageSent;

    @Column(name = "message_received")
    private Integer messageReceived;

    @Column(name = "message_dropped")
    private Integer messageDropped;

    @Column(name = "message_queue_full_drops")
    private Integer messageQueueFullDrops;

    @Column(name = "message_fault_injected_drops")
    private Integer messageFaultInjectedDrops;

    @Column(name = "raw_report", columnDefinition = "text")
    private String rawReport;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "run_event_counts",
        joinColumns = @JoinColumn(name = "run_db_id")
    )
    @MapKeyColumn(name = "count_key")
    @Column(name = "count_value", nullable = false)
    private Map<String, Integer> eventCounts = new LinkedHashMap<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "run_severity_counts",
        joinColumns = @JoinColumn(name = "run_db_id")
    )
    @MapKeyColumn(name = "count_key")
    @Column(name = "count_value", nullable = false)
    private Map<String, Integer> severityCounts = new LinkedHashMap<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "run_task_metrics",
        joinColumns = @JoinColumn(name = "run_db_id")
    )
    @MapKeyColumn(name = "task_name")
    private Map<String, TaskMetricEntity> taskMetrics = new LinkedHashMap<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "run_root_causes",
        joinColumns = @JoinColumn(name = "run_db_id")
    )
    @OrderColumn(name = "position")
    @Column(name = "root_cause", nullable = false, columnDefinition = "text")
    private List<String> rootCauses = new ArrayList<>();

    protected RunEntity() {
    }

    public RunEntity(
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

    public String getAnalysisPath() {
        return analysisPath;
    }

    public String getLogPath() {
        return logPath;
    }

    public String getRawReport() {
        return rawReport;
    }

    public void markCompleted(AnalysisResponse analysis) {
        this.status = RunStatus.COMPLETED;
        this.runtimeHealth = analysis.runtimeHealth();
        this.completedAt = Instant.now();

        this.eventsLoaded = analysis.eventsLoaded();
        this.simulationName = analysis.simulationName();
        this.schedulerMode = analysis.schedulerMode();
        this.configuredDurationSeconds = analysis.configuredDurationSeconds();
        this.observedDurationMs = analysis.observedDurationMs();

        if (analysis.messageSummary() != null) {
            this.messageSent = analysis.messageSummary().sent();
            this.messageReceived = analysis.messageSummary().received();
            this.messageDropped = analysis.messageSummary().dropped();
            this.messageQueueFullDrops = analysis.messageSummary().queueFullDrops();
            this.messageFaultInjectedDrops = analysis.messageSummary().faultInjectedDrops();
        }

        this.rawReport = analysis.rawReport();

        this.eventCounts.clear();
        this.eventCounts.putAll(analysis.eventCounts());

        this.severityCounts.clear();
        this.severityCounts.putAll(analysis.severityCounts());

        this.taskMetrics.clear();
        analysis.taskMetrics().forEach((taskName, metric) ->
            this.taskMetrics.put(taskName, TaskMetricEntity.fromResponse(metric))
        );

        this.rootCauses.clear();
        this.rootCauses.addAll(analysis.rootCauses());
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

    public AnalysisResponse toAnalysisResponse() {
        Map<String, com.minirtos.playground.dto.TaskMetricResponse> taskMetricResponses =
            new LinkedHashMap<>();

        taskMetrics.forEach((taskName, metric) ->
            taskMetricResponses.put(taskName, metric.toResponse())
        );

        MessageSummaryResponse messageSummary = new MessageSummaryResponse(
            valueOrZero(messageSent),
            valueOrZero(messageReceived),
            valueOrZero(messageDropped),
            valueOrZero(messageQueueFullDrops),
            valueOrZero(messageFaultInjectedDrops)
        );

        return new AnalysisResponse(
            runId,
            scenarioId,
            runtimeHealth,
            eventsLoaded,
            simulationName,
            schedulerMode,
            configuredDurationSeconds,
            observedDurationMs,
            new LinkedHashMap<>(eventCounts),
            new LinkedHashMap<>(severityCounts),
            taskMetricResponses,
            messageSummary,
            new ArrayList<>(rootCauses),
            rawReport
        );
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}
