export function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">MiniRTOS Playground</p>
        <h1>Embedded Runtime Learning Dashboard</h1>
        <p className="header-subtitle">
          Run C++ MiniRTOS simulations, inspect analyzer output, and learn how
          scheduler modes, queues, faults, watchdogs, and telemetry behave.
        </p>
      </div>
    </header>
  );
}
