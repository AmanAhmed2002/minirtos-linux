#include "Logger.hpp"

#include <chrono>
#include <filesystem>
#include <sstream>
#include <stdexcept>

Logger::Logger(const std::string& output_path)
    : start_time_(Clock::now()) {
    const std::filesystem::path log_path(output_path);
    const std::filesystem::path parent_path = log_path.parent_path();

    if (!parent_path.empty()) {
        std::filesystem::create_directories(parent_path);
    }

    output_file_.open(output_path, std::ios::out | std::ios::trunc);

    if (!output_file_.is_open()) {
        throw std::runtime_error("Failed to open log file: " + output_path);
    }
}

void Logger::logRuntimeStarted(
    const std::string& simulation_name,
    int duration_seconds,
    const std::string& scheduler_mode,
    int task_count
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"runtime_started\","
         << "\"severity\":\"info\","
         << "\"simulation_name\":\"" << escapeJsonString(simulation_name) << "\","
         << "\"duration_seconds\":" << duration_seconds << ","
         << "\"scheduler_mode\":\"" << escapeJsonString(scheduler_mode) << "\","
         << "\"task_count\":" << task_count
         << "}";

    writeLine(line.str());
}

void Logger::logSchedulerStarted(
    const std::string& scheduler_mode,
    int duration_seconds
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"scheduler_started\","
         << "\"severity\":\"info\","
         << "\"scheduler_mode\":\"" << escapeJsonString(scheduler_mode) << "\","
         << "\"duration_seconds\":" << duration_seconds
         << "}";

    writeLine(line.str());
}

void Logger::logTaskStarted(
    const std::string& task_name,
    int period_ms,
    int deadline_ms,
    int priority
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"task_started\","
         << "\"severity\":\"info\","
         << "\"task\":\"" << escapeJsonString(task_name) << "\","
         << "\"period_ms\":" << period_ms << ","
         << "\"deadline_ms\":" << deadline_ms << ","
         << "\"priority\":" << priority
         << "}";

    writeLine(line.str());
}

void Logger::logTaskCompleted(
    const std::string& task_name,
    long observed_duration_ms,
    int execution_time_ms,
    int deadline_ms,
    int run_count,
    int deadline_miss_count
) {
    const bool missed_deadline = observed_duration_ms > deadline_ms;

    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"task_completed\","
         << "\"severity\":\"" << (missed_deadline ? "warning" : "info") << "\","
         << "\"task\":\"" << escapeJsonString(task_name) << "\","
         << "\"observed_duration_ms\":" << observed_duration_ms << ","
         << "\"configured_execution_time_ms\":" << execution_time_ms << ","
         << "\"deadline_ms\":" << deadline_ms << ","
         << "\"deadline_missed\":" << (missed_deadline ? "true" : "false") << ","
         << "\"run_count\":" << run_count << ","
         << "\"deadline_miss_count\":" << deadline_miss_count
         << "}";

    writeLine(line.str());
}

void Logger::logMessageSent(
    const std::string& source_task,
    const std::string& target_task,
    const std::string& message_type,
    int sequence_id,
    int target_queue_depth,
    int target_queue_limit
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"message_sent\","
         << "\"severity\":\"info\","
         << "\"source_task\":\"" << escapeJsonString(source_task) << "\","
         << "\"target_task\":\"" << escapeJsonString(target_task) << "\","
         << "\"message_type\":\"" << escapeJsonString(message_type) << "\","
         << "\"sequence_id\":" << sequence_id << ","
         << "\"target_queue_depth\":" << target_queue_depth << ","
         << "\"target_queue_limit\":" << target_queue_limit
         << "}";

    writeLine(line.str());
}

void Logger::logMessageReceived(
    const std::string& source_task,
    const std::string& target_task,
    const std::string& message_type,
    int sequence_id,
    int remaining_queue_depth
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"message_received\","
         << "\"severity\":\"info\","
         << "\"source_task\":\"" << escapeJsonString(source_task) << "\","
         << "\"target_task\":\"" << escapeJsonString(target_task) << "\","
         << "\"message_type\":\"" << escapeJsonString(message_type) << "\","
         << "\"sequence_id\":" << sequence_id << ","
         << "\"remaining_queue_depth\":" << remaining_queue_depth
         << "}";

    writeLine(line.str());
}

void Logger::logMessageDropped(
    const std::string& source_task,
    const std::string& target_task,
    const std::string& message_type,
    int sequence_id,
    int target_queue_depth,
    int target_queue_limit,
    const std::string& reason
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"message_dropped\","
         << "\"severity\":\"warning\","
         << "\"source_task\":\"" << escapeJsonString(source_task) << "\","
         << "\"target_task\":\"" << escapeJsonString(target_task) << "\","
         << "\"message_type\":\"" << escapeJsonString(message_type) << "\","
         << "\"sequence_id\":" << sequence_id << ","
         << "\"target_queue_depth\":" << target_queue_depth << ","
         << "\"target_queue_limit\":" << target_queue_limit << ","
         << "\"reason\":\"" << escapeJsonString(reason) << "\""
         << "}";

    writeLine(line.str());
}

void Logger::logFaultInjectedSlowTask(
    const std::string& target_task,
    int extra_execution_time_ms
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"fault_injected\","
         << "\"severity\":\"warning\","
         << "\"fault_type\":\"slow_task\","
         << "\"target_task\":\"" << escapeJsonString(target_task) << "\","
         << "\"extra_execution_time_ms\":" << extra_execution_time_ms
         << "}";

    writeLine(line.str());
}

