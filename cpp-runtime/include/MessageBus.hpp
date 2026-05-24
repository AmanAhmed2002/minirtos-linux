#pragma once

#include "Message.hpp"

#include <deque>
#include <optional>
#include <string>
#include <unordered_map>

class MessageBus {
public:
    void registerTaskQueue(const std::string& task_name, int queue_limit);

    bool send(const Message& message);

    std::optional<Message> receive(const std::string& task_name);

    int queueDepth(const std::string& task_name) const;

    int queueLimit(const std::string& task_name) const;

private:
    struct QueueState {
        int queue_limit;
        std::deque<Message> messages;
    };

    std::unordered_map<std::string, QueueState> queues_;
};
