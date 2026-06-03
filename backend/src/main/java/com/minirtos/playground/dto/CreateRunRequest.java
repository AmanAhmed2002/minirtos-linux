package com.minirtos.playground.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateRunRequest(
    @NotBlank(message = "scenarioId is required")
    String scenarioId
) {
}
