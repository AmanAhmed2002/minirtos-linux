#pragma once

#include "Config.hpp"

#include <chrono>
#include <string>

class Task {
public:
    using Clock = std::chrono::steady_clock;
    using TimePoint = Clock::time_point;

    explicit Task(const TaskConfig& config, TimePoint start_time);

    bool shouldRun(TimePoint now) const;
    void run(TimePoint now);

    const std::string& name() const;
    int periodMs() const;
    int deadlineMs() const;
    int priority() const;
    int executionTimeMs() const;
    int queueLimit() const;
    int runCount() const;
    int deadlineMissCount() const;

private:
    std::string name_;
    int period_ms_;
    int deadline_ms_;
    int priority_;
    int execution_time_ms_;
    int queue_limit_;
    int run_count_;
    int deadline_miss_count_;
    TimePoint next_run_time_;
};
