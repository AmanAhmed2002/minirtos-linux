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

struct RuntimeConfig {
    std::string simulation_name;
    int duration_seconds;
    std::string scheduler_mode;
    std::vector<TaskConfig> tasks;
};

RuntimeConfig loadConfigFromFile(const std::string& config_path);
