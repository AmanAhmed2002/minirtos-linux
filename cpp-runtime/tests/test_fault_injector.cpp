#include "FaultInjector.hpp"

#include <gtest/gtest.h>

TEST(FaultInjectorTest, DisabledFaultInjectorDoesNotSlowTask) {
    FaultConfig config;
    config.enabled = false;
    config.type = "slow_task";
    config.target_task = "ControlTask";
    config.start_after_ms = 1000;
    config.extra_execution_time_ms = 120;

    FaultInjector injector(config);

    EXPECT_FALSE(injector.isEnabled());
    EXPECT_FALSE(injector.shouldSlowTask("ControlTask", 2000));
    EXPECT_EQ(injector.extraExecutionTimeMs("ControlTask", 2000), 0);
}

TEST(FaultInjectorTest, SlowTaskDoesNotActivateBeforeStartTime) {
    FaultConfig config;
    config.enabled = true;
    config.type = "slow_task";
    config.target_task = "ControlTask";
    config.start_after_ms = 5000;
    config.extra_execution_time_ms = 120;

    FaultInjector injector(config);

    EXPECT_TRUE(injector.isEnabled());
    EXPECT_FALSE(injector.shouldSlowTask("ControlTask", 4999));
    EXPECT_EQ(injector.extraExecutionTimeMs("ControlTask", 4999), 0);
}

TEST(FaultInjectorTest, SlowTaskActivatesForTargetAfterStartTime) {
    FaultConfig config;
    config.enabled = true;
    config.type = "slow_task";
    config.target_task = "ControlTask";
    config.start_after_ms = 5000;
    config.extra_execution_time_ms = 120;

    FaultInjector injector(config);

    EXPECT_TRUE(injector.shouldSlowTask("ControlTask", 5000));
    EXPECT_EQ(injector.extraExecutionTimeMs("ControlTask", 5000), 120);
}

TEST(FaultInjectorTest, SlowTaskDoesNotActivateForDifferentTask) {
    FaultConfig config;
    config.enabled = true;
    config.type = "slow_task";
    config.target_task = "ControlTask";
    config.start_after_ms = 5000;
    config.extra_execution_time_ms = 120;

    FaultInjector injector(config);

    EXPECT_FALSE(injector.shouldSlowTask("NetworkTask", 6000));
    EXPECT_EQ(injector.extraExecutionTimeMs("NetworkTask", 6000), 0);
}

TEST(FaultInjectorTest, DroppedMessagesDoesNotActivateBeforeStartTime) {
    FaultConfig config;
    config.enabled = true;
    config.type = "dropped_messages";
    config.target_task = "LoggerTask";
    config.start_after_ms = 5000;
    config.drop_probability_percent = 100;

    FaultInjector injector(config);

    Message message{
        "ControlTask",
        "LoggerTask",
        "control_status",
        "payload",
        1
    };

    EXPECT_FALSE(injector.shouldDropMessage(message, 4999));
}

TEST(FaultInjectorTest, DroppedMessagesDropsTargetMessageAtOneHundredPercent) {
    FaultConfig config;
    config.enabled = true;
    config.type = "dropped_messages";
    config.target_task = "LoggerTask";
    config.start_after_ms = 5000;
    config.drop_probability_percent = 100;

    FaultInjector injector(config);

    Message message{
        "ControlTask",
        "LoggerTask",
        "control_status",
        "payload",
        1
    };

    EXPECT_TRUE(injector.shouldDropMessage(message, 5000));
}

TEST(FaultInjectorTest, DroppedMessagesDropsSourceMessageAtOneHundredPercent) {
    FaultConfig config;
    config.enabled = true;
    config.type = "dropped_messages";
    config.target_task = "ControlTask";
    config.start_after_ms = 5000;
    config.drop_probability_percent = 100;

    FaultInjector injector(config);

    Message message{
        "ControlTask",
        "LoggerTask",
        "control_status",
        "payload",
        1
    };

    EXPECT_TRUE(injector.shouldDropMessage(message, 5000));
}

TEST(FaultInjectorTest, DroppedMessagesDoesNotDropDifferentSourceOrTarget) {
    FaultConfig config;
    config.enabled = true;
    config.type = "dropped_messages";
    config.target_task = "HealthMonitorTask";
    config.start_after_ms = 5000;
    config.drop_probability_percent = 100;

    FaultInjector injector(config);

    Message message{
        "ControlTask",
        "LoggerTask",
        "control_status",
        "payload",
        1
    };

    EXPECT_FALSE(injector.shouldDropMessage(message, 5000));
}

TEST(FaultInjectorTest, DroppedMessagesDoesNotDropAtZeroPercent) {
    FaultConfig config;
    config.enabled = true;
    config.type = "dropped_messages";
    config.target_task = "LoggerTask";
    config.start_after_ms = 5000;
    config.drop_probability_percent = 0;

    FaultInjector injector(config);

    Message message{
        "ControlTask",
        "LoggerTask",
        "control_status",
        "payload",
        1
    };

    EXPECT_FALSE(injector.shouldDropMessage(message, 5000));
}
