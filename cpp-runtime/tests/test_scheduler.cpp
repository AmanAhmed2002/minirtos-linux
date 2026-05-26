#include "Config.hpp"
#include "Logger.hpp"
#include "Scheduler.hpp"
#include "Task.hpp"

#include <filesystem>
#include <fstream>
#include <gtest/gtest.h>
#include <string>
#include <vector>

namespace {
TaskConfig makeTaskConfig(
    const std::string& name,
    int priority,
    int deadline_ms = 100,
    int period_ms = 1000
) {
    TaskConfig config;
    config.name = name;
    config.period_ms = period_ms;
    config.deadline_ms = deadline_ms;
    config.priority = priority;
    config.execution_time_ms = 1;
    config.queue_limit = 5;
    return config;
}

std::vector<Task> makeTasks(
    const std::vector<TaskConfig>& configs
) {
    const Task::TimePoint start_time = Task::Clock::now();

    std::vector<Task> tasks;
    tasks.reserve(configs.size());

    for (const auto& config : configs) {
        tasks.emplace_back(config, start_time);
    }

    return tasks;
}

std::string readFile(const std::string& path) {
    std::ifstream input(path);

    if (!input.is_open()) {
        return "";
    }

    return std::string(
        std::istreambuf_iterator<char>(input),
        std::istreambuf_iterator<char>()
    );
}

std::vector<std::string> extractStartedTaskOrder(
    const std::string& log_contents
) {
    std::vector<std::string> task_order;

    std::size_t search_position = 0;

    while (true) {
        const std::size_t event_position =
            log_contents.find("\"event_type\":\"task_started\"", search_position);

        if (event_position == std::string::npos) {
            break;
        }

        const std::size_t task_key_position =
            log_contents.find("\"task\":\"", event_position);

        if (task_key_position == std::string::npos) {
            break;
        }

        const std::size_t task_name_start =
            task_key_position + std::string("\"task\":\"").size();

        const std::size_t task_name_end =
            log_contents.find("\"", task_name_start);

        if (task_name_end == std::string::npos) {
            break;
        }

        task_order.push_back(
            log_contents.substr(task_name_start, task_name_end - task_name_start)
        );

        search_position = task_name_end;
    }

    return task_order;
}
}

TEST(SchedulerTest, RoundRobinModeRunsDueTasksInConfigOrder) {
    const std::string log_path = "logs/test_scheduler_round_robin.jsonl";
    std::filesystem::remove(log_path);

    FaultConfig fault_config;
    WatchdogConfig watchdog_config;

    std::vector<TaskConfig> configs{
        makeTaskConfig("LowPriorityTask", 3),
        makeTaskConfig("HighPriorityTask", 1),
        makeTaskConfig("MediumPriorityTask", 2)
    };

    {
        Logger logger(log_path);

        Scheduler scheduler(
            "round_robin",
            1,
            makeTasks(configs),
            logger,
            fault_config,
            watchdog_config
        );

        scheduler.run();
    }

    const std::vector<std::string> task_order =
        extractStartedTaskOrder(readFile(log_path));

    ASSERT_GE(task_order.size(), 3U);
    EXPECT_EQ(task_order[0], "LowPriorityTask");
    EXPECT_EQ(task_order[1], "HighPriorityTask");
    EXPECT_EQ(task_order[2], "MediumPriorityTask");
}

TEST(SchedulerTest, PriorityModeRunsDueTasksByAscendingPriorityNumber) {
    const std::string log_path = "logs/test_scheduler_priority.jsonl";
    std::filesystem::remove(log_path);

    FaultConfig fault_config;
    WatchdogConfig watchdog_config;

    std::vector<TaskConfig> configs{
        makeTaskConfig("LowPriorityTask", 3),
        makeTaskConfig("HighPriorityTask", 1),
        makeTaskConfig("MediumPriorityTask", 2)
    };

    {
        Logger logger(log_path);

        Scheduler scheduler(
            "priority",
            1,
            makeTasks(configs),
            logger,
            fault_config,
            watchdog_config
        );

        scheduler.run();
    }

    const std::vector<std::string> task_order =
        extractStartedTaskOrder(readFile(log_path));

    ASSERT_GE(task_order.size(), 3U);
    EXPECT_EQ(task_order[0], "HighPriorityTask");
    EXPECT_EQ(task_order[1], "MediumPriorityTask");
    EXPECT_EQ(task_order[2], "LowPriorityTask");
}

TEST(SchedulerTest, EarliestDeadlineFirstModeRunsDueTasksByNearestDeadline) {
    const std::string log_path = "logs/test_scheduler_edf_deadline_order.jsonl";
    std::filesystem::remove(log_path);

    FaultConfig fault_config;
    WatchdogConfig watchdog_config;

    std::vector<TaskConfig> configs{
        makeTaskConfig("LongDeadlineTask", 2, 300),
        makeTaskConfig("ShortDeadlineTask", 2, 100),
        makeTaskConfig("MediumDeadlineTask", 2, 200)
    };

    {
        Logger logger(log_path);

        Scheduler scheduler(
            "earliest_deadline_first",
            1,
            makeTasks(configs),
            logger,
            fault_config,
            watchdog_config
        );

        scheduler.run();
    }

    const std::vector<std::string> task_order =
        extractStartedTaskOrder(readFile(log_path));

    ASSERT_GE(task_order.size(), 3U);
    EXPECT_EQ(task_order[0], "ShortDeadlineTask");
    EXPECT_EQ(task_order[1], "MediumDeadlineTask");
    EXPECT_EQ(task_order[2], "LongDeadlineTask");
}

