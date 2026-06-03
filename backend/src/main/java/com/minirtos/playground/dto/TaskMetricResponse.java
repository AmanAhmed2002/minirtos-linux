package com.minirtos.playground.dto;

public record TaskMetricResponse(
    int runs,
    int deadlineMisses,
    int deadlineMissedEvents,
    double avgDurationMs,
    int maxDurationMs
) {
}
