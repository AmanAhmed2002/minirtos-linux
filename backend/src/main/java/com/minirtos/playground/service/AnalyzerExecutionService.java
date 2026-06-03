package com.minirtos.playground.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.springframework.stereotype.Service;

import com.minirtos.playground.config.MiniRtosProperties;
import com.minirtos.playground.dto.AnalysisResponse;
import com.minirtos.playground.dto.CommandResult;

@Service
public class AnalyzerExecutionService {

    private static final String ANALYSIS_REPORT = "analysis.txt";

    private final MiniRtosProperties properties;
    private final ProcessRunner processRunner;
    private final AnalyzerReportParser reportParser;

    public AnalyzerExecutionService(
        MiniRtosProperties properties,
        ProcessRunner processRunner,
        AnalyzerReportParser reportParser
    ) {
        this.properties = properties;
        this.processRunner = processRunner;
        this.reportParser = reportParser;
    }

    public AnalysisResponse analyzeRun(String runId, String scenarioId, Path runDirectory)
        throws IOException, InterruptedException {

        Path projectRoot = properties.resolvedProjectRoot();
        Path analyzerScript = properties.resolvedAnalyzerScript();
        Path runLog = runDirectory.resolve("runtime_logs.jsonl");

        requireExistingFile(analyzerScript, "Analyzer script");
        requireExistingFile(runLog, "Run log");

        CommandResult result = processRunner.run(
            List.of(
                properties.pythonCommand(),
                analyzerScript.toString(),
                "--log",
                runLog.toString(),
                "--window-ms",
                String.valueOf(properties.windowMs())
            ),
            projectRoot,
            properties.processTimeout()
        );

        String combinedReport = result.stdout();

        if (!result.stderr().isBlank()) {
            combinedReport = combinedReport + System.lineSeparator() + result.stderr();
        }

        Files.writeString(runDirectory.resolve(ANALYSIS_REPORT), combinedReport);

        if (!result.succeeded()) {
            throw new IOException("Analyzer failed with exit code " + result.exitCode() + ": " + result.stderr());
        }

        return reportParser.parse(runId, scenarioId, combinedReport);
    }

    private void requireExistingFile(Path path, String description) throws IOException {
        if (!Files.isRegularFile(path)) {
            throw new IOException(description + " not found: " + path);
        }
    }
}
