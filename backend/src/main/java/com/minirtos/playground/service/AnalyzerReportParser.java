package com.minirtos.playground.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.minirtos.playground.dto.AnalysisResponse;
import com.minirtos.playground.dto.MessageSummaryResponse;
import com.minirtos.playground.dto.TaskMetricResponse;

@Service
public class AnalyzerReportParser {

    public AnalysisResponse parse(
        String runId,
        String scenarioId,
        String rawReport
    ) {
        String runtimeHealth = null;
        Integer eventsLoaded = null;
        String simulationName = null;
        String schedulerMode = null;
        Integer configuredDurationSeconds = null;
        Integer observedDurationMs = null;

        Map<String, Integer> eventCounts = new LinkedHashMap<>();
        Map<String, Integer> severityCounts = new LinkedHashMap<>();
        Map<String, TaskMetricResponse> taskMetrics = new LinkedHashMap<>();
        List<String> rootCauses = new ArrayList<>();

        MessageSummaryResponse messageSummary = new MessageSummaryResponse(0, 0, 0, 0, 0);

        String section = "";
        String currentTask = null;
        MutableTaskMetric currentTaskMetric = null;

        for (String rawLine : rawReport.split("\\R")) {
            String line = rawLine.stripTrailing();
            String trimmed = line.trim();

            if (trimmed.isBlank()) {
                continue;
            }

            if (trimmed.equals("Event counts:")) {
                section = "event_counts";
                continue;
            }

            if (trimmed.equals("Severity counts:")) {
                section = "severity_counts";
                continue;
            }

            if (trimmed.equals("Task summary:")) {
                section = "task_summary";
                continue;
            }

            if (trimmed.equals("Message summary:")) {
                section = "message_summary";
                continue;
            }

            if (trimmed.equals("Likely root causes:")) {
                section = "root_causes";
                continue;
            }

            if (trimmed.endsWith(":")) {
                String title = trimmed.substring(0, trimmed.length() - 1);

                if (List.of(
                    "Fault summary",
                    "Watchdog summary",
                    "Task failure summary",
                    "Anomaly Detector"
                ).contains(title)) {
                    section = title.toLowerCase().replace(" ", "_");
                    continue;
                }
            }

            if (trimmed.startsWith("Events loaded:")) {
                eventsLoaded = parseTrailingInteger(trimmed);
            } else if (trimmed.startsWith("Runtime status:")) {
                runtimeHealth = valueAfterColon(trimmed);
            } else if (trimmed.startsWith("Simulation:")) {
                simulationName = valueAfterColon(trimmed);
            } else if (trimmed.startsWith("Scheduler mode:")) {
                schedulerMode = valueAfterColon(trimmed);
            } else if (trimmed.startsWith("Configured duration:")) {
                configuredDurationSeconds = parseFirstInteger(valueAfterColon(trimmed));
            } else if (trimmed.startsWith("Observed log duration:")) {
                observedDurationMs = parseFirstInteger(valueAfterColon(trimmed));
            } else if (section.equals("event_counts") && trimmed.contains(":")) {
                putCounter(eventCounts, trimmed);
            } else if (section.equals("severity_counts") && trimmed.contains(":")) {
                putCounter(severityCounts, trimmed);
            } else if (section.equals("message_summary") && trimmed.contains(":")) {
                messageSummary = updateMessageSummary(messageSummary, trimmed);
            } else if (section.equals("root_causes") && trimmed.startsWith("- ")) {
                rootCauses.add(trimmed.substring(2));
            } else if (section.equals("task_summary")) {
                if (line.startsWith("  ") && !line.startsWith("    ") && trimmed.endsWith(":")) {
                    if (currentTask != null && currentTaskMetric != null) {
                        taskMetrics.put(currentTask, currentTaskMetric.toResponse());
                    }

                    currentTask = trimmed.substring(0, trimmed.length() - 1);
                    currentTaskMetric = new MutableTaskMetric();
                } else if (currentTaskMetric != null && trimmed.contains(":")) {
                    currentTaskMetric.update(trimmed);
                }
            }
        }

        if (currentTask != null && currentTaskMetric != null) {
            taskMetrics.put(currentTask, currentTaskMetric.toResponse());
        }

        return new AnalysisResponse(
            runId,
            scenarioId,
            runtimeHealth,
            eventsLoaded,
            simulationName,
            schedulerMode,
            configuredDurationSeconds,
            observedDurationMs,
            eventCounts,
            severityCounts,
            taskMetrics,
            messageSummary,
            rootCauses,
            rawReport
        );
    }