void Logger::logFaultInjectedCpuSpike(
    const std::string& target_task,
    int extra_execution_time_ms
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"fault_injected\","
         << "\"severity\":\"warning\","
         << "\"fault_type\":\"cpu_spike\","
         << "\"target_task\":\"" << escapeJsonString(target_task) << "\","
         << "\"extra_execution_time_ms\":" << extra_execution_time_ms
         << "}";

    writeLine(line.str());
}

void Logger::logFaultInjectedTaskCrash(
    const std::string& target_task,
    const std::string& reason
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"fault_injected\","
         << "\"severity\":\"error\","
         << "\"fault_type\":\"task_crash\","
         << "\"target_task\":\"" << escapeJsonString(target_task) << "\","
         << "\"reason\":\"" << escapeJsonString(reason) << "\""
         << "}";

    writeLine(line.str());
}

void Logger::logTaskFailed(
    const std::string& task_name,
    const std::string& fault_type,
    const std::string& reason
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"task_failed\","
         << "\"severity\":\"error\","
         << "\"fault_type\":\"" << escapeJsonString(fault_type) << "\","
         << "\"task\":\"" << escapeJsonString(task_name) << "\","
         << "\"reason\":\"" << escapeJsonString(reason) << "\""
         << "}";

    writeLine(line.str());
}

void Logger::logTaskSkipped(
    const std::string& task_name,
    const std::string& fault_type,
    const std::string& reason
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"task_skipped\","
         << "\"severity\":\"warning\","
         << "\"fault_type\":\"" << escapeJsonString(fault_type) << "\","
         << "\"task\":\"" << escapeJsonString(task_name) << "\","
         << "\"reason\":\"" << escapeJsonString(reason) << "\""
         << "}";

    writeLine(line.str());
}

void Logger::logFaultInjectedDroppedMessage(
    const std::string& source_task,
    const std::string& target_task,
    const std::string& message_type,
    int sequence_id,
    const std::string& reason
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"fault_injected\","
         << "\"severity\":\"warning\","
         << "\"fault_type\":\"dropped_messages\","
         << "\"source_task\":\"" << escapeJsonString(source_task) << "\","
         << "\"target_task\":\"" << escapeJsonString(target_task) << "\","
         << "\"message_type\":\"" << escapeJsonString(message_type) << "\","
         << "\"sequence_id\":" << sequence_id << ","
         << "\"reason\":\"" << escapeJsonString(reason) << "\""
         << "}";

    writeLine(line.str());
}

void Logger::logWatchdogTimeout(
    const std::string& task_name,
    int deadline_miss_count,
    int consecutive_miss_count,
    const std::string& reason
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"watchdog_timeout\","
         << "\"severity\":\"error\","
         << "\"task\":\"" << escapeJsonString(task_name) << "\","
         << "\"deadline_miss_count\":" << deadline_miss_count << ","
         << "\"consecutive_miss_count\":" << consecutive_miss_count << ","
         << "\"reason\":\"" << escapeJsonString(reason) << "\""
         << "}";

    writeLine(line.str());
}

void Logger::logTaskRecovered(
    const std::string& task_name,
    const std::string& recovery_action
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"task_recovered\","
         << "\"severity\":\"warning\","
         << "\"task\":\"" << escapeJsonString(task_name) << "\","
         << "\"recovery_action\":\"" << escapeJsonString(recovery_action) << "\""
         << "}";

    writeLine(line.str());
}


void Logger::logSchedulerFinished() {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"scheduler_finished\","
         << "\"severity\":\"info\""
         << "}";

    writeLine(line.str());
}

void Logger::logRuntimeSummary(
    const std::string& task_name,
    int run_count,
    int deadline_miss_count
) {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"runtime_summary\","
         << "\"severity\":\"info\","
         << "\"task\":\"" << escapeJsonString(task_name) << "\","
         << "\"run_count\":" << run_count << ","
         << "\"deadline_miss_count\":" << deadline_miss_count
         << "}";

    writeLine(line.str());
}

void Logger::logRuntimeFinished() {
    std::ostringstream line;

    line << "{"
         << "\"timestamp_ms\":" << timestampMs() << ","
         << "\"event_type\":\"runtime_finished\","
         << "\"severity\":\"info\""
         << "}";

    writeLine(line.str());
}

long Logger::timestampMs() const {
    const auto now = Clock::now();

    return std::chrono::duration_cast<std::chrono::milliseconds>(
        now - start_time_
    ).count();
}

void Logger::writeLine(const std::string& json_line) {
    std::lock_guard<std::mutex> lock(mutex_);

    output_file_ << json_line << '\n';
    output_file_.flush();
}

std::string Logger::escapeJsonString(const std::string& value) {
    std::ostringstream escaped;

    for (const char character : value) {
        switch (character) {
            case '"':
                escaped << "\\\"";
                break;
            case '\\':
                escaped << "\\\\";
                break;
            case '\b':
                escaped << "\\b";
                break;
            case '\f':
                escaped << "\\f";
                break;
            case '\n':
                escaped << "\\n";
                break;
            case '\r':
                escaped << "\\r";
                break;
            case '\t':
                escaped << "\\t";
                break;
            default:
                escaped << character;
                break;
        }
    }

    return escaped.str();
}
