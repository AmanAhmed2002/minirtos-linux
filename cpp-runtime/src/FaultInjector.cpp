#include "FaultInjector.hpp"

#include <random>

FaultInjector::FaultInjector(const FaultConfig& config)
    : config_(config),
      rng_(std::random_device{}()) {
}

bool FaultInjector::isEnabled() const {
    return config_.enabled;
}

bool FaultInjector::shouldSlowTask(
    const std::string& task_name,
    long timestamp_ms
) const {
    return config_.enabled &&
           config_.type == "slow_task" &&
           config_.target_task == task_name &&
           hasStarted(timestamp_ms);
}

int FaultInjector::extraExecutionTimeMs(
    const std::string& task_name,
    long timestamp_ms
) const {
    if (!shouldSlowTask(task_name, timestamp_ms)) {
        return 0;
    }

    return config_.extra_execution_time_ms;
}

bool FaultInjector::shouldCpuSpikeTask(
    const std::string& task_name,
    long timestamp_ms
) const {
    return config_.enabled &&
           config_.type == "cpu_spike" &&
           config_.target_task == task_name &&
           hasStarted(timestamp_ms);
}

int FaultInjector::cpuSpikeExtraExecutionTimeMs(
    const std::string& task_name,
    long timestamp_ms
) const {
    if (!shouldCpuSpikeTask(task_name, timestamp_ms)) {
        return 0;
    }

    return config_.extra_execution_time_ms;
}

bool FaultInjector::shouldDropMessage(
    const Message& message,
    long timestamp_ms
) {
    if (!config_.enabled || config_.type != "dropped_messages" || !hasStarted(timestamp_ms)) {
        return false;
    }

    const bool target_matches =
        config_.target_task == message.target_task ||
        config_.target_task == message.source_task;

    if (!target_matches) {
        return false;
    }

    if (config_.drop_probability_percent <= 0) {
        return false;
    }

    if (config_.drop_probability_percent >= 100) {
        return true;
    }

    std::uniform_int_distribution<int> distribution(1, 100);
    return distribution(rng_) <= config_.drop_probability_percent;
}

const FaultConfig& FaultInjector::config() const {
    return config_;
}

bool FaultInjector::hasStarted(long timestamp_ms) const {
    return timestamp_ms >= config_.start_after_ms;
}
