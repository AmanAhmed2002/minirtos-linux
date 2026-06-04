import type { MessageSummaryResponse } from "../types/api";

interface QueuePressureChartProps {
  messageSummary: MessageSummaryResponse | null;
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function QueuePressureChart({ messageSummary }: QueuePressureChartProps) {
  if (!messageSummary) {
    return (
      <section className="visual-card">
        <h3>Queue pressure</h3>
        <p className="empty-state">No message summary was parsed for this run.</p>
      </section>
    );
  }

  const totalObserved =
    messageSummary.received + messageSummary.dropped > 0
      ? messageSummary.received + messageSummary.dropped
      : messageSummary.sent;

  const receivedPercent = percent(messageSummary.received, totalObserved);
  const droppedPercent = percent(messageSummary.dropped, totalObserved);
  const queueFullPercent = percent(
    messageSummary.queueFullDrops,
    Math.max(messageSummary.dropped, 1)
  );
  const faultDropPercent = percent(
    messageSummary.faultInjectedDrops,
    Math.max(messageSummary.dropped, 1)
  );

  return (
    <section className="visual-card">
      <div className="visual-heading">
        <div>
          <h3>Queue pressure</h3>
          <p>
            Shows how many messages were received compared with how many were
            dropped.
          </p>
        </div>
      </div>

      <div className="bar-row">
        <div className="bar-label">
          <span>Received</span>
          <strong>{messageSummary.received}</strong>
        </div>
        <div className="bar-track">
          <div className="bar-fill received" style={{ width: `${receivedPercent}%` }} />
        </div>
      </div>

      <div className="bar-row">
        <div className="bar-label">
          <span>Dropped</span>
          <strong>{messageSummary.dropped}</strong>
        </div>
        <div className="bar-track">
          <div className="bar-fill dropped" style={{ width: `${droppedPercent}%` }} />
        </div>
      </div>

      <div className="drop-breakdown">
        <div>
          <span>Queue-full share of drops</span>
          <strong>{queueFullPercent}%</strong>
        </div>
        <div>
          <span>Fault-injected share of drops</span>
          <strong>{faultDropPercent}%</strong>
        </div>
      </div>

      <p className="visual-note">
        Queue-full drops point to capacity pressure. Fault-injected drops point
        to simulated communication unreliability.
      </p>
    </section>
  );
}
