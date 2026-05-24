#pragma once

#include "Config.hpp"
#include "Task.hpp"

#include <optional>
#include <string>
#include <unordered_map>

struct WatchdogAlert {
    std::string task_name;
    int deadline_miss_count;
    int consecutive_miss_count;
    std::string reason;
    bool recovery_performed;
};

class Watchdog {
public:
    explicit Watchdog(const WatchdogConfig& config);

    bool isEnabled() const;

    std::optional<WatchdogAlert> inspectTask(
        const Task& task,
        long timestamp_ms
    );

    const WatchdogConfig& config() const;

private:
    WatchdogConfig config_;
    std::unordered_map<std::string, int> last_deadline_miss_count_;
    std::unordered_map<std::string, int> consecutive_miss_count_;
    std::unordered_map<std::string, long> next_recovery_allowed_time_ms_;
};