TEST(SchedulerTest, EarliestDeadlineFirstModeUsesPriorityAsTieBreaker) {
    const std::string log_path = "logs/test_scheduler_edf_priority_tie.jsonl";
    std::filesystem::remove(log_path);

    FaultConfig fault_config;
    WatchdogConfig watchdog_config;

    std::vector<TaskConfig> configs{
        makeTaskConfig("LowPriorityTask", 3, 100),
        makeTaskConfig("HighPriorityTask", 1, 100),
        makeTaskConfig("MediumPriorityTask", 2, 100)
    };

    {
        Logger logger(log_path);

        Scheduler scheduler(
            "earliest_deadline_first",
            1,
            makeTasks(configs),
            logger,
            fault_config,
            watchdog_config
        );

        scheduler.run();
    }

    const std::vector<std::string> task_order =
        extractStartedTaskOrder(readFile(log_path));

    ASSERT_GE(task_order.size(), 3U);
    EXPECT_EQ(task_order[0], "HighPriorityTask");
    EXPECT_EQ(task_order[1], "MediumPriorityTask");
    EXPECT_EQ(task_order[2], "LowPriorityTask");
}

TEST(SchedulerTest, EarliestDeadlineFirstModePreservesConfigOrderWhenDeadlineAndPriorityTie) {
    const std::string log_path = "logs/test_scheduler_edf_stable_tie.jsonl";
    std::filesystem::remove(log_path);

    FaultConfig fault_config;
    WatchdogConfig watchdog_config;

    std::vector<TaskConfig> configs{
        makeTaskConfig("FirstTask", 1, 100),
        makeTaskConfig("SecondTask", 1, 100),
        makeTaskConfig("ThirdTask", 1, 100)
    };

    {
        Logger logger(log_path);

        Scheduler scheduler(
            "earliest_deadline_first",
            1,
            makeTasks(configs),
            logger,
            fault_config,
            watchdog_config
        );

        scheduler.run();
    }

    const std::vector<std::string> task_order =
        extractStartedTaskOrder(readFile(log_path));

    ASSERT_GE(task_order.size(), 3U);
    EXPECT_EQ(task_order[0], "FirstTask");
    EXPECT_EQ(task_order[1], "SecondTask");
    EXPECT_EQ(task_order[2], "ThirdTask");
}

TEST(SchedulerTest, TaskCrashFaultLogsFailureAndSkipsTask) {
    const std::string log_path = "logs/test_scheduler_task_crash.jsonl";
    std::filesystem::remove(log_path);

    FaultConfig fault_config;
    fault_config.enabled = true;
    fault_config.type = "task_crash";
    fault_config.target_task = "NetworkTask";
    fault_config.start_after_ms = 0;

    WatchdogConfig watchdog_config;

    std::vector<TaskConfig> configs{
        makeTaskConfig("ControlTask", 1, 80, 100),
        makeTaskConfig("NetworkTask", 2, 200, 100),
        makeTaskConfig("LoggerTask", 3, 400, 100)
    };

    {
        Logger logger(log_path);

        Scheduler scheduler(
            "round_robin",
            1,
            makeTasks(configs),
            logger,
            fault_config,
            watchdog_config
        );

        scheduler.run();
    }

    const std::string log_contents = readFile(log_path);

    EXPECT_NE(log_contents.find("\"event_type\":\"fault_injected\""), std::string::npos);
    EXPECT_NE(log_contents.find("\"fault_type\":\"task_crash\""), std::string::npos);
    EXPECT_NE(log_contents.find("\"event_type\":\"task_failed\""), std::string::npos);
    EXPECT_NE(log_contents.find("\"event_type\":\"task_skipped\""), std::string::npos);
    EXPECT_NE(log_contents.find("\"reason\":\"simulated_task_crash\""), std::string::npos);
    EXPECT_NE(log_contents.find("\"reason\":\"task_in_failed_state\""), std::string::npos);
}

TEST(SchedulerTest, InvalidSchedulerModeThrowsRuntimeError) {
    const std::string log_path = "logs/test_scheduler_invalid_mode.jsonl";
    std::filesystem::remove(log_path);

    FaultConfig fault_config;
    WatchdogConfig watchdog_config;

    std::vector<TaskConfig> configs{
        makeTaskConfig("ControlTask", 1)
    };

    Logger logger(log_path);

    Scheduler scheduler(
        "invalid_mode",
        1,
        makeTasks(configs),
        logger,
        fault_config,
        watchdog_config
    );

    EXPECT_THROW(
        scheduler.run(),
        std::runtime_error
    );
}
