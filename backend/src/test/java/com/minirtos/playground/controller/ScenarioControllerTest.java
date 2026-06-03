package com.minirtos.playground.controller;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.minirtos.playground.MiniRtosPlaygroundApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(classes = MiniRtosPlaygroundApplication.class)
@AutoConfigureMockMvc
class ScenarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void scenariosReturnExpectedMetadata() throws Exception {
        mockMvc.perform(get("/api/scenarios"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(9)))
            .andExpect(jsonPath("$[*].id", hasItem("normal")))
            .andExpect(jsonPath("$[*].id", hasItem("priority_scheduler")))
            .andExpect(jsonPath("$[*].id", hasItem("deadline_scheduler")))
            .andExpect(jsonPath("$[*].id", hasItem("queue_overflow")))
            .andExpect(jsonPath("$[*].id", hasItem("cpu_spike")))
            .andExpect(jsonPath("$[*].id", hasItem("task_crash")))
            .andExpect(jsonPath("$[*].id", hasItem("slow_task")))
            .andExpect(jsonPath("$[*].id", hasItem("dropped_messages")))
            .andExpect(jsonPath("$[*].id", hasItem("watchdog_slow_task")));
    }
}
