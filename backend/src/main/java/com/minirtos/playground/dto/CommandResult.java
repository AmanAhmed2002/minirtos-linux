package com.minirtos.playground.dto;

public record CommandResult(
    int exitCode,
    String stdout,
    String stderr
) {
    public boolean succeeded() {
        return exitCode == 0;
    }
}
