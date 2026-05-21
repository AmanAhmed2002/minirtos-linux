#include "Config.hpp"

#include <exception>
#include <iostream>
#include <string>

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

        std::cout << "[INFO] Task details:" << std::endl;

        for (const auto& task : config.tasks) {
            std::cout << "[INFO] - name=" << task.name
                      << ", period_ms=" << task.period_ms
                      << ", deadline_ms=" << task.deadline_ms
                      << ", priority=" << task.priority
                      << ", execution_time_ms=" << task.execution_time_ms
                      << ", queue_limit=" << task.queue_limit
                      << std::endl;
        }

        return 0;
    } catch (const std::exception& error) {
        std::cerr << "[ERROR] " << error.what() << std::endl;
        return 1;
    }
}
