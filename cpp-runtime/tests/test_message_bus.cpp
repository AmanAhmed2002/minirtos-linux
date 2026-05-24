#include "MessageBus.hpp"

#include <gtest/gtest.h>

TEST(MessageBusTest, SendsAndReceivesMessageInFifoOrder) {
    MessageBus bus;

    bus.registerTaskQueue("LoggerTask", 2);

    Message first{
        "ControlTask",
        "LoggerTask",
        "control_status",
        "first",
        1
    };

    Message second{
        "NetworkTask",
        "LoggerTask",
        "network_packet",
        "second",
        2
    };

    EXPECT_TRUE(bus.send(first));
    EXPECT_TRUE(bus.send(second));
    EXPECT_EQ(bus.queueDepth("LoggerTask"), 2);
    EXPECT_EQ(bus.queueLimit("LoggerTask"), 2);

    const auto received_first = bus.receive("LoggerTask");

    ASSERT_TRUE(received_first.has_value());
    EXPECT_EQ(received_first->source_task, "ControlTask");
    EXPECT_EQ(received_first->target_task, "LoggerTask");
    EXPECT_EQ(received_first->type, "control_status");
    EXPECT_EQ(received_first->payload, "first");
    EXPECT_EQ(received_first->sequence_id, 1);

    const auto received_second = bus.receive("LoggerTask");

    ASSERT_TRUE(received_second.has_value());
    EXPECT_EQ(received_second->source_task, "NetworkTask");
    EXPECT_EQ(received_second->target_task, "LoggerTask");
    EXPECT_EQ(received_second->type, "network_packet");
    EXPECT_EQ(received_second->payload, "second");
    EXPECT_EQ(received_second->sequence_id, 2);

    EXPECT_EQ(bus.queueDepth("LoggerTask"), 0);
}

TEST(MessageBusTest, RejectsMessageWhenQueueIsFull) {
    MessageBus bus;

    bus.registerTaskQueue("LoggerTask", 1);

    Message first{
        "ControlTask",
        "LoggerTask",
        "control_status",
        "first",
        1
    };

    Message second{
        "NetworkTask",
        "LoggerTask",
        "network_packet",
        "second",
        2
    };

    EXPECT_TRUE(bus.send(first));
    EXPECT_FALSE(bus.send(second));
    EXPECT_EQ(bus.queueDepth("LoggerTask"), 1);

    const auto received = bus.receive("LoggerTask");

    ASSERT_TRUE(received.has_value());
    EXPECT_EQ(received->sequence_id, 1);

    EXPECT_FALSE(bus.receive("LoggerTask").has_value());
}

TEST(MessageBusTest, ReturnsEmptyOptionalWhenQueueIsEmpty) {
    MessageBus bus;

    bus.registerTaskQueue("LoggerTask", 3);

    const auto received = bus.receive("LoggerTask");

    EXPECT_FALSE(received.has_value());
}

TEST(MessageBusTest, RejectsMessageForUnknownTargetQueue) {
    MessageBus bus;

    Message message{
        "ControlTask",
        "MissingTask",
        "control_status",
        "payload",
        1
    };

    EXPECT_FALSE(bus.send(message));
}

TEST(MessageBusTest, RejectsInvalidQueueLimit) {
    MessageBus bus;

    EXPECT_THROW(
        bus.registerTaskQueue("LoggerTask", 0),
        std::runtime_error
    );
}

TEST(MessageBusTest, RejectsEmptyTaskName) {
    MessageBus bus;

    EXPECT_THROW(
        bus.registerTaskQueue("", 5),
        std::runtime_error
    );
}
