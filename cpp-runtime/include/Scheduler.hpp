#pragma once

#include "Logger.hpp"
#include "Task.hpp"

#include <string>
#include <vector>

class Scheduler {
public:
    Scheduler(
        std::string mode,
        int duration_seconds,
        std::vector<Task> tasks,
        Logger& logger
    );

    void run();

private:
    void runRoundRobin();
    void printSummary() const;

    std::string mode_;
    int duration_seconds_;
    std::vector<Task> tasks_;
    Logger& logger_;
};
