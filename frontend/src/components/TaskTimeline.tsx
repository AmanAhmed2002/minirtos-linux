import type { TaskMetricResponse } from "../types/api";

interface TaskTimelineProps {
  taskMetrics: Record<string, TaskMetricResponse>;
}

function getMaxDuration(taskMetrics: Record<string, TaskMetricResponse>) {
  const durations = Object.values(taskMetrics).map((metric) => metric.maxDurationMs);
  return Math.max(...durations, 1);
}

export function TaskTimeline({ taskMetrics }: TaskTimelineProps) {
  const taskEntries = Object.entries(taskMetrics ?? {});
  const maxDuration = getMaxDuration(taskMetrics ?? {});

  if (taskEntries.length === 0) {
    return (
      <section className="visual-card">
        <h3>Task timeline</h3>
        <p className="empty-state">No task metrics were parsed for this run.</p>
      </section>
    );
  }

  return (
    <section className="visual-card">
      <div className="visual-heading">
        <div>
          <h3>Task runtime timeline</h3>
          <p>
            Compares task duration and deadline pressure using parsed analyzer
            metrics.
          </p>
        </div>
      </div>

      <div className="timeline-list">
        {taskEntries.map(([taskName, metric]) => {
          const width = Math.max(
            Math.round((metric.maxDurationMs / maxDuration) * 100),
            4
          );

          return (
            <div className="timeline-row" key={taskName}>
              <div className="timeline-label">
                <strong>{taskName}</strong>
                <span>
                  {metric.runs} runs · {metric.deadlineMisses} misses
                </span>
              </div>

              <div className="timeline-track">
                <div
                  className={
                    metric.deadlineMisses > 0
                      ? "timeline-fill deadline-risk"
                      : "timeline-fill stable"
                  }
                  style={{ width: `${width}%` }}
                />
              </div>

              <div className="timeline-duration">
                <strong>{metric.maxDurationMs} ms</strong>
                <span>max</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="visual-note">
        Longer bars show higher maximum task duration. Highlighted bars indicate
        tasks with deadline misses.
      </p>
    </section>
  );
}
