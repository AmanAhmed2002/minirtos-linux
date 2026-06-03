package com.minirtos.playground.dto;

public record MessageSummaryResponse(
    int sent,
    int received,
    int dropped,
    int queueFullDrops,
    int faultInjectedDrops
) {
}
