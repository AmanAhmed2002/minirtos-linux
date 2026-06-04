CREATE TABLE runs (
    id BIGSERIAL PRIMARY KEY,
    run_id VARCHAR(160) NOT NULL UNIQUE,
    scenario_id VARCHAR(120) NOT NULL,
    scenario_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL,
    runtime_health VARCHAR(64),
    log_path TEXT NOT NULL,
    analysis_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    events_loaded INTEGER,
    simulation_name VARCHAR(255),
    scheduler_mode VARCHAR(120),
    configured_duration_seconds INTEGER,
    observed_duration_ms INTEGER,
    message_sent INTEGER,
    message_received INTEGER,
    message_dropped INTEGER,
    message_queue_full_drops INTEGER,
    message_fault_injected_drops INTEGER,
    raw_report TEXT
);

CREATE INDEX idx_runs_run_id ON runs(run_id);
CREATE INDEX idx_runs_created_at ON runs(created_at);
CREATE INDEX idx_runs_scenario_id ON runs(scenario_id);
CREATE INDEX idx_runs_status ON runs(status);

CREATE TABLE run_event_counts (
    run_db_id BIGINT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    count_key VARCHAR(160) NOT NULL,
    count_value INTEGER NOT NULL,
    PRIMARY KEY (run_db_id, count_key)
);

CREATE TABLE run_severity_counts (
    run_db_id BIGINT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    count_key VARCHAR(160) NOT NULL,
    count_value INTEGER NOT NULL,
    PRIMARY KEY (run_db_id, count_key)
);

CREATE TABLE run_task_metrics (
    run_db_id BIGINT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    task_name VARCHAR(160) NOT NULL,
    runs INTEGER NOT NULL,
    deadline_misses INTEGER NOT NULL,
    deadline_missed_events INTEGER NOT NULL,
    avg_duration_ms DOUBLE PRECISION NOT NULL,
    max_duration_ms INTEGER NOT NULL,
    PRIMARY KEY (run_db_id, task_name)
);

CREATE TABLE run_root_causes (
    run_db_id BIGINT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    root_cause TEXT NOT NULL,
    PRIMARY KEY (run_db_id, position)
);
