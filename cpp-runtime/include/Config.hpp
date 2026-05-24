#pragma once

#include <string>
#include <vector>

struct TaskConfig {
    std::string name;
    int period_ms;
    int deadline_ms;
    int priority;
    int execution_time_ms;
    int queue_limit;
};

struct FaultConfig {
    bool enabled = false;
    std::string type;
    std::string target_task;
    int start_after_ms = 0;
    int extra_execution_time_ms = 0;
    int drop_probability_percent = 0;
};

struct RuntimeConfig {
    std::string simulation_name;
    int duration_seconds;
    std::string scheduler_mode;
    FaultConfig faults;
    std::vector<TaskConfig> tasks;
};

RuntimeConfig loadConfigFromFile(const std::string& config_path);
