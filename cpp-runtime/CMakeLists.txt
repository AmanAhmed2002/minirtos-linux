cmake_minimum_required(VERSION 3.20)

project(minirtos_runtime VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(nlohmann_json 3.2.0 REQUIRED)

add_executable(minirtos_runtime
    src/main.cpp
    src/Config.cpp
    src/Task.cpp
    src/Scheduler.cpp
    src/Logger.cpp
)

target_include_directories(minirtos_runtime PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(minirtos_runtime PRIVATE
    nlohmann_json::nlohmann_json
)
