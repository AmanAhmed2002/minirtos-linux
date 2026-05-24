#include "Scheduler.hpp"

#include "Message.hpp"

#include <chrono>
#include <iostream>
#include <stdexcept>
#include <thread>
#include <utility>

Scheduler::Scheduler(
    std::string mode,
    int duration_seconds,
    std::vector<Task> tasks,
    Logger& logger,
    const FaultConfig& fault_config
)
    : mode_(std::move(mode)),
      duration_seconds_(duration_seconds),
      tasks_(std::move(tasks)),
      logger_(logger),
      message_bus_(),
      fault_injector_(fault_config),
      scheduler_start_time_(Task::Clock::now()),
      next_message_sequence_id_(1) {
}

void Scheduler::run() {
    if (duration_seconds_ <= 0) {
        throw std::runtime_error("duration_seconds must be greater than 0");
    }

    if (tasks_.empty()) {
        throw std::runtime_error("scheduler cannot run with zero tasks");
    }

    initializeMessageQueues();

    std::cout << "[INFO] Scheduler starting mode=" << mode_
              << " duration_seconds=" << duration_seconds_
              << std::endl;

    logger_.logSchedulerStarted(mode_, duration_seconds_);

    if (mode_ == "round_robin") {
        runRoundRobin();
    } else {
        throw std::runtime_error("Unsupported scheduler mode: " + mode_);
    }

    std::cout << "[INFO] Scheduler finished" << std::endl;

    logger_.logSchedulerFinished();

    printSummary();
}

void Scheduler::initializeMessageQueues() {
    for (const auto& task : tasks_) {
        message_bus_.registerTaskQueue(task.name(), task.queueLimit());
    }
}

void Scheduler::runRoundRobin() {
    scheduler_start_time_ = Task::Clock::now();
    const Task::TimePoint end_time =
        scheduler_start_time_ + std::chrono::seconds(duration_seconds_);

    while (Task::Clock::now() < end_time) {
        bool ran_task_this_cycle = false;

        for (auto& task : tasks_) {
            const Task::TimePoint now = Task::Clock::now();

            if (now >= end_time) {
                break;
            }

            if (task.shouldRun(now)) {
                const long timestamp_ms = elapsedMs(scheduler_start_time_);

                const int extra_execution_time_ms =
                    fault_injector_.extraExecutionTimeMs(
                        task.name(),
                        timestamp_ms
                    );

                if (extra_execution_time_ms > 0) {
                    std::cout << "[WARN] Fault injected type=slow_task"
                              << " target_task=" << task.name()
                              << " extra_execution_time_ms=" << extra_execution_time_ms
                              << std::endl;

                    logger_.logFaultInjectedSlowTask(
                        task.name(),
                        extra_execution_time_ms
                    );
                }

                std::cout << "[INFO] Running task=" << task.name() << std::endl;

                logger_.logTaskStarted(
                    task.name(),
                    task.periodMs(),
                    task.deadlineMs(),
                    task.priority()
                );

                const Task::TimePoint before_run = Task::Clock::now();

                task.run(now, extra_execution_time_ms);

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

                logger_.logTaskCompleted(
                    task.name(),
                    observed_duration_ms,
                    task.executionTimeMs(),
                    task.deadlineMs(),
                    task.runCount(),
                    task.deadlineMissCount()
                );

                handleTaskMessaging(task);

                ran_task_this_cycle = true;
            }
        }

        if (!ran_task_this_cycle) {
            std::this_thread::sleep_for(std::chrono::milliseconds(1));
        }
    }
}

void Scheduler::handleTaskMessaging(const Task& task) {
    if (task.name() == "ControlTask") {
        sendMessageToLoggerTask(
            task.name(),
            "control_status",
            "control task completed one execution cycle"
        );
    } else if (task.name() == "NetworkTask") {
        sendMessageToLoggerTask(
            task.name(),
            "network_packet",
            "network task processed one packet"
        );
    } else if (task.name() == "LoggerTask") {
        receiveMessageForTask(task.name());
    }
}

