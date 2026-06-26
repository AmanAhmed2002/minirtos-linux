import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMiniRtosData } from "../context/miniRtosData";
import { ScenarioConceptCard } from "../components/ScenarioConceptCard";
import { RunResultCard } from "../components/RunResultCard";

export function SimulatorPage() {
  const navigate = useNavigate();
  const { scenarios, runScenario, isRunning, latestRun, error } =
    useMiniRtosData();
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  async function handleRun(scenarioId: string) {
    setActiveScenarioId(scenarioId);
    const run = await runScenario(scenarioId);
    if (run) {
      navigate("/analysis");
    }
  }

  return (
    <div className="simulator-page">
      <section className="page-header">
        <p className="eyebrow">Simulator</p>
        <h1>RTOS Simulator</h1>
        <p className="page-header__subtitle">
          Run a scenario to see how scheduling, timing, queues, and failures
          affect system behavior.
        </p>
      </section>

      <aside className="beginner-notice">
        <div>
          <strong>New here?</strong> Start with the Learn section first. Each
          lesson explains what the scenario means before you run it.
        </div>
        <Link className="ghost-button compact" to="/learn">
          Go to Learn
        </Link>
      </aside>

      {error && (
        <section className="error-banner">
          <strong>Simulator error:</strong> {error}
        </section>
      )}

      {scenarios.length === 0 ? (
        <p className="empty-state">Loading scenarios…</p>
      ) : (
        <div className="scenario-grid">
          {scenarios.map((scenario) => (
            <ScenarioConceptCard
              key={scenario.id}
              scenario={scenario}
              onRun={handleRun}
              isRunning={isRunning}
              isActive={activeScenarioId === scenario.id}
            />
          ))}
        </div>
      )}

      {latestRun && (
        <section className="simulator-page__latest">
          <RunResultCard run={latestRun} />
          <Link className="primary-button compact" to="/analysis">
            View full analysis →
          </Link>
        </section>
      )}
    </div>
  );
}
