cmake_minimum_required(VERSION 3.20)

project(minirtos_runtime LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)

find_package(nlohmann_json CONFIG QUIET)

if(NOT nlohmann_json_FOUND)
    FetchContent_Declare(
        nlohmann_json
        URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
        DOWNLOAD_EXTRACT_TIMESTAMP TRUE
    )
    FetchContent_MakeAvailable(nlohmann_json)
endif()

add_executable(minirtos_runtime
    src/main.cpp
    src/Config.cpp
    src/Task.cpp
    src/Scheduler.cpp
    src/Logger.cpp
    src/MessageBus.cpp
    src/FaultInjector.cpp
    src/Watchdog.cpp
)

target_include_directories(minirtos_runtime
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(minirtos_runtime
    PRIVATE
        nlohmann_json::nlohmann_json
)

enable_testing()

FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
    DOWNLOAD_EXTRACT_TIMESTAMP TRUE
)

set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(googletest)

add_executable(minirtos_cpp_tests
    tests/test_message_bus.cpp
    tests/test_fault_injector.cpp
    tests/test_watchdog.cpp
    src/MessageBus.cpp
    src/FaultInjector.cpp
    src/Watchdog.cpp
    src/Task.cpp
)

target_include_directories(minirtos_cpp_tests
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(minirtos_cpp_tests
    PRIVATE
        GTest::gtest_main
)

include(GoogleTest)

gtest_discover_tests(minirtos_cpp_tests)
