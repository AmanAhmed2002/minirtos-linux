#include "MessageBus.hpp"

#include <algorithm>
#include <stdexcept>

void MessageBus::registerTaskQueue(const std::string& task_name, int queue_limit) {
    if (task_name.empty()) {
        throw std::runtime_error("Cannot register a task queue with an empty task name");
    }

    if (queue_limit <= 0) {
        throw std::runtime_error("Queue limit must be greater than 0 for task: " + task_name);
    }

    queues_[task_name] = QueueState{
        queue_limit,
        {}
    };
}

bool MessageBus::send(const Message& message) {
    auto target_queue = queues_.find(message.target_task);

    if (target_queue == queues_.end()) {
        return false;
    }

    QueueState& queue_state = target_queue->second;

    if (static_cast<int>(queue_state.messages.size()) >= queue_state.queue_limit) {
        return false;
    }

    queue_state.messages.push_back(message);

    return true;
}

std::optional<Message> MessageBus::receive(const std::string& task_name) {
    auto task_queue = queues_.find(task_name);

    if (task_queue == queues_.end()) {
        return std::nullopt;
    }

    QueueState& queue_state = task_queue->second;

    if (queue_state.messages.empty()) {
        return std::nullopt;
    }

    Message next_message = queue_state.messages.front();
    queue_state.messages.pop_front();

    return next_message;
}

int MessageBus::queueDepth(const std::string& task_name) const {
    const auto task_queue = queues_.find(task_name);

    if (task_queue == queues_.end()) {
        return 0;
    }

    return static_cast<int>(task_queue->second.messages.size());
}

int MessageBus::queueLimit(const std::string& task_name) const {
    const auto task_queue = queues_.find(task_name);

    if (task_queue == queues_.end()) {
        return 0;
    }

    return task_queue->second.queue_limit;
}
