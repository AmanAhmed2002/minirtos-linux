#pragma once

#include <string>

struct Message {
    std::string source_task;
    std::string target_task;
    std::string type;
    std::string payload;
    int sequence_id;
};
