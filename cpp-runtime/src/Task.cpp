#include "Task.hpp"

#include <chrono>
#include <thread>

Task::Task(const TaskConfig& config, TimePoint start_time)
    : name_(config.name),
      period_ms_(config.period_ms),
      deadline_ms_(config.deadline_ms),
      priority_(config.priority),
      execution_time_ms_(config.execution_time_ms),
      queue_limit_(config.queue_limit),
      run_count_(0),
      deadline_miss_count_(0),
      next_run_time_(start_time) {
}

bool Task::shouldRun(TimePoint now) const {
    return now >= next_run_time_;
}

Task::TimePoint Task::absoluteDeadline() const {
    return next_run_time_ + std::chrono::milliseconds(deadline_ms_);
}

void Task::run(TimePoint now, int extra_execution_time_ms) {
    const auto lateness_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now - next_run_time_
    ).count();

    const int total_execution_time_ms = execution_time_ms_ + extra_execution_time_ms;

    const bool missed_deadline =
        lateness_ms > deadline_ms_ ||
        total_execution_time_ms > deadline_ms_;

    std::this_thread::sleep_for(std::chrono::milliseconds(total_execution_time_ms));

    ++run_count_;

    if (missed_deadline) {
        ++deadline_miss_count_;
    }

    next_run_time_ = now + std::chrono::milliseconds(period_ms_);
}

const std::string& Task::name() const {
    return name_;
}

int Task::periodMs() const {
    return period_ms_;
}

int Task::deadlineMs() const {
    return deadline_ms_;
}

int Task::priority() const {
    return priority_;
}

int Task::executionTimeMs() const {
    return execution_time_ms_;
}

int Task::queueLimit() const {
    return queue_limit_;
}

int Task::runCount() const {
    return run_count_;
}

int Task::deadlineMissCount() const {
    return deadline_miss_count_;
}
