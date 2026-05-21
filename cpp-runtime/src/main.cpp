#include "Config.hpp"
#include "Task.hpp"

#include <exception>
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char* argv[]) {
    std::string config_path;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "--config") {
            if (i + 1 >= argc) {
                std::cerr << "[ERROR] Missing value after --config" << std::endl;
                return 1;
            }

            config_path = argv[i + 1];
            ++i;
        } else {
            std::cerr << "[ERROR] Unknown argument: " << arg << std::endl;
            return 1;
        }
    }

    if (config_path.empty()) {
        std::cerr << "[ERROR] Usage: ./minirtos_runtime --config <path-to-config.json>" << std::endl;
        return 1;
    }

    try {
        RuntimeConfig config = loadConfigFromFile(config_path);

        std::cout << "[INFO] Runtime config loaded" << std::endl;
        std::cout << "[INFO] simulation_name=" << config.simulation_name << std::endl;
        std::cout << "[INFO] duration_seconds=" << config.duration_seconds << std::endl;
        std::cout << "[INFO] scheduler_mode=" << config.scheduler_mode << std::endl;
        std::cout << "[INFO] tasks_loaded=" << config.tasks.size() << std::endl;

        const Task::TimePoint start_time = Task::Clock::now();
        std::vector<Task> tasks;

        tasks.reserve(config.tasks.size());

        for (const auto& task_config : config.tasks) {
            tasks.emplace_back(task_config, start_time);
        }

        std::cout << "[INFO] Runtime tasks constructed" << std::endl;

        for (const auto& task : tasks) {
            std::cout << "[INFO] - " << task.name()
                      << " period_ms=" << task.periodMs()
                      << " deadline_ms=" << task.deadlineMs()
                      << " priority=" << task.priority()
                      << " execution_time_ms=" << task.executionTimeMs()
                      << " queue_limit=" << task.queueLimit()
                      << " run_count=" << task.runCount()
                      << " deadline_miss_count=" << task.deadlineMissCount()
                      << std::endl;
        }

        return 0;
    } catch (const std::exception& error) {
        std::cerr << "[ERROR] " << error.what() << std::endl;
        return 1;
    }
}
