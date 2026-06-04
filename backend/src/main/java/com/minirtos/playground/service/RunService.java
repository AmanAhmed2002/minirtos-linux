package com.minirtos.playground.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.minirtos.playground.config.MiniRtosProperties;
import com.minirtos.playground.dto.AnalysisResponse;
import com.minirtos.playground.dto.CommandResult;
import com.minirtos.playground.dto.CreateRunRequest;
import com.minirtos.playground.dto.RunSummaryResponse;
import com.minirtos.playground.dto.ScenarioResponse;
import com.minirtos.playground.persistence.RunEntity;
import com.minirtos.playground.persistence.RunRepository;

@Service
public class RunService {

    private final ScenarioService scenarioService;
    private final RuntimeExecutionService runtimeExecutionService;
    private final AnalyzerExecutionService analyzerExecutionService;
    private final MiniRtosProperties properties;
    private final RunRepository runRepository;

    public RunService(
        ScenarioService scenarioService,
        RuntimeExecutionService runtimeExecutionService,
        AnalyzerExecutionService analyzerExecutionService,
        MiniRtosProperties properties,
        RunRepository runRepository
    ) {
        this.scenarioService = scenarioService;
        this.runtimeExecutionService = runtimeExecutionService;
        this.analyzerExecutionService = analyzerExecutionService;
        this.properties = properties;
        this.runRepository = runRepository;
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

        RunEntity runEntity = new RunEntity(
            runId,
            scenario.id(),
            scenario.name(),
            relativeRunLogPath,
            relativeAnalysisPath,
            Instant.now()
        );

        runEntity = runRepository.save(runEntity);

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

                runEntity.markFailed(error.strip());
                return runRepository.save(runEntity).toSummaryResponse();
            }

            AnalysisResponse analysis = analyzerExecutionService.analyzeRun(
                runId,
                scenario.id(),
                runDirectory
            );

            runEntity.markCompleted(analysis);
            return runRepository.save(runEntity).toSummaryResponse();
        } catch (IOException | InterruptedException exc) {
            if (exc instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }

            runEntity.markFailed(exc.getMessage());
            return runRepository.save(runEntity).toSummaryResponse();
        }
    }

    @Transactional(readOnly = true)
    public List<RunSummaryResponse> getRuns() {
        return runRepository.findAllByOrderByCreatedAtDesc()
            .stream()
            .map(RunEntity::toSummaryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public RunSummaryResponse getRun(String runId) {
        return getEntity(runId).toSummaryResponse();
    }

    @Transactional(readOnly = true)
    public AnalysisResponse getAnalysis(String runId) {
        RunEntity entity = getEntity(runId);

        if (entity.getRawReport() == null || entity.getRawReport().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Analysis is not available for runId: " + runId
            );
        }

        return entity.toAnalysisResponse();
    }

    private RunEntity getEntity(String runId) {
        return runRepository.findByRunId(runId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Run not found: " + runId
            ));
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
