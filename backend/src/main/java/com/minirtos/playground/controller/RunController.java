package com.minirtos.playground.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.minirtos.playground.dto.AnalysisResponse;
import com.minirtos.playground.dto.CreateRunRequest;
import com.minirtos.playground.dto.RunSummaryResponse;
import com.minirtos.playground.service.RunService;

import jakarta.validation.Valid;

@RestController
public class RunController {

    private final RunService runService;

    public RunController(RunService runService) {
        this.runService = runService;
    }

    @PostMapping("/api/runs")
    @ResponseStatus(HttpStatus.CREATED)
    public RunSummaryResponse createRun(@Valid @RequestBody CreateRunRequest request) {
        return runService.createRun(request);
    }

    @GetMapping("/api/runs")
    public List<RunSummaryResponse> getRuns() {
        return runService.getRuns();
    }

    @GetMapping("/api/runs/{runId}")
    public RunSummaryResponse getRun(@PathVariable String runId) {
        return runService.getRun(runId);
    }

    @GetMapping("/api/runs/{runId}/analysis")
    public AnalysisResponse getAnalysis(@PathVariable String runId) {
        return runService.getAnalysis(runId);
    }
}
