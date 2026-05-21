#include "Config.hpp"

#include <fstream>
#include <stdexcept>

#include <nlohmann/json.hpp>

using json = nlohmann::json;

RuntimeConfig loadConfigFromFile(const std::string& config_path) {
    std::ifstream config_file(config_path);

    if (!config_file.is_open()) {
        throw std::runtime_error("Failed to open config file: " + config_path);
    }

    json parsed_config;
    config_file >> parsed_config;

    RuntimeConfig config;
    config.simulation_name = parsed_config.at("simulation_name").get<std::string>();
    config.duration_seconds = parsed_config.at("duration_seconds").get<int>();
    config.scheduler_mode = parsed_config.at("scheduler_mode").get<std::string>();

    for (const auto& task_json : parsed_config.at("tasks")) {
        TaskConfig task;
        task.name = task_json.at("name").get<std::string>();
        task.period_ms = task_json.at("period_ms").get<int>();
        task.deadline_ms = task_json.at("deadline_ms").get<int>();
        task.priority = task_json.at("priority").get<int>();
        task.execution_time_ms = task_json.at("execution_time_ms").get<int>();
        task.queue_limit = task_json.at("queue_limit").get<int>();

        config.tasks.push_back(task);
    }

    return config;
}
