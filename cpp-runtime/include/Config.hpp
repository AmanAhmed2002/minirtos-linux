#pragma once

#include <string>
#include <vector>

struct TaskConfig {
    std::string name;
    int period_ms = 0;
    int deadline_ms = 0;
    int priority = 0;
    int execution_time_ms = 0;
    int queue_limit = 0;
};

struct FaultConfig {
    bool enabled = false;
    std::string type;
    std::string target_task;
    int start_after_ms = 0;
    int extra_execution_time_ms = 0;
    int drop_probability_percent = 0;
};

struct WatchdogConfig {
    bool enabled = false;
    int check_interval_ms = 100;
    int max_consecutive_deadline_misses = 3;
    bool recovery_enabled = true;
    int recovery_cooldown_ms = 1000;
};

struct RuntimeConfig {
    std::string simulation_name;
    int duration_seconds = 0;
    std::string scheduler_mode;
    std::vector<TaskConfig> tasks;
    FaultConfig faults;
    WatchdogConfig watchdog;
};

RuntimeConfig loadConfigFromFile(const std::string& config_path);
