import type { ScenarioResponse } from "../types/api";

interface ScenarioSelectorProps {
  scenarios: ScenarioResponse[];
  selectedScenarioId: string;
  isRunning: boolean;
  onSelectScenario: (scenarioId: string) => void;
  onRunScenario: () => void;
}

export function ScenarioSelector({
  scenarios,
  selectedScenarioId,
  isRunning,
  onSelectScenario,
  onRunScenario,
}: ScenarioSelectorProps) {
  const selectedScenario = scenarios.find(
    (scenario) => scenario.id === selectedScenarioId
  );

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Scenario Lab</p>
          <h2>Choose a simulation</h2>
        </div>
      </div>

      <label className="field-label" htmlFor="scenario-select">
        Scenario
      </label>

      <select
        id="scenario-select"
        value={selectedScenarioId}
        onChange={(event) => onSelectScenario(event.target.value)}
        disabled={isRunning}
      >
        {scenarios.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.name}
          </option>
        ))}
      </select>

      {selectedScenario && (
        <div className="scenario-details">
          <div className="meta-grid">
            <div>
              <span>Scheduler</span>
              <strong>{selectedScenario.schedulerMode}</strong>
            </div>
            <div>
              <span>Difficulty</span>
              <strong>{selectedScenario.difficulty}</strong>
            </div>
            <div>
              <span>Concept</span>
              <strong>{selectedScenario.concept}</strong>
            </div>
          </div>

          <p>{selectedScenario.description}</p>

          <div className="learning-grid">
            <div>
              <h3>Teaches</h3>
              <ul>
                {selectedScenario.teaches.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3>Expected Signals</h3>
              <ul>
                {selectedScenario.expectedSignals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <button
        className="primary-button"
        type="button"
        onClick={onRunScenario}
        disabled={!selectedScenarioId || isRunning}
      >
        {isRunning ? "Running simulation..." : "Run selected scenario"}
      </button>
    </section>
  );
}
