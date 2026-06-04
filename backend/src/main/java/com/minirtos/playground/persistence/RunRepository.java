package com.minirtos.playground.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RunRepository extends JpaRepository<RunEntity, Long> {

    Optional<RunEntity> findByRunId(String runId);

    List<RunEntity> findAllByOrderByCreatedAtDesc();

    boolean existsByRunId(String runId);
}