void Scheduler::sendMessageToLoggerTask(
    const std::string& source_task,
    const std::string& message_type,
    const std::string& payload
) {
    const Message message{
        source_task,
        "LoggerTask",
        message_type,
        payload,
        next_message_sequence_id_
    };

    ++next_message_sequence_id_;

    const long timestamp_ms = elapsedMs(scheduler_start_time_);
    const int target_queue_depth_before_send =
        message_bus_.queueDepth(message.target_task);
    const int target_queue_limit =
        message_bus_.queueLimit(message.target_task);

    if (fault_injector_.shouldDropMessage(message, timestamp_ms)) {
        std::cout << "[WARN] Fault injected type=dropped_messages"
                  << " source_task=" << message.source_task
                  << " target_task=" << message.target_task
                  << " message_type=" << message.type
                  << " sequence_id=" << message.sequence_id
                  << " reason=fault_injected_drop"
                  << std::endl;

        logger_.logFaultInjectedDroppedMessage(
            message.source_task,
            message.target_task,
            message.type,
            message.sequence_id,
            "fault_injected_drop"
        );

        logger_.logMessageDropped(
            message.source_task,
            message.target_task,
            message.type,
            message.sequence_id,
            target_queue_depth_before_send,
            target_queue_limit,
            "fault_injected_drop"
        );

        return;
    }

    const bool sent = message_bus_.send(message);
    const int target_queue_depth = message_bus_.queueDepth(message.target_task);

    if (sent) {
        std::cout << "[INFO] Message sent source_task=" << message.source_task
                  << " target_task=" << message.target_task
                  << " message_type=" << message.type
                  << " sequence_id=" << message.sequence_id
                  << " target_queue_depth=" << target_queue_depth
                  << " target_queue_limit=" << target_queue_limit
                  << std::endl;

        logger_.logMessageSent(
            message.source_task,
            message.target_task,
            message.type,
            message.sequence_id,
            target_queue_depth,
            target_queue_limit
        );
    } else {
        std::cout << "[WARN] Message dropped source_task=" << message.source_task
                  << " target_task=" << message.target_task
                  << " message_type=" << message.type
                  << " sequence_id=" << message.sequence_id
                  << " target_queue_depth=" << target_queue_depth
                  << " target_queue_limit=" << target_queue_limit
                  << " reason=queue_full"
                  << std::endl;

        logger_.logMessageDropped(
            message.source_task,
            message.target_task,
            message.type,
            message.sequence_id,
            target_queue_depth,
            target_queue_limit,
            "queue_full"
        );
    }
}

void Scheduler::receiveMessageForTask(const std::string& task_name) {
    const std::optional<Message> received_message =
        message_bus_.receive(task_name);

    if (!received_message.has_value()) {
        return;
    }

    const int remaining_queue_depth = message_bus_.queueDepth(task_name);

    std::cout << "[INFO] Message received source_task="
              << received_message->source_task
              << " target_task=" << received_message->target_task
              << " message_type=" << received_message->type
              << " sequence_id=" << received_message->sequence_id
              << " remaining_queue_depth=" << remaining_queue_depth
              << std::endl;

    logger_.logMessageReceived(
        received_message->source_task,
        received_message->target_task,
        received_message->type,
        received_message->sequence_id,
        remaining_queue_depth
    );
}

long Scheduler::elapsedMs(Task::TimePoint start_time) const {
    return std::chrono::duration_cast<std::chrono::milliseconds>(
        Task::Clock::now() - start_time
    ).count();
}

void Scheduler::printSummary() const {
    std::cout << "[INFO] Runtime summary" << std::endl;

    for (const auto& task : tasks_) {
        std::cout << "[INFO] - " << task.name()
                  << " run_count=" << task.runCount()
                  << " deadline_miss_count=" << task.deadlineMissCount()
                  << std::endl;

        logger_.logRuntimeSummary(
            task.name(),
            task.runCount(),
            task.deadlineMissCount()
        );
    }
}
