package com.minirtos.playground.persistence;

import com.minirtos.playground.dto.TaskMetricResponse;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class TaskMetricEntity {

    @Column(name = "runs", nullable = false)
    private int runs;

    @Column(name = "deadline_misses", nullable = false)
    private int deadlineMisses;

    @Column(name = "deadline_missed_events", nullable = false)
    private int deadlineMissedEvents;

    @Column(name = "avg_duration_ms", nullable = false)
    private double avgDurationMs;

    @Column(name = "max_duration_ms", nullable = false)
    private int maxDurationMs;

    protected TaskMetricEntity() {
    }

    public TaskMetricEntity(
        int runs,
        int deadlineMisses,
        int deadlineMissedEvents,
        double avgDurationMs,
        int maxDurationMs
    ) {
        this.runs = runs;
        this.deadlineMisses = deadlineMisses;
        this.deadlineMissedEvents = deadlineMissedEvents;
        this.avgDurationMs = avgDurationMs;
        this.maxDurationMs = maxDurationMs;
    }

    public static TaskMetricEntity fromResponse(TaskMetricResponse response) {
        return new TaskMetricEntity(
            response.runs(),
            response.deadlineMisses(),
            response.deadlineMissedEvents(),
            response.avgDurationMs(),
            response.maxDurationMs()
        );
    }

    public TaskMetricResponse toResponse() {
        return new TaskMetricResponse(
            runs,
            deadlineMisses,
            deadlineMissedEvents,
            avgDurationMs,
            maxDurationMs
        );
    }
}
