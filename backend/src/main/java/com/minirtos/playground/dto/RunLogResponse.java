package com.minirtos.playground.dto;

public record RunLogResponse(
    String runId,
    String logPath,
    String content
) {
}
