#include "Watchdog.hpp"

#include <chrono>
#include <gtest/gtest.h>

namespace {
Task makeDeadlineMissingTask() {
    TaskConfig config;
    config.name = "ControlTask";
    config.period_ms = 1;
    config.deadline_ms = 1;
    config.priority = 1;
    config.execution_time_ms = 10;
    config.queue_limit = 10;

    return Task(config, Task::Clock::now());
}
}

TEST(WatchdogTest, DisabledWatchdogReturnsNoAlert) {
    WatchdogConfig config;
    config.enabled = false;
    config.max_consecutive_deadline_misses = 1;

    Watchdog watchdog(config);
    Task task = makeDeadlineMissingTask();

    const auto start = Task::Clock::now();

    task.run(start);
    const auto alert = watchdog.inspectTask(task, 100);

    EXPECT_FALSE(watchdog.isEnabled());
    EXPECT_FALSE(alert.has_value());
}

TEST(WatchdogTest, ConsecutiveDeadlineMissesTriggerAlertAtThreshold) {
    WatchdogConfig config;
    config.enabled = true;
    config.max_consecutive_deadline_misses = 2;
    config.recovery_enabled = true;
    config.recovery_cooldown_ms = 1000;

    Watchdog watchdog(config);
    Task task = makeDeadlineMissingTask();

    const auto start = Task::Clock::now();

    EXPECT_FALSE(watchdog.inspectTask(task, 0).has_value());

    task.run(start);
    EXPECT_FALSE(watchdog.inspectTask(task, 100).has_value());

    task.run(start + std::chrono::milliseconds(1));
    const auto alert = watchdog.inspectTask(task, 200);

    ASSERT_TRUE(alert.has_value());
    EXPECT_EQ(alert->task_name, "ControlTask");
    EXPECT_EQ(alert->deadline_miss_count, 2);
    EXPECT_EQ(alert->consecutive_miss_count, 2);
    EXPECT_EQ(alert->reason, "consecutive_deadline_misses");
    EXPECT_TRUE(alert->recovery_performed);
}

TEST(WatchdogTest, RecoveryDisabledStillReportsAlertWithoutRecovery) {
    WatchdogConfig config;
    config.enabled = true;
    config.max_consecutive_deadline_misses = 1;
    config.recovery_enabled = false;
    config.recovery_cooldown_ms = 1000;

    Watchdog watchdog(config);
    Task task = makeDeadlineMissingTask();

    const auto start = Task::Clock::now();

    EXPECT_FALSE(watchdog.inspectTask(task, 0).has_value());

    task.run(start);
    const auto alert = watchdog.inspectTask(task, 100);

    ASSERT_TRUE(alert.has_value());
    EXPECT_EQ(alert->task_name, "ControlTask");
    EXPECT_FALSE(alert->recovery_performed);
}

TEST(WatchdogTest, RecoveryCooldownPreventsImmediateRepeatedAlert) {
    WatchdogConfig config;
    config.enabled = true;
    config.max_consecutive_deadline_misses = 1;
    config.recovery_enabled = true;
    config.recovery_cooldown_ms = 1000;

    Watchdog watchdog(config);
    Task task = makeDeadlineMissingTask();

    const auto start = Task::Clock::now();

    EXPECT_FALSE(watchdog.inspectTask(task, 0).has_value());

    task.run(start);
    const auto first_alert = watchdog.inspectTask(task, 100);

    ASSERT_TRUE(first_alert.has_value());
    EXPECT_TRUE(first_alert->recovery_performed);

    task.run(start + std::chrono::milliseconds(1));
    const auto suppressed_alert = watchdog.inspectTask(task, 200);

    EXPECT_FALSE(suppressed_alert.has_value());

    task.run(start + std::chrono::milliseconds(2));
    const auto later_alert = watchdog.inspectTask(task, 1200);

    ASSERT_TRUE(later_alert.has_value());
    EXPECT_TRUE(later_alert->recovery_performed);
}