    private void putCounter(Map<String, Integer> counter, String line) {
        String key = line.substring(0, line.indexOf(':')).trim();
        Integer value = parseFirstInteger(valueAfterColon(line));

        if (value != null) {
            counter.put(key, value);
        }
    }

    private MessageSummaryResponse updateMessageSummary(MessageSummaryResponse current, String line) {
        String key = line.substring(0, line.indexOf(':')).trim();
        int value = parseFirstInteger(valueAfterColon(line), 0);

        return switch (key) {
            case "sent" -> new MessageSummaryResponse(
                value,
                current.received(),
                current.dropped(),
                current.queueFullDrops(),
                current.faultInjectedDrops()
            );
            case "received" -> new MessageSummaryResponse(
                current.sent(),
                value,
                current.dropped(),
                current.queueFullDrops(),
                current.faultInjectedDrops()
            );
            case "dropped" -> new MessageSummaryResponse(
                current.sent(),
                current.received(),
                value,
                current.queueFullDrops(),
                current.faultInjectedDrops()
            );
            case "queue_full_drops" -> new MessageSummaryResponse(
                current.sent(),
                current.received(),
                current.dropped(),
                value,
                current.faultInjectedDrops()
            );
            case "fault_injected_drops" -> new MessageSummaryResponse(
                current.sent(),
                current.received(),
                current.dropped(),
                current.queueFullDrops(),
                value
            );
            default -> current;
        };
    }

    private String valueAfterColon(String line) {
        int index = line.indexOf(':');

        if (index < 0 || index + 1 >= line.length()) {
            return "";
        }

        return line.substring(index + 1).trim();
    }

    private Integer parseTrailingInteger(String line) {
        return parseFirstInteger(valueAfterColon(line));
    }

    private Integer parseFirstInteger(String value) {
        return parseFirstInteger(value, null);
    }

    private Integer parseFirstInteger(String value, Integer defaultValue) {
        StringBuilder digits = new StringBuilder();

        for (char character : value.toCharArray()) {
            if (Character.isDigit(character)) {
                digits.append(character);
            } else if (digits.length() > 0) {
                break;
            }
        }

        if (digits.length() == 0) {
            return defaultValue;
        }

        return Integer.parseInt(digits.toString());
    }

    private static class MutableTaskMetric {
        private int runs;
        private int deadlineMisses;
        private int deadlineMissedEvents;
        private double avgDurationMs;
        private int maxDurationMs;

        void update(String line) {
            String key = line.substring(0, line.indexOf(':')).trim();
            String value = line.substring(line.indexOf(':') + 1).trim();

            switch (key) {
                case "runs" -> runs = parseInteger(value);
                case "deadline_misses" -> deadlineMisses = parseInteger(value);
                case "deadline_missed_events" -> deadlineMissedEvents = parseInteger(value);
                case "avg_duration_ms" -> avgDurationMs = parseDouble(value);
                case "max_duration_ms" -> maxDurationMs = parseInteger(value);
                default -> {
                    // Ignore fields the analyzer may add later.
                }
            }
        }

        TaskMetricResponse toResponse() {
            return new TaskMetricResponse(
                runs,
                deadlineMisses,
                deadlineMissedEvents,
                avgDurationMs,
                maxDurationMs
            );
        }

        private static int parseInteger(String value) {
            try {
                return Integer.parseInt(value);
            } catch (NumberFormatException exc) {
                return 0;
            }
        }

        private static double parseDouble(String value) {
            try {
                return Double.parseDouble(value);
            } catch (NumberFormatException exc) {
                return 0.0;
            }
        }
    }
}
