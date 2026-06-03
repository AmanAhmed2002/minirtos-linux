package com.minirtos.playground.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.minirtos.playground.dto.ScenarioResponse;
import com.minirtos.playground.service.ScenarioService;

@RestController
public class ScenarioController {

    private final ScenarioService scenarioService;

    public ScenarioController(ScenarioService scenarioService) {
        this.scenarioService = scenarioService;
    }

    @GetMapping("/api/scenarios")
    public List<ScenarioResponse> getScenarios() {
        return scenarioService.getScenarios();
    }
}
