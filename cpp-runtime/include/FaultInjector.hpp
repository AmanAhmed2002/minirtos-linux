#pragma once

#include "Config.hpp"
#include "Message.hpp"

#include <random>
#include <string>

class FaultInjector {
public:
    explicit FaultInjector(const FaultConfig& config);

    bool isEnabled() const;

    bool shouldSlowTask(
        const std::string& task_name,
        long timestamp_ms
    ) const;

    int extraExecutionTimeMs(
        const std::string& task_name,
        long timestamp_ms
    ) const;

    bool shouldDropMessage(
        const Message& message,
        long timestamp_ms
    );

    const FaultConfig& config() const;

private:
    bool hasStarted(long timestamp_ms) const;

    FaultConfig config_;
    std::mt19937 rng_;
};
