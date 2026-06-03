package com.minirtos.playground.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.minirtos.playground.config.MiniRtosProperties;
import com.minirtos.playground.dto.AnalysisResponse;
import com.minirtos.playground.dto.CommandResult;
import com.minirtos.playground.dto.CreateRunRequest;
import com.minirtos.playground.dto.RunSummaryResponse;
import com.minirtos.playground.dto.ScenarioResponse;
import com.minirtos.playground.model.RunRecord;

@Service
public class RunService {

    private final ScenarioService scenarioService;
    private final RuntimeExecutionService runtimeExecutionService;
    private final AnalyzerExecutionService analyzerExecutionService;
    private final MiniRtosProperties properties;
    private final Map<String, RunRecord> runs = new ConcurrentHashMap<>();

    public RunService(
        ScenarioService scenarioService,
        RuntimeExecutionService runtimeExecutionService,
        AnalyzerExecutionService analyzerExecutionService,
        MiniRtosProperties properties
    ) {
        this.scenarioService = scenarioService;
        this.runtimeExecutionService = runtimeExecutionService;
        this.analyzerExecutionService = analyzerExecutionService;
        this.properties = properties;
    }

    public RunSummaryResponse createRun(CreateRunRequest request) {
        ScenarioResponse scenario = scenarioService.findById(request.scenarioId())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Unknown scenarioId: " + request.scenarioId()
            ));

        String runId = createRunId(scenario.id());
        Path runDirectory = properties.resolvedRunsDir().resolve(runId).normalize();

        String relativeRunLogPath = properties.resolvedProjectRoot()
            .relativize(runDirectory.resolve("runtime_logs.jsonl"))
            .toString();

        String relativeAnalysisPath = properties.resolvedProjectRoot()
            .relativize(runDirectory.resolve("analysis.txt"))
            .toString();

        RunRecord record = new RunRecord(
            runId,
            scenario.id(),
            scenario.name(),
            relativeRunLogPath,
            relativeAnalysisPath,
            Instant.now()
        );

        runs.put(runId, record);

        try {
            Files.createDirectories(runDirectory);

            CommandResult runtimeResult = runtimeExecutionService.runScenario(
                scenario,
                runDirectory
            );

            if (!runtimeResult.succeeded()) {
                String error = "Runtime failed with exit code "
                    + runtimeResult.exitCode()
                    + ". "
                    + runtimeResult.stderr();

                record.markFailed(error.strip());
                return record.toSummaryResponse();
            }

            AnalysisResponse analysis = analyzerExecutionService.analyzeRun(
                runId,
                scenario.id(),
                runDirectory
            );

            record.markCompleted(analysis);
            return record.toSummaryResponse();
        } catch (IOException | InterruptedException exc) {
            if (exc instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }

            record.markFailed(exc.getMessage());
            return record.toSummaryResponse();
        }
    }

    public List<RunSummaryResponse> getRuns() {
        return new ArrayList<>(runs.values()).stream()
            .sorted(Comparator.comparing(RunRecord::getRunId).reversed())
            .map(RunRecord::toSummaryResponse)
            .toList();
    }

    public RunSummaryResponse getRun(String runId) {
        return getRecord(runId).toSummaryResponse();
    }

    public AnalysisResponse getAnalysis(String runId) {
        RunRecord record = getRecord(runId);

        if (record.getAnalysis() == null) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Analysis is not available for runId: " + runId
            );
        }

        return record.getAnalysis();
    }

    private RunRecord getRecord(String runId) {
        RunRecord record = runs.get(runId);

        if (record == null) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Run not found: " + runId
            );
        }

        return record;
    }

    private String createRunId(String scenarioId) {
        String timestamp = DateTimeFormatter.ISO_INSTANT
            .format(Instant.now())
            .replace(":", "")
            .replace(".", "-");

        String suffix = UUID.randomUUID().toString().substring(0, 8);

        return timestamp + "-" + scenarioId.replace('_', '-') + "-" + suffix;
    }
}
