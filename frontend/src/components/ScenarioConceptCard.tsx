import { Link } from "react-router-dom";
import clsx from "clsx";
import type { ScenarioResponse } from "../types/api";
import { getLessonForScenario } from "../data/lessonCatalog";
import { TooltipTerm } from "./TooltipTerm";

interface ScenarioConceptCardProps {
  scenario: ScenarioResponse;
  onRun: (scenarioId: string) => void;
  isRunning: boolean;
  /** True when this is the scenario currently being run. */
  isActive?: boolean;
}

export function ScenarioConceptCard({
  scenario,
  onRun,
  isRunning,
  isActive = false,
}: ScenarioConceptCardProps) {
  const lesson = getLessonForScenario(scenario.id);

  return (
    <article className={clsx("scenario-card", { "scenario-card--active": isActive })}>
      <div className="scenario-card__top">
        <h3 className="scenario-card__title">{scenario.name}</h3>
        <span className="difficulty-badge">{scenario.difficulty}</span>
      </div>

      <p className="scenario-card__concept">
        Concept: <strong>{scenario.concept}</strong>
      </p>

      <p className="scenario-card__description">{scenario.description}</p>

      {lesson && (
        <p className="scenario-card__best-lesson">
          <span>Best lesson to read first</span>
          <Link to={`/learn/${lesson.id}`}>
            Module {lesson.moduleNumber} — {lesson.title}
          </Link>
        </p>
      )}

      <div className="scenario-card__signals">
        {scenario.expectedSignals.slice(0, 4).map((signal) => (
          <TooltipTerm term={signal} key={signal}>
            <span className="signal-chip">{signal}</span>
          </TooltipTerm>
        ))}
      </div>

      <div className="scenario-card__actions">
        <button
          type="button"
          className="primary-button compact"
          disabled={isRunning}
          onClick={() => onRun(scenario.id)}
        >
          {isActive && isRunning ? "Running…" : "Run scenario"}
        </button>

        {lesson && (
          <Link className="text-link" to={`/learn/${lesson.id}`}>
            Learn this concept →
          </Link>
        )}
      </div>
    </article>
  );
}
