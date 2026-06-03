package com.minirtos.playground.dto;

import java.util.List;

public record ScenarioResponse(
    String id,
    String name,
    String schedulerMode,
    String difficulty,
    String concept,
    String description,
    String configPath,
    List<String> teaches,
    List<String> expectedSignals
) {
}
