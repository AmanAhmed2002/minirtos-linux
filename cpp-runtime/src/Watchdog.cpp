#include "Watchdog.hpp"

Watchdog::Watchdog(const WatchdogConfig& config)
    : config_(config) {
}

bool Watchdog::isEnabled() const {
    return config_.enabled;
}

std::optional<WatchdogAlert> Watchdog::inspectTask(
    const Task& task,
    long timestamp_ms
) {
    if (!config_.enabled) {
        return std::nullopt;
    }

    const std::string& task_name = task.name();
    const int current_deadline_miss_count = task.deadlineMissCount();

    const int previous_deadline_miss_count =
        last_deadline_miss_count_.contains(task_name)
            ? last_deadline_miss_count_.at(task_name)
            : current_deadline_miss_count;

    last_deadline_miss_count_[task_name] = current_deadline_miss_count;

    const bool new_deadline_miss =
        current_deadline_miss_count > previous_deadline_miss_count;

    if (new_deadline_miss) {
        ++consecutive_miss_count_[task_name];
    } else {
        consecutive_miss_count_[task_name] = 0;
    }

    const int consecutive_misses = consecutive_miss_count_[task_name];

    if (consecutive_misses < config_.max_consecutive_deadline_misses) {
        return std::nullopt;
    }

    const long next_allowed_recovery_time =
        next_recovery_allowed_time_ms_.contains(task_name)
            ? next_recovery_allowed_time_ms_.at(task_name)
            : 0;

    if (timestamp_ms < next_allowed_recovery_time) {
        return std::nullopt;
    }

    bool recovery_performed = false;

    if (config_.recovery_enabled) {
        recovery_performed = true;
        next_recovery_allowed_time_ms_[task_name] =
            timestamp_ms + config_.recovery_cooldown_ms;

        consecutive_miss_count_[task_name] = 0;
    }

    return WatchdogAlert{
        task_name,
        current_deadline_miss_count,
        consecutive_misses,
        "consecutive_deadline_misses",
        recovery_performed
    };
}

const WatchdogConfig& Watchdog::config() const {
    return config_;
}
