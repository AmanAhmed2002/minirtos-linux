package com.minirtos.playground.controller;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.minirtos.playground.service.ScenarioService;

@WebMvcTest(ScenarioController.class)
@Import(ScenarioService.class)
class ScenarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void scenariosReturnExpectedMetadata() throws Exception {
        mockMvc.perform(get("/api/scenarios"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(9)))
            .andExpect(jsonPath("$[0].id", equalTo("normal")))
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
