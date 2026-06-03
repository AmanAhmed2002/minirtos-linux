package com.minirtos.playground.config;

import java.nio.file.Path;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MiniRtosProperties {

    private final Path projectRoot;
    private final String runtimeBinary;
    private final String pythonCommand;
    private final String analyzerScript;
    private final String logsDir;
    private final String runsDir;
    private final int windowMs;
    private final Duration processTimeout;

    public MiniRtosProperties(
        @Value("${minirtos.project-root:..}") String projectRoot,
        @Value("${minirtos.runtime-binary:cpp-runtime/build/minirtos_runtime}") String runtimeBinary,
        @Value("${minirtos.python-command:python3}") String pythonCommand,
        @Value("${minirtos.analyzer-script:ai-analyzer/app/analyze.py}") String analyzerScript,
        @Value("${minirtos.logs-dir:logs}") String logsDir,
        @Value("${minirtos.runs-dir:runs}") String runsDir,
        @Value("${minirtos.window-ms:5000}") int windowMs,
        @Value("${minirtos.process-timeout-seconds:120}") long processTimeoutSeconds
    ) {
        this.projectRoot = Path.of(projectRoot);
        this.runtimeBinary = runtimeBinary;
        this.pythonCommand = pythonCommand;
        this.analyzerScript = analyzerScript;
        this.logsDir = logsDir;
        this.runsDir = runsDir;
        this.windowMs = windowMs;
        this.processTimeout = Duration.ofSeconds(processTimeoutSeconds);
    }

    public Path resolvedProjectRoot() {
        return projectRoot.toAbsolutePath().normalize();
    }

    public String runtimeBinary() {
        return runtimeBinary;
    }

    public String pythonCommand() {
        return pythonCommand;
    }

    public String analyzerScript() {
        return analyzerScript;
    }

    public String logsDir() {
        return logsDir;
    }

    public String runsDir() {
        return runsDir;
    }

    public int windowMs() {
        return windowMs;
    }

    public Duration processTimeout() {
        return processTimeout;
    }

    public Path resolvedRuntimeBinary() {
        return resolvedProjectRoot().resolve(runtimeBinary).normalize();
    }

    public Path resolvedAnalyzerScript() {
        return resolvedProjectRoot().resolve(analyzerScript).normalize();
    }

    public Path resolvedLogsDir() {
        return resolvedProjectRoot().resolve(logsDir).normalize();
    }

    public Path resolvedRunsDir() {
        return resolvedProjectRoot().resolve(runsDir).normalize();
    }

    public Path resolveConfigPath(String configPath) {
        return resolvedProjectRoot().resolve(configPath).normalize();
    }
}
