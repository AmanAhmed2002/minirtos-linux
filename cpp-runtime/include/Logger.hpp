#pragma once

#include <chrono>
#include <fstream>
#include <mutex>
#include <string>

class Logger {
public:
    using Clock = std::chrono::steady_clock;
    using TimePoint = Clock::time_point;

    explicit Logger(const std::string& output_path);

    void logRuntimeStarted(
        const std::string& simulation_name,
        int duration_seconds,
        const std::string& scheduler_mode,
        int task_count
    );

    void logSchedulerStarted(
        const std::string& scheduler_mode,
        int duration_seconds
    );

    void logTaskStarted(
        const std::string& task_name,
        int period_ms,
        int deadline_ms,
        int priority
    );

    void logTaskCompleted(
        const std::string& task_name,
        long observed_duration_ms,
        int execution_time_ms,
        int deadline_ms,
        int run_count,
        int deadline_miss_count
    );

    void logMessageSent(
        const std::string& source_task,
        const std::string& target_task,
        const std::string& message_type,
        int sequence_id,
        int target_queue_depth,
        int target_queue_limit
    );

    void logMessageReceived(
        const std::string& source_task,
        const std::string& target_task,
        const std::string& message_type,
        int sequence_id,
        int remaining_queue_depth
    );

    void logMessageDropped(
        const std::string& source_task,
        const std::string& target_task,
        const std::string& message_type,
        int sequence_id,
        int target_queue_depth,
        int target_queue_limit,
        const std::string& reason
    );

    void logFaultInjectedSlowTask(
        const std::string& target_task,
        int extra_execution_time_ms
    );

    void logFaultInjectedDroppedMessage(
        const std::string& source_task,
        const std::string& target_task,
        const std::string& message_type,
        int sequence_id,
        const std::string& reason
    );

    void logSchedulerFinished();

    void logRuntimeSummary(
        const std::string& task_name,
        int run_count,
        int deadline_miss_count
    );

    void logRuntimeFinished();

private:
    long timestampMs() const;

    void writeLine(const std::string& json_line);

    static std::string escapeJsonString(const std::string& value);

    TimePoint start_time_;
    std::ofstream output_file_;
    std::mutex mutex_;
};
