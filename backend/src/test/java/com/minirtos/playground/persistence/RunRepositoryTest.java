package com.minirtos.playground.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import com.minirtos.playground.model.RunStatus;

@DataJpaTest
@ActiveProfiles("test")
class RunRepositoryTest {

    @Autowired
    private RunRepository runRepository;

    @Test
    void savesAndFindsRunByRunId() {
        RunEntity entity = new RunEntity(
            "test-run-001",
            "queue_overflow",
            "Queue Overflow",
            "runs/test-run-001/runtime_logs.jsonl",
            "runs/test-run-001/analysis.txt",
            Instant.now()
        );

        RunEntity saved = runRepository.save(entity);

        Optional<RunEntity> found = runRepository.findByRunId("test-run-001");

        assertThat(saved.getRunId()).isEqualTo("test-run-001");
        assertThat(found).isPresent();
        assertThat(found.get().toSummaryResponse().status()).isEqualTo(RunStatus.RUNNING);
    }

    @Test
    void returnsRunsNewestFirst() {
        RunEntity older = new RunEntity(
            "test-run-old",
            "normal",
            "Normal",
            "runs/test-run-old/runtime_logs.jsonl",
            "runs/test-run-old/analysis.txt",
            Instant.parse("2026-06-03T10:00:00Z")
        );

        RunEntity newer = new RunEntity(
            "test-run-new",
            "task_crash",
            "Task Crash",
            "runs/test-run-new/runtime_logs.jsonl",
            "runs/test-run-new/analysis.txt",
            Instant.parse("2026-06-03T11:00:00Z")
        );

        runRepository.save(older);
        runRepository.save(newer);

        assertThat(runRepository.findAllByOrderByCreatedAtDesc())
            .extracting(RunEntity::getRunId)
            .containsExactly("test-run-new", "test-run-old");
    }
}
