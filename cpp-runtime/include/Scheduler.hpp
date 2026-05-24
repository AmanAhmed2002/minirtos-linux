#pragma once

#include "Logger.hpp"
#include "MessageBus.hpp"
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
    void initializeMessageQueues();
    void runRoundRobin();
    void handleTaskMessaging(const Task& task);
    void sendMessageToLoggerTask(
        const std::string& source_task,
        const std::string& message_type,
        const std::string& payload
    );
    void receiveMessageForTask(const std::string& task_name);
    void printSummary() const;

    std::string mode_;
    int duration_seconds_;
    std::vector<Task> tasks_;
    Logger& logger_;
    MessageBus message_bus_;
    int next_message_sequence_id_;
};
