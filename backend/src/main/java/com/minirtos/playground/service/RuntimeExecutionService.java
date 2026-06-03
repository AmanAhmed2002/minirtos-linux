package com.minirtos.playground.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;

import org.springframework.stereotype.Service;

import com.minirtos.playground.config.MiniRtosProperties;
import com.minirtos.playground.dto.CommandResult;
import com.minirtos.playground.dto.ScenarioResponse;

@Service
public class RuntimeExecutionService {

    private static final String ACTIVE_RUNTIME_LOG = "runtime_logs.jsonl";

    private final MiniRtosProperties properties;
    private final ProcessRunner processRunner;

    public RuntimeExecutionService(MiniRtosProperties properties, ProcessRunner processRunner) {
        this.properties = properties;
        this.processRunner = processRunner;
    }

    public CommandResult runScenario(ScenarioResponse scenario, Path runDirectory)
        throws IOException, InterruptedException {

        Path projectRoot = properties.resolvedProjectRoot();
        Path runtimeBinary = properties.resolvedRuntimeBinary();
        Path configPath = properties.resolveConfigPath(scenario.configPath());

        requireExistingFile(runtimeBinary, "Runtime binary");
        requireExistingFile(configPath, "Scenario config");

        Files.createDirectories(properties.resolvedLogsDir());
        Files.createDirectories(runDirectory);

        CommandResult result = processRunner.run(
            List.of(runtimeBinary.toString(), "--config", configPath.toString()),
            projectRoot,
            properties.processTimeout()
        );

        if (result.succeeded()) {
            Path activeLogPath = properties.resolvedLogsDir().resolve(ACTIVE_RUNTIME_LOG);
            requireExistingFile(activeLogPath, "Runtime log");

            Files.copy(
                activeLogPath,
                runDirectory.resolve(ACTIVE_RUNTIME_LOG),
                StandardCopyOption.REPLACE_EXISTING
            );
        }

        return result;
    }

    private void requireExistingFile(Path path, String description) throws IOException {
        if (!Files.isRegularFile(path)) {
            throw new IOException(description + " not found: " + path);
        }
    }
}
