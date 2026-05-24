#include "Config.hpp"

#include <fstream>
#include <stdexcept>

#include <nlohmann/json.hpp>

using json = nlohmann::json;

namespace {
int readOptionalInt(const json& object, const std::string& key, int default_value) {
    if (!object.contains(key) || object.at(key).is_null()) {
        return default_value;
    }

    return object.at(key).get<int>();
}

std::string readOptionalString(
    const json& object,
    const std::string& key,
    const std::string& default_value
) {
    if (!object.contains(key) || object.at(key).is_null()) {
        return default_value;
    }

    return object.at(key).get<std::string>();
}

bool readOptionalBool(const json& object, const std::string& key, bool default_value) {
    if (!object.contains(key) || object.at(key).is_null()) {
        return default_value;
    }

    return object.at(key).get<bool>();
}

void validateFaultConfig(const FaultConfig& faults) {
    if (!faults.enabled) {
        return;
    }

    if (faults.type != "slow_task" && faults.type != "dropped_messages") {
        throw std::runtime_error(
            "Unsupported fault type: " + faults.type +
            ". Supported fault types are slow_task and dropped_messages."
        );
    }

    if (faults.target_task.empty()) {
        throw std::runtime_error("Fault config target_task cannot be empty when faults are enabled");
    }

    if (faults.start_after_ms < 0) {
        throw std::runtime_error("Fault config start_after_ms cannot be negative");
    }

    if (faults.type == "slow_task" && faults.extra_execution_time_ms <= 0) {
        throw std::runtime_error(
            "slow_task fault requires extra_execution_time_ms greater than 0"
        );
    }

    if (
        faults.type == "dropped_messages" &&
        (faults.drop_probability_percent < 0 || faults.drop_probability_percent > 100)
    ) {
        throw std::runtime_error(
            "dropped_messages fault requires drop_probability_percent between 0 and 100"
        );
    }
}
}

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

    if (parsed_config.contains("faults") && !parsed_config.at("faults").is_null()) {
        const json& fault_json = parsed_config.at("faults");

        config.faults.enabled = readOptionalBool(fault_json, "enabled", false);
        config.faults.type = readOptionalString(fault_json, "type", "");
        config.faults.target_task = readOptionalString(fault_json, "target_task", "");
        config.faults.start_after_ms = readOptionalInt(fault_json, "start_after_ms", 0);
        config.faults.extra_execution_time_ms = readOptionalInt(
            fault_json,
            "extra_execution_time_ms",
            0
        );
        config.faults.drop_probability_percent = readOptionalInt(
            fault_json,
            "drop_probability_percent",
            0
        );
    }

    validateFaultConfig(config.faults);

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
