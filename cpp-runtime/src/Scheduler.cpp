#include "Scheduler.hpp"

#include <chrono>
#include <iostream>
#include <stdexcept>
#include <thread>
#include <utility>

Scheduler::Scheduler(std::string mode, int duration_seconds, std::vector<Task> tasks)
    : mode_(std::move(mode)),
      duration_seconds_(duration_seconds),
      tasks_(std::move(tasks)) {
}

void Scheduler::run() {
    if (duration_seconds_ <= 0) {
        throw std::runtime_error("duration_seconds must be greater than 0");
    }

    if (tasks_.empty()) {
        throw std::runtime_error("scheduler cannot run with zero tasks");
    }

    std::cout << "[INFO] Scheduler starting mode=" << mode_
              << " duration_seconds=" << duration_seconds_
              << std::endl;

    if (mode_ == "round_robin") {
        runRoundRobin();
    } else {
        throw std::runtime_error("Unsupported scheduler mode: " + mode_);
    }

    std::cout << "[INFO] Scheduler finished" << std::endl;
    printSummary();
}

void Scheduler::runRoundRobin() {
    const Task::TimePoint start_time = Task::Clock::now();
    const Task::TimePoint end_time = start_time + std::chrono::seconds(duration_seconds_);

    while (Task::Clock::now() < end_time) {
        bool ran_task_this_cycle = false;

        for (auto& task : tasks_) {
            const Task::TimePoint now = Task::Clock::now();

            if (now >= end_time) {
                break;
            }

            if (task.shouldRun(now)) {
                std::cout << "[INFO] Running task=" << task.name() << std::endl;

                const Task::TimePoint before_run = Task::Clock::now();
                task.run(now);
                const Task::TimePoint after_run = Task::Clock::now();

                const auto observed_duration_ms =
                    std::chrono::duration_cast<std::chrono::milliseconds>(
                        after_run - before_run
                    ).count();

                std::cout << "[INFO] Completed task=" << task.name()
                          << " observed_duration_ms=" << observed_duration_ms
                          << " run_count=" << task.runCount()
                          << " deadline_miss_count=" << task.deadlineMissCount()
                          << std::endl;

                ran_task_this_cycle = true;
            }
        }

        if (!ran_task_this_cycle) {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }
}

void Scheduler::printSummary() const {
    std::cout << "[INFO] Runtime summary" << std::endl;

    for (const auto& task : tasks_) {
        std::cout << "[INFO] - " << task.name()
                  << " run_count=" << task.runCount()
                  << " deadline_miss_count=" << task.deadlineMissCount()
                  << std::endl;
    }
}
