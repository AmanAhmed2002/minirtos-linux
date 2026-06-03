package com.minirtos.playground.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;

import com.minirtos.playground.dto.CommandResult;

@Service
public class ProcessRunner {

    public CommandResult run(List<String> command, Path workingDirectory, Duration timeout)
        throws IOException, InterruptedException {

        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.directory(workingDirectory.toFile());
        processBuilder.redirectErrorStream(true);

        Process process = processBuilder.start();

        CompletableFuture<String> outputFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return new String(
                    process.getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8
                );
            } catch (IOException exc) {
                return "[ERROR] Failed to read process output: " + exc.getMessage();
            }
        });

        boolean finished = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);

        if (!finished) {
            process.destroyForcibly();

            String output = outputFuture
                .completeOnTimeout("", 2, TimeUnit.SECONDS)
                .join();

            return new CommandResult(
                -1,
                output,
                "Process timed out after " + timeout.toSeconds() + " seconds."
            );
        }

        String output = outputFuture.join();

        return new CommandResult(
            process.exitValue(),
            output,
            ""
        );
    }
}
