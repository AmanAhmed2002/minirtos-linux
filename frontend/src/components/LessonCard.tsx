import { Link } from "react-router-dom";
import clsx from "clsx";
import type { Lesson } from "../data/lessonCatalog";

interface LessonCardProps {
  lesson: Lesson;
  /** Optional "Run Scenario" handler; omit to hide the secondary CTA. */
  onRunScenario?: (scenarioId: string) => void;
  isRunning?: boolean;
}

export function LessonCard({
  lesson,
  onRunScenario,
  isRunning = false,
}: LessonCardProps) {
  return (
    <article className="lesson-card">
      <div className="lesson-card__top">
        <span className="lesson-card__module">
          Module {lesson.moduleNumber}
        </span>
        <span className={clsx("level-badge", `level-badge--${lesson.level}`)}>
          {lesson.level}
        </span>
      </div>

      <h3 className="lesson-card__title">{lesson.title}</h3>

      <p className="lesson-card__time">⏱ {lesson.estimatedMinutes} min</p>

      <p className="lesson-card__summary">{lesson.summary}</p>

      <div className="lesson-card__terms">
        <span className="lesson-card__terms-label">Key concepts</span>
        <div className="chip-list">
          {lesson.keyTerms.map((term) => (
            <span className="chip" key={term}>
              {term}
            </span>
          ))}
        </div>
      </div>

      <div className="lesson-card__actions">
        <Link className="primary-button compact" to={`/learn/${lesson.id}`}>
          Open Lesson
        </Link>

        {onRunScenario && (
          <button
            type="button"
            className="ghost-button compact"
            disabled={isRunning}
            onClick={() => onRunScenario(lesson.scenarioId)}
          >
            {isRunning ? "Running…" : "Run Scenario"}
          </button>
        )}
      </div>
    </article>
  );
}
